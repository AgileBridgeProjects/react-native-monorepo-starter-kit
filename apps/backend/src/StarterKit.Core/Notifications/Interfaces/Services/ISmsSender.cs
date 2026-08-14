using StarterKit.Core.Notifications.DTOs;

namespace StarterKit.Core.Notifications.Interfaces.Services;

public interface ISmsSender
{
    Task SendAsync(
        SmsPayload payload,
        string toPhoneNumber,
        CancellationToken cancellationToken = default
    );
}
