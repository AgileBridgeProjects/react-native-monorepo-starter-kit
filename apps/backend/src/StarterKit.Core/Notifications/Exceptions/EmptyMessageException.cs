namespace StarterKit.Core.Notifications.Exceptions;

/// <summary>
/// Thrown when a communications send command has an empty or whitespace-only message.
/// </summary>
/// <remarks>
/// Extends <see cref="ArgumentException"/> so the existing global
/// <c>ArgumentExceptionHandler</c> maps it to <c>HTTP 400 Bad Request</c>.
/// </remarks>
public sealed class EmptyMessageException() : ArgumentException("Message must not be empty.") { }
