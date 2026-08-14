using StarterKit.Auth.Interfaces;

namespace StarterKit.Auth.Services;

/// <summary>
/// No-op token validator used when Supabase:Enabled is false (tests / environments without a
/// Supabase stack). Always rejects tokens.
/// </summary>
internal sealed class NoOpSupabaseAuthService : ISupabaseAuthService
{
    public SupabaseToken? ValidateToken(string accessToken) => null;
}
