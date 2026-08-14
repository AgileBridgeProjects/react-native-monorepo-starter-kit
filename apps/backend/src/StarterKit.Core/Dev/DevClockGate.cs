using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace StarterKit.Core.Dev;

/// <summary>
/// Decides whether the current process is an actual local developer machine, as opposed to any
/// deployed Azure slot — even one whose <c>ASPNETCORE_ENVIRONMENT</c> is (deliberately or
/// accidentally) set to <c>Development</c>. Originally added to gate
/// <see cref="DevClockTimeProvider"/>; also used to gate anything else that must never
/// be reachable on a shared, deployed instance regardless of its environment name — e.g. the
/// Hangfire dashboard, which has no built-in authorization.
/// </summary>
public static class DevClockGate
{
    /// <summary>
    /// True only on an actual local developer machine. Requires both:
    /// <list type="bullet">
    /// <item><description><c>IsDevelopment()</c> — excludes Testing/Staging/Production</description></item>
    /// <item><description>no <c>WEBSITE_SITE_NAME</c> — Azure App Service always sets this env var
    /// for every deployed slot, regardless of its configured ASPNETCORE_ENVIRONMENT. This is
    /// defense-in-depth: a slot accidentally (or, per the identity split, deliberately) configured as
    /// "Development" must never expose local-only behavior to every user hitting a shared,
    /// deployed instance.</description></item>
    /// </list>
    /// </summary>
    public static bool IsLocalDevelopment(
        IHostEnvironment environment,
        IConfiguration configuration
    ) => environment.IsDevelopment() && string.IsNullOrEmpty(configuration["WEBSITE_SITE_NAME"]);
}
