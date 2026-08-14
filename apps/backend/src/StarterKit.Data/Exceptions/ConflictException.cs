namespace StarterKit.Data.Exceptions;

/// <summary>
/// Thrown when an operation cannot proceed because a conflicting record already exists.
/// Caught globally by <c>ConflictExceptionHandler</c> and mapped to HTTP 409.
/// </summary>
/// <param name="message">Human-readable description of the conflict.</param>
/// <param name="errorCode">Machine-readable code surfaced in ProblemDetails (e.g. "email-conflict").</param>
/// <param name="conflictingEntityId">Optional ID of the existing conflicting entity.</param>
public sealed class ConflictException(
    string message,
    string? errorCode = null,
    Guid? conflictingEntityId = null
) : InvalidOperationException(message)
{
    public string? ErrorCode { get; } = errorCode;
    public Guid? ConflictingEntityId { get; } = conflictingEntityId;
}
