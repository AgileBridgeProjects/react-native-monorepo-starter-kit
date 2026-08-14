namespace StarterKit.WebApi.Helpers;

/// <summary>
/// Shared blob-URL utilities for the WebApi response layer.
/// </summary>
internal static class BlobUrlHelper
{
    /// <summary>
    /// Extracts a human-readable file name from a blob storage URL.
    /// Returns <c>null</c> when <paramref name="url"/> is null, empty, or has no path segment.
    /// </summary>
    internal static string? ExtractFileName(string? url)
    {
        if (string.IsNullOrEmpty(url))
            return null;

        var lastSlash = url.LastIndexOf('/');
        if (lastSlash < 0 || lastSlash >= url.Length - 1)
            return null;

        var segment = url[(lastSlash + 1)..];

        var queryIndex = segment.IndexOf('?');
        if (queryIndex >= 0)
            segment = segment[..queryIndex];

        return string.IsNullOrEmpty(segment) ? null : Uri.UnescapeDataString(segment);
    }
}
