using System.Text.Json;

namespace StarterKit.WebApi.Helpers;

/// <summary>
/// Shared JSON utilities for the WebApi response layer.
/// </summary>
internal static class JsonElementHelper
{
    /// <summary>
    /// Parses <paramref name="value"/> as a <see cref="JsonElement"/>.
    /// Returns <c>null</c> for null/whitespace input.
    /// Falls back to serializing the raw string as a JSON string element if parsing fails,
    /// so legacy or non-JSON values do not cause a 500.
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
            return JsonSerializer.SerializeToElement(value);
        }
    }
}
