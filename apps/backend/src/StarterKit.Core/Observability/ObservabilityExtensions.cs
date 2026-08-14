using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Serilog.Formatting.Json;
using StarterKit.Core.Observability.Redaction;

namespace StarterKit.Core.Observability;

/// <summary>
/// Shared observability wiring for the API hosts. Call <see cref="AddStarterKitObservability"/> once
/// from each API's <c>Program.cs</c> so Application Insights and Serilog are configured identically
/// across services.
/// </summary>
public static class ObservabilityExtensions
{
    /// <summary>
    /// Registers Application Insights (requests, dependencies, exceptions, performance, Live Metrics)
    /// and Serilog structured logging to both the console (JSON) and App Insights traces, with
    /// <see cref="PiiDestructuringPolicy"/> applied to redact PII from destructured objects.
    ///
    /// Telemetry targets the connection string in <c>APPLICATIONINSIGHTS_CONNECTION_STRING</c> and
    /// no-ops when none is configured (e.g. the Testing environment), so it is safe to always call.
    /// Custom Docker containers get no codeless auto-instrumentation, so this explicit registration
    /// is what makes the App Insights resources receive any data at all.
    /// </summary>
    public static IServiceCollection AddStarterKitObservability(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddApplicationInsightsTelemetry();

        services.AddSerilog(
            (provider, loggerConfiguration) =>
            {
                loggerConfiguration
                    .ReadFrom.Configuration(configuration)
                    .ReadFrom.Services(provider)
                    .Enrich.FromLogContext()
                    .Enrich.WithEnvironmentName()
                    .Enrich.WithThreadId()
                    .Destructure.With<PiiDestructuringPolicy>()
                    .WriteTo.Console(new JsonFormatter());

                // Attach the App Insights sink only when telemetry is actually configured.
                // Test hosts (and any environment without App Insights) strip
                // TelemetryConfiguration, so requiring it would break host startup.
                var telemetryConfiguration = provider.GetService<TelemetryConfiguration>();
                if (telemetryConfiguration is not null)
                    loggerConfiguration.WriteTo.ApplicationInsights(
                        telemetryConfiguration,
                        TelemetryConverter.Traces
                    );
            }
        );

        return services;
    }
}
