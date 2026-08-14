using System.Text.Json;

namespace StarterKit.MobileApi.Helpers;

/// <summary>
/// Shared JSON utilities for the MobileApi response layer.
/// </summary>
internal static class JsonElementHelper
{
    /// <summary>
    /// Parses <paramref name="value"/> as a <see cref="JsonElement"/>.
    /// Returns <c>null</c> for null/whitespace input.
    /// Falls back to serializing the raw string as a JSON string element if parsing fails,
    /// so legacy or non-JSON result values do not cause a 500.
    /// </summary>
    internal static JsonElement? Parse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            using var document = JsonDocument.Parse(value);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            // Fallback: treat the value as a plain string and serialize it as a JSON string element.
            return JsonSerializer.SerializeToElement(value);
        }
    }
}
