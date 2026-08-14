using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Auth.Services;

/// <summary>
/// No-op provisioning service used when Supabase:Enabled is false (tests / local envs without a
/// Supabase stack). Returns a synthetic id so callers can proceed; no external user is created.
/// </summary>
internal sealed class NoOpAuthUserProvisioningService : IAuthUserProvisioningService
{
    public Task<string> CreateUserByEmailAsync(
        string email,
        string displayName,
        AuthenticationMethod authMethod,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(Guid.NewGuid().ToString());

    public Task<string> CreateUserByPhoneAsync(
        string phoneNumber,
        string displayName,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(Guid.NewGuid().ToString());

    public Task<string> CreateUserByUsernameAsync(
        string username,
        string password,
        string displayName,
        CancellationToken cancellationToken = default
    ) => Task.FromResult(Guid.NewGuid().ToString());

    public Task DeleteUserAsync(string authUserId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task UpdatePasswordAsync(
        string authUserId,
        string newPassword,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;
}
