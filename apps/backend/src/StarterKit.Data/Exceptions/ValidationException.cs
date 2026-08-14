namespace StarterKit.Data.Exceptions;

/// <summary>
/// Thrown when an operation is rejected due to a business-rule validation failure.
/// Caught globally by <c>ValidationExceptionHandler</c> and mapped to HTTP 400.
/// </summary>
/// <param name="message">Human-readable description of the violation.</param>
/// <param name="errorCode">Machine-readable code surfaced in ProblemDetails (e.g. "role-inactive").</param>
public sealed class ValidationException(string message, string? errorCode = null)
    : InvalidOperationException(message)
{
    public string? ErrorCode { get; } = errorCode;
}
