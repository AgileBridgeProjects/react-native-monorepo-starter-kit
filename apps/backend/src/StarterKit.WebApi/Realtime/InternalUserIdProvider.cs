using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using StarterKit.Auth.Constants;

namespace StarterKit.WebApi.Realtime;

/// <summary>
/// Maps SignalR connections to the internal StarterKit user id, matching Core service identifiers.
/// </summary>
internal sealed class InternalUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User.FindFirstValue(StarterKitClaims.InternalUserId);
}
