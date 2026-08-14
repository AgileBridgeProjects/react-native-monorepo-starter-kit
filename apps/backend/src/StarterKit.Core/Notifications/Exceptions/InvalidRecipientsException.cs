namespace StarterKit.Core.Notifications.Exceptions;

/// <summary>
/// Thrown when a communications send command is invoked without any club
/// or team recipients specified.
/// </summary>
/// <remarks>
/// Extends <see cref="ArgumentException"/> so the existing global
/// <c>ArgumentExceptionHandler</c> maps it to <c>HTTP 400 Bad Request</c>.
/// </remarks>
public sealed class InvalidRecipientsException()
    : ArgumentException("At least one club or team must be specified.") { }
