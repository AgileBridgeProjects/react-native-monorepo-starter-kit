using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Resilience;
using Polly;
using Polly.Registry;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace StarterKit.Core.Notifications.Services;

public sealed class TwilioSmsSender(
    IOptions<TwilioOptions> options,
    Twilio.Clients.ITwilioRestClient twilioClient,
    ResiliencePipelineProvider<string> pipelines,
    ILogger<TwilioSmsSender> logger
) : ISmsSender
{
    private readonly ResiliencePipeline _pipeline = pipelines.GetPipeline(
        NotificationPipelineKeys.Sms
    );

    public async Task SendAsync(
        SmsPayload payload,
        string toPhoneNumber,
        CancellationToken cancellationToken = default
    )
    {
        var opts = options.Value;

        if (
            opts.UseTestCredentials
            && (
                opts.TestAccountSid is null
                || opts.TestAuthToken is null
                || opts.TestFromNumber is null
            )
        )
        {
            throw new InvalidOperationException(
                "TwilioOptions.UseTestCredentials is true but TestAccountSid, TestAuthToken, or TestFromNumber is not configured."
            );
        }

        await _pipeline.ExecuteAsync(
            async ct =>
            {
                var message = await MessageResource.CreateAsync(
                    to: new PhoneNumber(toPhoneNumber),
                    from: new PhoneNumber(opts.EffectiveFromNumber),
                    body: payload.Body,
                    client: twilioClient
                );

                if (
                    message.Status == MessageResource.StatusEnum.Failed
                    || message.Status == MessageResource.StatusEnum.Undelivered
                )
                {
                    logger.LogError(
                        "Twilio SMS failed — Status: {Status}, ErrorCode: {ErrorCode}, ErrorMessage: {ErrorMessage}",
                        message.Status,
                        message.ErrorCode,
                        message.ErrorMessage
                    );
                    throw new InvalidOperationException(
                        $"Twilio SMS failed with status {message.Status}."
                    );
                }

                logger.LogInformation(
                    "SMS sent successfully via Twilio (SID: {Sid}, Status: {Status}, TestMode: {TestMode})",
                    message.Sid,
                    message.Status,
                    opts.UseTestCredentials
                );
            },
            cancellationToken
        );
    }
}
