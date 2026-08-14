using System.Net;
using System.Reflection;
using System.Text.RegularExpressions;

namespace StarterKit.Core.Notifications.Services;

/// <summary>
/// Renders embedded HTML email templates (<c>Notifications/Templates/{Key}.html</c>) into the
/// shared <c>_Layout.html</c> shell (brand header, footer wave, responsive styles). Each content
/// template is just the body fragment; the layout is applied once here so chrome and styling stay
/// consistent across every email.
/// <para>
/// <c>{{PropertyName}}</c> placeholders in the content template are substituted from a template-data
/// object via reflection and HTML-encoded, so user-controlled data (e.g. a display name containing
/// <c>&lt;</c> or <c>&amp;</c>) cannot break the markup or inject content. The layout's <c>{{Body}}</c>
/// slot receives the already-rendered (trusted) body and is not re-encoded.
/// </para>
/// </summary>
public static partial class EmailTemplateRenderer
{
    private const string LayoutKey = "_Layout";
    private const string BodyPlaceholder = "{{Body}}";

    [GeneratedRegex(@"\{\{(\w+)\}\}", RegexOptions.Compiled)]
    private static partial Regex PlaceholderRegex();

    public static string Render(string templateKey, object? templateData)
    {
        var body = Substitute(LoadTemplate(templateKey), templateData);
        var layout = LoadTemplate(LayoutKey);
        return layout.Replace(BodyPlaceholder, body);
    }

    private static string Substitute(string html, object? templateData)
    {
        if (templateData is null)
            return html;

        var properties = templateData
            .GetType()
            .GetProperties(BindingFlags.Public | BindingFlags.Instance);

        return PlaceholderRegex()
            .Replace(
                html,
                match =>
                {
                    var property = properties.FirstOrDefault(p => p.Name == match.Groups[1].Value);
                    if (property is null)
                        return match.Value;

                    var value = property.GetValue(templateData)?.ToString();
                    return value is null ? match.Value : WebUtility.HtmlEncode(value);
                }
            );
    }

    private static string LoadTemplate(string templateKey)
    {
        var assembly = typeof(EmailTemplateRenderer).Assembly;
        var resourceName = $"StarterKit.Core.Notifications.Templates.{templateKey}.html";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
            throw new InvalidOperationException(
                $"No embedded email template found for key '{templateKey}' (expected resource '{resourceName}')."
            );

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
