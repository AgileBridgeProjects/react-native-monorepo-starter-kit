using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Data.Exceptions;

namespace StarterKit.WebApi.Exceptions;

/// <summary>
/// Global exception handler that maps <see cref="ValidationException"/> to HTTP 400.
/// Registered via <c>builder.Services.AddExceptionHandler&lt;ValidationExceptionHandler&gt;()</c>
/// and activated by <c>app.UseExceptionHandler()</c> in Program.cs.
/// </summary>
public sealed class ValidationExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not ValidationException validationException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = validationException,
                ProblemDetails =
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Bad Request",
                    Detail = validationException.Message,
                    Extensions = { ["errorCode"] = validationException.ErrorCode },
                },
            }
        );
    }
}
