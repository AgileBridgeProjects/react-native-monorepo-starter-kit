using StarterKit.Core.Notifications.Enums;

namespace StarterKit.Core.Notifications.Exceptions;

/// <summary>
/// Thrown when no active users with a valid contact value (email/phone) are found
/// for the selected club/team on a communications send.
/// </summary>
/// <remarks>
/// Extends <see cref="ArgumentException"/> so the existing global
/// <c>ArgumentExceptionHandler</c> maps it to <c>HTTP 400 Bad Request</c>.
/// </remarks>
public sealed class NoEligibleRecipientsException(NotificationChannel channel)
    : ArgumentException(
        channel switch
        {
            NotificationChannel.Sms =>
                "No eligible recipients found with phone numbers for the selected club/team.",
            NotificationChannel.InApp => "No eligible recipients found for the selected club/team.",
            _ => "No eligible recipients found with email addresses for the selected club/team.",
        }
    )
{
    public NotificationChannel Channel { get; } = channel;
}
