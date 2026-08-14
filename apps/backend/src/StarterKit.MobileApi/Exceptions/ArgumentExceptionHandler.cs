using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace StarterKit.MobileApi.Exceptions;

/// <summary>
/// Global exception handler that maps <see cref="ArgumentException"/> to HTTP 400.
/// Registered via <c>builder.Services.AddExceptionHandler&lt;ArgumentExceptionHandler&gt;()</c>
/// and activated by <c>app.UseExceptionHandler()</c> in Program.cs.
/// </summary>
public sealed class ArgumentExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not ArgumentException argumentException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = argumentException,
                ProblemDetails =
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Bad Request",
                    Detail = argumentException.Message,
                },
            }
        );
    }
}
