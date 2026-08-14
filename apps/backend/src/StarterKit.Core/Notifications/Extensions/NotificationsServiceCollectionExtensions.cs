using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Resilience;
using Polly;
using Polly.CircuitBreaker;
using Polly.Registry;
using Polly.Retry;
using StarterKit.Core.Notifications.Interfaces;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;
using StarterKit.Core.Notifications.Services;
using Twilio.Clients;

namespace StarterKit.Core.Notifications.Extensions;

public static class NotificationsServiceCollectionExtensions
{
    public static IServiceCollection AddStarterKitNotifications(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Options — validated eagerly on startup
        services
            .AddOptions<CommunicationsOptions>()
            .BindConfiguration(CommunicationsOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services
            .AddOptions<EmailOptions>()
            .BindConfiguration(EmailOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Resilience pipelines (Polly v8)
        services.AddResiliencePipeline(
            NotificationPipelineKeys.Email,
            builder =>
                builder
                    .AddRetry(
                        new RetryStrategyOptions
                        {
                            MaxRetryAttempts = 3,
                            Delay = TimeSpan.FromMilliseconds(300),
                            BackoffType = DelayBackoffType.Exponential,
                            UseJitter = true,
                            ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>(),
                        }
                    )
                    .AddCircuitBreaker(
                        new CircuitBreakerStrategyOptions
                        {
                            FailureRatio = 0.5,
                            SamplingDuration = TimeSpan.FromSeconds(30),
                            MinimumThroughput = 5,
                            BreakDuration = TimeSpan.FromSeconds(15),
                        }
                    )
                    .AddTimeout(TimeSpan.FromSeconds(15))
        );

        // Resend client — typed HttpClient carries the bearer API key on every request.
        services.AddHttpClient<IEmailSender, ResendEmailSender>(
            (sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<EmailOptions>>().Value;
                client.BaseAddress = new Uri("https://api.resend.com/");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                    "Bearer",
                    opts.ApiKey
                );
            }
        );

        // Twilio — conditional on configuration being present
        var twilioSection = configuration.GetSection(TwilioOptions.SectionName);
        if (twilioSection.Exists() && !string.IsNullOrEmpty(twilioSection["AccountSid"]))
        {
            services
                .AddOptions<TwilioOptions>()
                .BindConfiguration(TwilioOptions.SectionName)
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddSingleton<IValidateOptions<TwilioOptions>, TwilioOptionsValidator>();

            services.AddResiliencePipeline(
                NotificationPipelineKeys.Sms,
                builder =>
                    builder
                        .AddRetry(
                            new RetryStrategyOptions
                            {
                                MaxRetryAttempts = 3,
                                Delay = TimeSpan.FromMilliseconds(300),
                                BackoffType = DelayBackoffType.Exponential,
                                UseJitter = true,
                                ShouldHandle = new PredicateBuilder()
                                    .Handle<HttpRequestException>()
                                    .Handle<Twilio.Exceptions.ApiException>(),
                            }
                        )
                        .AddCircuitBreaker(
                            new CircuitBreakerStrategyOptions
                            {
                                FailureRatio = 0.5,
                                SamplingDuration = TimeSpan.FromSeconds(30),
                                MinimumThroughput = 5,
                                BreakDuration = TimeSpan.FromSeconds(15),
                            }
                        )
                        .AddTimeout(TimeSpan.FromSeconds(15))
            );

            services.AddSingleton<ITwilioRestClient>(sp =>
            {
                var opts = sp.GetRequiredService<IOptions<TwilioOptions>>().Value;
                return new TwilioRestClient(opts.EffectiveAccountSid, opts.EffectiveAuthToken);
            });

            services.AddScoped<ISmsSender, TwilioSmsSender>();
        }
        else
        {
            services.AddScoped<ISmsSender, NoOpSmsSender>();
        }

        services.AddScoped<INotificationDispatcher, NotificationDispatcher>();
        services.AddScoped<ICommunicationsService, CommunicationsService>();
        // Default no-op broadcaster — StarterKit.WebApi overrides with NotificationMessageSignalRBroadcaster.
        services.AddScoped<INotificationMessageBroadcaster, NoOpNotificationMessageBroadcaster>();
        services.AddScoped<ICommunicationsJobProcessor, CommunicationsJobProcessor>();
        services.AddScoped<INotificationMessageService, NotificationMessageService>();

        return services;
    }
}
