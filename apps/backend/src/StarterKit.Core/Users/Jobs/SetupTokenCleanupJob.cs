using Microsoft.Extensions.Logging;
using StarterKit.Core.Interfaces.Services;

namespace StarterKit.Core.Users.Jobs;

/// <summary>
/// Hangfire recurring job that hard-deletes <c>UserSetupToken</c> rows older than
/// the configured retention window (<see cref="StarterKit.Core.Configuration.AccountSetupOptions.TokenRetentionDays"/>).
/// Scheduled daily at 03:00 UTC — offset from the hourly <c>SetupTokenExpiryService</c>.
/// Active tokens (not expired, not used, not invalidated) are never deleted.
/// </summary>
public sealed class SetupTokenCleanupJob(
    IUserService userService,
    ILogger<SetupTokenCleanupJob> logger
)
{
    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("SetupTokenCleanupJob: starting daily token retention sweep");
        await userService.CleanupSetupTokensAsync(cancellationToken);
        logger.LogInformation("SetupTokenCleanupJob: completed");
    }
}
