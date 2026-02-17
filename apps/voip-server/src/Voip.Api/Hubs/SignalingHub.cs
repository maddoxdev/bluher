using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace Voip.Api.Hubs;

public class SignalingHub : Hub
{
    private static readonly object Sync = new();
    private static readonly ConcurrentDictionary<string, List<string>> Rooms = new();
    private static readonly ConcurrentDictionary<string, string> ConnectionToRoom = new();

    public async Task JoinRoom(string? roomId)
    {
        roomId = roomId?.Trim();
        if (string.IsNullOrWhiteSpace(roomId))
        {
            await Clients.Caller.SendAsync("Error", "Room ID is required.");
            return;
        }

        if (ConnectionToRoom.ContainsKey(Context.ConnectionId))
        {
            await Clients.Caller.SendAsync("Error", "You are already in a room.");
            return;
        }

        List<string> members;
        var isRoomFull = false;

        lock (Sync)
        {
            members = Rooms.GetOrAdd(roomId, _ => []);
            if (members.Count >= 2)
            {
                isRoomFull = true;
            }
            else
            {
                members.Add(Context.ConnectionId);
                ConnectionToRoom[Context.ConnectionId] = roomId;
            }
        }

        if (isRoomFull)
        {
            await Clients.Caller.SendAsync("RoomFull", "Room already has 2 participants.");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Caller.SendAsync("Joined", roomId, members.Count);

        if (members.Count == 1)
        {
            await Clients.Caller.SendAsync("WaitingPeer");
            return;
        }

        var first = members[0];
        var second = members[1];

        await Clients.Client(first).SendAsync("StartOffer");
        await Clients.Client(second).SendAsync("StartAnswer");
    }

    public Task SendOffer(string sdp) => RelayToPeer("ReceiveOffer", sdp);

    public Task SendAnswer(string sdp) => RelayToPeer("ReceiveAnswer", sdp);

    public Task SendIceCandidate(string candidateJson) => RelayToPeer("ReceiveIceCandidate", candidateJson);

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionToRoom.TryRemove(Context.ConnectionId, out var roomId))
        {
            var hasPeer = false;

            lock (Sync)
            {
                if (Rooms.TryGetValue(roomId, out var members))
                {
                    members.Remove(Context.ConnectionId);
                    hasPeer = members.Count > 0;
                    if (members.Count == 0)
                    {
                        Rooms.TryRemove(roomId, out _);
                    }
                }
            }

            if (hasPeer)
            {
                await Clients.Group(roomId).SendAsync("PeerLeft");
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Task RelayToPeer(string eventName, string payload)
        => ConnectionToRoom.TryGetValue(Context.ConnectionId, out var roomId)
            ? Clients.OthersInGroup(roomId).SendAsync(eventName, payload)
            : Clients.Caller.SendAsync("Error", "Join room first.");
}
