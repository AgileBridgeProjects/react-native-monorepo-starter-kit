using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace StarterKit.MobileApi.Exceptions;

/// <summary>
/// Maps EF Core's <see cref="DbUpdateConcurrencyException"/> to HTTP 409. Distinct from
/// <see cref="ConflictExceptionHandler"/>, which only handles the app's own
/// <c>StarterKit.Data.Exceptions.ConflictException</c> — EF's own concurrency-token exception was
/// previously unhandled and would have surfaced as a generic 500.
/// </summary>
public sealed class ConcurrencyExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not DbUpdateConcurrencyException concurrencyException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = concurrencyException,
                ProblemDetails =
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Conflict",
                    Detail =
                        "The record was modified by another user. Please reload and try again.",
                },
            }
        );
    }
}
