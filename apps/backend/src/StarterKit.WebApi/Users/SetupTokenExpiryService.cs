using StarterKit.Core.Interfaces.Services;

namespace StarterKit.WebApi.Users;

/// <summary>
/// Background service that periodically invokes the Core-layer expired-token scan (AC 7d).
/// </summary>
internal sealed class SetupTokenExpiryService(
    IServiceScopeFactory scopeFactory,
    ILogger<SetupTokenExpiryService> logger
) : BackgroundService
{
    private static readonly TimeSpan ScanInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Delay the first scan slightly to let the host finish startup.
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        using var timer = new PeriodicTimer(ScanInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
                await userService.ProcessExpiredSetupTokensAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "SetupTokenExpiryService: unhandled error during scan");
            }

            await timer.WaitForNextTickAsync(stoppingToken);
        }
    }
}
