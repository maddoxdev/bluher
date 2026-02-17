using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using VoipServer.Data;
using VoipServer.Models;
using Microsoft.EntityFrameworkCore;

namespace VoipServer.Hubs;

public class SignalingMessage
{
    public string Type { get; set; } = string.Empty;
    public object? Data { get; set; }
}

[Authorize]
public class SignalingHub : Hub
{
    private readonly VoipDbContext _context;
    private static readonly Dictionary<int, string> _userConnections = new();

    public SignalingHub(VoipDbContext context)
    {
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            lock (_userConnections)
            {
                _userConnections[userId.Value] = Context.ConnectionId;
            }

            var user = await _context.Users.FindAsync(userId.Value);
            if (user != null)
            {
                user.IsOnline = true;
                user.LastSeen = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            // Notify others about online status
            await Clients.Others.SendAsync("UserStatusChanged", new { UserId = userId.Value, IsOnline = true });
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            lock (_userConnections)
            {
                _userConnections.Remove(userId.Value);
            }

            var user = await _context.Users.FindAsync(userId.Value);
            if (user != null)
            {
                user.IsOnline = false;
                user.LastSeen = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            // Notify others about offline status
            await Clients.Others.SendAsync("UserStatusChanged", new { UserId = userId.Value, IsOnline = false });
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task InitiateCall(int calleeId)
    {
        var callerId = GetUserId();
        if (!callerId.HasValue) return;

        var call = new Call
        {
            CallerId = callerId.Value,
            CalleeId = calleeId,
            State = CallState.Initiating,
            SessionId = Guid.NewGuid().ToString(),
            StartedAt = DateTime.UtcNow
        };

        _context.Calls.Add(call);
        await _context.SaveChangesAsync();

        // Send call initiation to callee
        if (_userConnections.TryGetValue(calleeId, out var calleeConnectionId))
        {
            await Clients.Client(calleeConnectionId).SendAsync("IncomingCall", new
            {
                CallId = call.Id,
                CallerId = callerId.Value,
                CallerUsername = Context.User?.Identity?.Name,
                SessionId = call.SessionId
            });

            call.State = CallState.Ringing;
            await _context.SaveChangesAsync();
        }
        else
        {
            // User offline, send push notification
            await SendPushNotification(calleeId, callerId.Value);
            call.State = CallState.Missed;
            await _context.SaveChangesAsync();
        }
    }

    public async Task SendOffer(int calleeId, string sdp)
    {
        if (_userConnections.TryGetValue(calleeId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveOffer", new { Sdp = sdp, CallerId = GetUserId() });
        }
    }

    public async Task SendAnswer(int callerId, string sdp, int callId)
    {
        if (_userConnections.TryGetValue(callerId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveAnswer", new { Sdp = sdp, CalleeId = GetUserId() });
            
            var call = await _context.Calls.FindAsync(callId);
            if (call != null)
            {
                call.State = CallState.Answered;
                call.AnsweredAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }

    public async Task SendIceCandidate(int targetUserId, object candidate)
    {
        if (_userConnections.TryGetValue(targetUserId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("ReceiveIceCandidate", new { Candidate = candidate, FromUserId = GetUserId() });
        }
    }

    public async Task DeclineCall(int callId, int callerId)
    {
        var call = await _context.Calls.FindAsync(callId);
        if (call != null)
        {
            call.State = CallState.Declined;
            call.EndedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        if (_userConnections.TryGetValue(callerId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("CallDeclined", new { CallId = callId });
        }
    }

    public async Task EndCall(int callId, int otherUserId)
    {
        var call = await _context.Calls.FindAsync(callId);
        if (call != null)
        {
            call.State = CallState.Ended;
            call.EndedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        if (_userConnections.TryGetValue(otherUserId, out var connectionId))
        {
            await Clients.Client(connectionId).SendAsync("CallEnded", new { CallId = callId });
        }
    }

    public async Task<List<object>> GetOnlineUsers()
    {
        var userId = GetUserId();
        var users = await _context.Users
            .Where(u => u.IsOnline && u.Id != userId)
            .Select(u => new { u.Id, u.Username, u.IsOnline })
            .ToListAsync();

        return users.Cast<object>().ToList();
    }

    private int? GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }

    private async Task SendPushNotification(int userId, int callerId)
    {
        // Push notification implementation will be in PushNotificationService
        // This is a placeholder for the integration
        await Task.CompletedTask;
    }
}
