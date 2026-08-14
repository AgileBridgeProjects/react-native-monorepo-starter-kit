using Microsoft.Extensions.Logging;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;

namespace StarterKit.Core.Notifications.Services;

/// <summary>
/// Registered when Twilio credentials are not configured. Logs a warning and no-ops
/// so the application can start without Twilio while still accepting SMS dispatch calls.
/// </summary>
public sealed class NoOpSmsSender(ILogger<NoOpSmsSender> logger) : ISmsSender
{
    public Task SendAsync(
        SmsPayload payload,
        string toPhoneNumber,
        CancellationToken cancellationToken = default
    )
    {
        logger.LogWarning(
            "SMS to {PhoneNumber} was not sent — Twilio is not configured. "
                + "Add Twilio secrets to Key Vault to enable SMS delivery",
            toPhoneNumber
        );
        return Task.CompletedTask;
    }
}
