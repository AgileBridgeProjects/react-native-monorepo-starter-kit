using System.Globalization;
using Microsoft.Extensions.Options;
using StarterKit.Core.Dev.Options;

namespace StarterKit.Core.Dev;

/// <summary>
/// <see cref="TimeProvider"/> that freezes <see cref="GetUtcNow"/> to
/// <see cref="DevClockOptions.OverrideUtc"/> when set, otherwise passes through to real system
/// time. Only ever registered when <see cref="DevClockGate.IsLocalDevelopment"/> is
/// true — see Program.cs in each API host. Reads via <see cref="IOptionsMonitor{T}"/> so editing
/// <c>DevClock:OverrideUtc</c> in appsettings.json takes effect on the next call, no restart.
/// </summary>
public sealed class DevClockTimeProvider(IOptionsMonitor<DevClockOptions> options) : TimeProvider
{
    public override DateTimeOffset GetUtcNow()
    {
        var overrideUtc = options.CurrentValue.OverrideUtc;

        return
            !string.IsNullOrWhiteSpace(overrideUtc)
            && DateTimeOffset.TryParse(
                overrideUtc,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var frozen
            )
            ? frozen
            : System.GetUtcNow();
    }
}
