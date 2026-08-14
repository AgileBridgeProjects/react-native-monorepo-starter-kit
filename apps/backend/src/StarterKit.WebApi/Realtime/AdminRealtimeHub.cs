using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace StarterKit.WebApi.Realtime;

/// <summary>
/// Server-to-client hub for admin portal realtime events.
/// </summary>
[Authorize]
public sealed class AdminRealtimeHub : Hub<IAdminRealtimeHub>;
