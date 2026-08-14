using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Data.Exceptions;

namespace StarterKit.MobileApi.Exceptions;

public sealed class ConflictExceptionHandler(IProblemDetailsService problemDetailsService)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not ConflictException conflictException)
            return false;

        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = conflictException,
                ProblemDetails =
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Conflict",
                    Detail = conflictException.Message,
                    Extensions =
                    {
                        ["errorCode"] = conflictException.ErrorCode,
                        ["conflictingEntityId"] = conflictException.ConflictingEntityId,
                    },
                },
            }
        );
    }
}
