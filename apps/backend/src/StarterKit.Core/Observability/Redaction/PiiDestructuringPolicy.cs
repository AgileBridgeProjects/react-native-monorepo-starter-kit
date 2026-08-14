using System.Collections;
using System.Reflection;
using Serilog.Core;
using Serilog.Events;

namespace StarterKit.Core.Observability.Redaction;

/// <summary>
/// Serilog destructuring policy that masks the value of any property whose name matches a known
/// PII field (email, phone, national ID/passport, password, person names, date of birth) when an
/// object is logged as a structured value — e.g. <c>_logger.LogInformation("Created {@User}", user)</c>.
///
/// Name-based rather than per-type so newly added DTOs are covered automatically without
/// annotation. Only objects that actually contain a sensitive property are intercepted; everything
/// else falls through to Serilog's default destructuring.
///
/// Limitation: this only applies to destructured objects. Values logged as scalars
/// (<c>"... {Email}", user.Email</c>) are not intercepted, so log statements should still avoid
/// passing raw PII as individual message parameters.
/// </summary>
public sealed class PiiDestructuringPolicy : IDestructuringPolicy
{
    private const string MaskedValue = "[Redacted]";

    private static readonly HashSet<string> SensitivePropertyNames = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Email",
        "EmailAddress",
        "Phone",
        "PhoneNumber",
        "MobileNumber",
        "Cellphone",
        "IdNumber",
        "IdentityNumber",
        "PassportNumber",
        "Password",
        "FirstName",
        "LastName",
        "FullName",
        "DateOfBirth",
        "Dob",
    };

    public bool TryDestructure(
        object value,
        ILogEventPropertyValueFactory propertyValueFactory,
        out LogEventPropertyValue result
    )
    {
        result = null!;

        // Leave scalars, strings, and collections to Serilog's built-in handling.
        var type = value.GetType();
        if (type.IsPrimitive || value is string || value is IEnumerable)
            return false;

        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead && p.GetIndexParameters().Length == 0)
            .ToArray();

        // Only take over destructuring when there is actually something to redact — otherwise
        // defer to Serilog so unrelated objects keep their normal representation.
        if (!properties.Any(p => SensitivePropertyNames.Contains(p.Name)))
            return false;

        var logProperties = new List<LogEventProperty>(properties.Length);
        foreach (var property in properties)
        {
            LogEventPropertyValue propertyValue;
            if (SensitivePropertyNames.Contains(property.Name))
            {
                propertyValue = new ScalarValue(MaskedValue);
            }
            else
            {
                object? raw;
                try
                {
                    raw = property.GetValue(value);
                }
                catch
                {
                    // A throwing getter must never break logging — skip the property.
                    continue;
                }

                propertyValue = propertyValueFactory.CreatePropertyValue(
                    raw,
                    destructureObjects: true
                );
            }

            logProperties.Add(new LogEventProperty(property.Name, propertyValue));
        }

        result = new StructureValue(logProperties, type.Name);
        return true;
    }
}
