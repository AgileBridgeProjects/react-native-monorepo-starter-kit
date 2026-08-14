using System.ComponentModel.DataAnnotations;
using ValidationException = StarterKit.Data.Exceptions.ValidationException;

namespace StarterKit.WebApi.Users.Mcp;

/// <summary>
/// Runs a request DTO's DataAnnotations (including <see cref="IValidatableObject"/>) for MCP tool
/// calls. ASP.NET Core does this automatically for controller actions via <c>[ApiController]</c>,
/// but MCP tool invocations bypass model binding — without this, a rule such as
/// <see cref="DTOs.ParentLinkRule"/> would hold over REST and silently not over MCP, which
/// docs/standards/backend/mcp.md forbids ("a tool with a weaker policy than its controller action
/// is a security defect").
/// </summary>
internal static class McpRequestValidator
{
    internal static void EnsureValid<T>(T request)
        where T : notnull
    {
        var results = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true
        );

        if (isValid)
            return;

        throw new ValidationException(
            string.Join(
                " ",
                results.Select(r => r.ErrorMessage).Where(m => !string.IsNullOrWhiteSpace(m))
            )
        );
    }
}
