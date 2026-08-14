using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Resilience;
using Polly;
using Polly.Registry;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Helpers;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;

namespace StarterKit.Core.Notifications.Services;

/// <summary>
/// Sends transactional email via the Resend API (<c>POST https://api.resend.com/emails</c>).
/// Templates are rendered locally (see <see cref="EmailTemplateRenderer"/>) since Resend has no
/// concept of hosted, dashboard-configured templates.
/// </summary>
public sealed class ResendEmailSender(
    IOptions<EmailOptions> options,
    HttpClient httpClient,
    ResiliencePipelineProvider<string> pipelines,
    ILogger<ResendEmailSender> logger
) : IEmailSender
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly ResiliencePipeline _pipeline = pipelines.GetPipeline(
        NotificationPipelineKeys.Email
    );

    public Task SendAsync(
        EmailPayload payload,
        string toEmail,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentException(
                "Recipient email address must not be empty.",
                nameof(toEmail)
            );

        if (string.IsNullOrWhiteSpace(payload.Subject))
            throw new InvalidOperationException(
                "EmailPayload.Subject is required — Resend has no dashboard-configured template subject."
            );

        List<ResendAttachment> attachments = [];
        string html;

        if (payload.TemplateKey is not null)
        {
            html = EmailTemplateRenderer.Render(payload.TemplateKey, payload.TemplateData);
        }
        else if (payload.HtmlContent is not null)
        {
            var (processedHtml, inlineAttachments) = InlineImageExtractor.Extract(
                payload.HtmlContent
            );
            html = processedHtml;
            attachments.AddRange(
                inlineAttachments.Select(inline => new ResendAttachment(
                    inline.FileName,
                    inline.ContentBase64,
                    inline.ContentId
                ))
            );
        }
        else
        {
            throw new InvalidOperationException(
                "EmailPayload must specify either TemplateKey or HtmlContent."
            );
        }

        attachments.AddRange(
            (payload.Attachments ?? []).Select(attachment => new ResendAttachment(
                attachment.FileName,
                attachment.ContentBase64,
                null
            ))
        );

        return SendCoreAsync(
            payload.FromEmailOverride ?? options.Value.FromEmail,
            payload.FromNameOverride ?? options.Value.FromName,
            toEmail,
            payload.Subject,
            html: html,
            text: null,
            attachments,
            payload.TemplateKey,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public Task SendPlainAsync(
        string subject,
        string plainBody,
        string toEmail,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(toEmail))
            throw new ArgumentException(
                "Recipient email address must not be empty.",
                nameof(toEmail)
            );

        return SendCoreAsync(
            options.Value.FromEmail,
            options.Value.FromName,
            toEmail,
            subject,
            html: null,
            text: plainBody,
            [],
            templateKeyForLogging: null,
            cancellationToken
        );
    }

    private Task SendCoreAsync(
        string fromEmail,
        string fromName,
        string toEmail,
        string subject,
        string? html,
        string? text,
        List<ResendAttachment> attachments,
        string? templateKeyForLogging,
        CancellationToken cancellationToken
    ) =>
        _pipeline
            .ExecuteAsync(
                async ct =>
                {
                    var request = new ResendEmailRequest(
                        From: $"{fromName} <{fromEmail}>",
                        To: [toEmail],
                        Subject: subject,
                        Html: html,
                        Text: text,
                        Attachments: attachments.Count > 0 ? attachments : null
                    );

                    using var response = await httpClient.PostAsJsonAsync(
                        "emails",
                        request,
                        JsonOptions,
                        ct
                    );

                    if (!response.IsSuccessStatusCode)
                    {
                        var body = await response.Content.ReadAsStringAsync(ct);
                        logger.LogError(
                            "Resend returned {StatusCode} for template {TemplateKey}. Body: {Body}",
                            response.StatusCode,
                            templateKeyForLogging,
                            body
                        );
                        throw new InvalidOperationException(
                            $"Resend email failed with status {response.StatusCode}."
                        );
                    }

                    logger.LogInformation(
                        "Email sent successfully via Resend (templateKey: {TemplateKey})",
                        templateKeyForLogging
                    );
                },
                cancellationToken
            )
            .AsTask();

    private sealed record ResendEmailRequest(
        string From,
        List<string> To,
        string Subject,
        string? Html,
        string? Text,
        List<ResendAttachment>? Attachments
    );

    private sealed record ResendAttachment(string Filename, string Content, string? ContentId);
}
