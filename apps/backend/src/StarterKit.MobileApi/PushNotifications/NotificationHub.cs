using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using StarterKit.MobileApi.PushNotifications.Interfaces;

namespace StarterKit.MobileApi.PushNotifications;

/// <summary>
/// SignalR hub that pushes real-time notification signals to authenticated Expo clients.
/// Server-to-client only — no client-invokable methods.
/// </summary>
[Authorize]
public sealed class NotificationHub : Hub<INotificationHub>;
