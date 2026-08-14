using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Validation;

/// <summary>
/// Validates that a <see cref="Guid"/> property or action parameter is not <see cref="Guid.Empty"/>.
/// <see cref="AttributeTargets.Parameter"/> is included so route/query <see cref="Guid"/>
/// parameters (e.g. <c>{id}</c>) can be validated the same way as request-body properties —
/// ASP.NET Core's automatic model validation runs DataAnnotations against bound action parameters
/// too, not just complex request-body types.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NonEmptyGuidAttribute : ValidationAttribute
{
    public NonEmptyGuidAttribute()
        : base("The {0} field must not be an empty GUID.") { }

    public override bool IsValid(object? value) => value is Guid guid && guid != Guid.Empty;
}
