using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace StarterKit.Core.Imaging;

/// <summary>
/// Sanitizes SVG content to remove XSS attack vectors before storage.
/// Strips script elements, event handler attributes, and external references.
/// </summary>
public static partial class SvgSanitizer
{
    private static readonly HashSet<string> DangerousElements = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "script",
        "foreignObject",
        "iframe",
        "object",
        "embed",
        "applet",
    };

    private static readonly HashSet<string> DangerousAttributePrefixes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "on", // onclick, onload, onerror, etc.
    };

    private static readonly HashSet<string> DangerousAttributes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "xlink:href",
        "href",
    };

    /// <summary>
    /// Validates that the stream contains well-formed SVG XML.
    /// Returns the parsed <see cref="XDocument"/> or throws <see cref="ArgumentException"/>.
    /// </summary>
    public static XDocument ParseAndValidate(Stream svgStream)
    {
        try
        {
            var doc = XDocument.Load(svgStream);
            var root =
                doc.Root ?? throw new ArgumentException("SVG file has no root element.", "file");

            var localName = root.Name.LocalName;
            if (!string.Equals(localName, "svg", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("File root element must be <svg>.", "file");

            return doc;
        }
        catch (System.Xml.XmlException ex)
        {
            throw new ArgumentException($"File is not valid SVG/XML: {ex.Message}", "file");
        }
    }

    /// <summary>
    /// Removes dangerous elements and attributes from the SVG document in-place.
    /// </summary>
    public static void Sanitize(XDocument doc)
    {
        var elementsToRemove = doc.Descendants()
            .Where(e => DangerousElements.Contains(e.Name.LocalName))
            .ToList();

        foreach (var element in elementsToRemove)
            element.Remove();

        // Remove event handler attributes and dangerous href attributes pointing to javascript:
        foreach (var element in doc.Descendants())
        {
            var attrsToRemove = element
                .Attributes()
                .Where(a =>
                    IsEventHandler(a.Name.LocalName)
                    || (DangerousAttributes.Contains(a.Name.LocalName) && IsJavascriptUri(a.Value))
                )
                .ToList();

            foreach (var attr in attrsToRemove)
                attr.Remove();
        }
    }

    private static bool IsEventHandler(string attrName)
    {
        return attrName.Length > 2 && attrName.StartsWith("on", StringComparison.OrdinalIgnoreCase);
    }

    [GeneratedRegex(@"^\s*javascript\s*:", RegexOptions.IgnoreCase)]
    private static partial Regex JavascriptUriPattern();

    private static bool IsJavascriptUri(string value)
    {
        return JavascriptUriPattern().IsMatch(value);
    }
}
