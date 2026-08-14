using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Users.Exceptions;

namespace StarterKit.WebApi.Users;

/// <summary>
/// Maps <see cref="BulkUploadValidationException"/> (e.g. missing required template columns,
/// corrupt file, empty file) to HTTP 422 using <see cref="HttpValidationProblemDetails"/>.
/// </summary>
public sealed class BulkUploadExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        if (exception is not BulkUploadValidationException bulkEx)
            return false;

        var errors = bulkEx
            .ValidationErrors.Select((msg, i) => (Key: $"file[{i}]", Value: new[] { msg }))
            .ToDictionary(x => x.Key, x => x.Value);

        httpContext.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
        await httpContext.Response.WriteAsJsonAsync(
            new HttpValidationProblemDetails(errors) { Title = "Bulk upload validation failed." },
            cancellationToken
        );

        return true;
    }
}
