using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using StarterKit.Auth.Constants;

namespace StarterKit.MobileApi.PushNotifications;

/// <summary>
/// Maps each hub connection to the user's internal StarterKit GUID (<c>internal_user_id</c> claim)
/// so that <c>IHubContext.Clients.User(userId.ToString())</c> targets the correct connections.
///
/// The default <see cref="DefaultUserIdProvider"/> uses <see cref="ClaimTypes.NameIdentifier"/>,
/// which is the Supabase auth user id (sub) — not the internal database GUID that <c>IPushNotificationsService</c>
/// uses when broadcasting. This provider ensures the two sides agree on the same key.
/// </summary>
internal sealed class InternalUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) =>
        connection.User.FindFirstValue(StarterKitClaims.InternalUserId);
}
