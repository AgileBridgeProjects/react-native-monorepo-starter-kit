using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace StarterKit.WebApi.Common;

/// <summary>
/// Validates the action's <c>from</c>/<c>to</c> <see cref="DateOnly"/> parameters: <c>from</c>
/// must not be after <c>to</c>, and the range must not exceed <see cref="MaxDays"/> days. Runs
/// before the action body so reports endpoints don't each repeat the same inline checks.
/// </summary>
public sealed class ValidateDateRangeAttribute(int maxDays = 365) : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (
            context.ActionArguments.TryGetValue("from", out var fromArg)
            && fromArg is DateOnly from
            && context.ActionArguments.TryGetValue("to", out var toArg)
            && toArg is DateOnly to
        )
        {
            if (from > to)
            {
                context.Result = new BadRequestObjectResult(
                    "The 'from' date must be on or before the 'to' date."
                );
                return;
            }

            if (to.DayNumber - from.DayNumber > maxDays)
            {
                context.Result = new BadRequestObjectResult(
                    $"Date range cannot exceed {maxDays} days."
                );
                return;
            }
        }

        base.OnActionExecuting(context);
    }
}
