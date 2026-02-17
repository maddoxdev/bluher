using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.EntityFrameworkCore;
using VoipServer.Data;

namespace VoipServer.Services;

public interface IPushNotificationService
{
    Task SendCallNotificationAsync(int userId, int callerId, string callerName);
}

public class PushNotificationService : IPushNotificationService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PushNotificationService> _logger;
    private bool _firebaseInitialized = false;

    public PushNotificationService(IServiceScopeFactory scopeFactory, ILogger<PushNotificationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        InitializeFirebase();
    }

    private void InitializeFirebase()
    {
        try
        {
            // Initialize Firebase only if credentials are available
            var credentialsPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");
            if (!string.IsNullOrEmpty(credentialsPath) && File.Exists(credentialsPath))
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromFile(credentialsPath)
                });
                _firebaseInitialized = true;
                _logger.LogInformation("Firebase initialized successfully");
            }
            else
            {
                _logger.LogWarning("Firebase credentials not found. Push notifications will not work.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Firebase");
        }
    }

    public async Task SendCallNotificationAsync(int userId, int callerId, string callerName)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<VoipDbContext>();
        
        var user = await context.Users.FindAsync(userId);
        if (user == null) return;

        try
        {
            // Send Firebase notification (Android)
            if (!string.IsNullOrEmpty(user.FirebaseToken) && _firebaseInitialized)
            {
                var message = new Message
                {
                    Token = user.FirebaseToken,
                    Notification = new Notification
                    {
                        Title = "Incoming Call",
                        Body = $"{callerName} is calling you"
                    },
                    Data = new Dictionary<string, string>
                    {
                        { "type", "incoming_call" },
                        { "callerId", callerId.ToString() },
                        { "callerName", callerName }
                    },
                    Android = new AndroidConfig
                    {
                        Priority = Priority.High,
                        Notification = new AndroidNotification
                        {
                            Sound = "default",
                            Priority = NotificationPriority.MAX
                        }
                    }
                };

                await FirebaseMessaging.DefaultInstance.SendAsync(message);
                _logger.LogInformation($"Firebase notification sent to user {userId}");
            }

            // APNS notification (iOS) would be sent through Firebase as well
            // or through a separate APNS service
            if (!string.IsNullOrEmpty(user.ApnsToken) && _firebaseInitialized)
            {
                var message = new Message
                {
                    Token = user.ApnsToken,
                    Notification = new Notification
                    {
                        Title = "Incoming Call",
                        Body = $"{callerName} is calling you"
                    },
                    Data = new Dictionary<string, string>
                    {
                        { "type", "incoming_call" },
                        { "callerId", callerId.ToString() },
                        { "callerName", callerName }
                    },
                    Apns = new ApnsConfig
                    {
                        Aps = new Aps
                        {
                            Sound = "default",
                            Badge = 1
                        }
                    }
                };

                await FirebaseMessaging.DefaultInstance.SendAsync(message);
                _logger.LogInformation($"APNS notification sent to user {userId}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send push notification to user {userId}");
        }
    }
}
