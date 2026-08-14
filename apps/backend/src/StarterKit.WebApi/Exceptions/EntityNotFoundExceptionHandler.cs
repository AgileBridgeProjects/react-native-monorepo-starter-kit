using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Data.Exceptions;

namespace StarterKit.WebApi.Exceptions;

/// <summary>
/// Global exception handler that maps <see cref="EntityNotFoundException"/> to HTTP 404.
/// Registered via <c>builder.Services.AddExceptionHandler&lt;EntityNotFoundExceptionHandler&gt;()</c>
/// and activated by <c>app.UseExceptionHandler()</c> in Program.cs.
///
/// All other unhandled exceptions fall through to the default ASP.NET Core 500 handler
/// so that unexpected infrastructure failures surface as 500 rather than being silently swallowed.
/// </summary>
public sealed class EntityNotFoundExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not EntityNotFoundException notFoundException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = notFoundException,
                ProblemDetails =
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Not Found",
                    Detail = notFoundException.Message,
                },
            }
        );
    }
}
