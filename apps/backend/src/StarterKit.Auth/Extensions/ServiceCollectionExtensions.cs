using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Authorization;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Handlers;
using StarterKit.Auth.Interfaces;
using StarterKit.Auth.Middleware;
using StarterKit.Auth.Options;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Services;
using StarterKit.Auth.Transformers;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;
using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence;

namespace StarterKit.Auth.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddStarterKitAuth(this IServiceCollection services)
    {
        // ICurrentSession reads from IHttpContextAccessor; registered as Scoped (per-request)
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentSession, CurrentSession>();

        // ITenantContext bridges ICurrentSession → AppDbContext for global query filters.
        services.AddScoped<ITenantContext, CurrentTenantContext>();

        // IAuditUserContext bridges ICurrentSession → EF Core audit interceptors.
        services.AddScoped<IAuditUserContext, CurrentAuditUserContext>();

        // ── Supabase (GoTrue) options ────────────────────────────────────────
        // Required secrets are only validated when Enabled is true, so the app boots cleanly
        // in envs (tests) that run with Supabase:Enabled = false.
        services
            .AddOptions<SupabaseOptions>()
            .BindConfiguration(SupabaseOptions.SectionName)
            .Validate(
                o => !o.Enabled || !string.IsNullOrWhiteSpace(o.JwtSecret),
                "Supabase:JwtSecret is required when Supabase:Enabled is true."
            )
            .Validate(
                o => !o.Enabled || !string.IsNullOrWhiteSpace(o.ApiExternalUrl),
                "Supabase:ApiExternalUrl is required when Supabase:Enabled is true."
            )
            .ValidateOnStart();

        // Expose the resolved options value for constructor injection (GoTrueAdminClient,
        // SupabaseAuthService) without every consumer taking IOptions<T>.
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<SupabaseOptions>>().Value);

        // Typed client for the GoTrue Admin API (service-role). Resolved only when Enabled.
        services.AddHttpClient<GoTrueAdminClient>();

        // Token validator — used by the auth handler and dev tooling.
        services.AddScoped<ISupabaseAuthService>(sp =>
        {
            var options = sp.GetRequiredService<SupabaseOptions>();
            if (!options.Enabled)
                return new NoOpSupabaseAuthService();

            return new SupabaseAuthService(
                options,
                sp.GetRequiredService<ILogger<SupabaseAuthService>>()
            );
        });

        // Admin-side services (set app_metadata / provision users). NoOp when disabled.
        services.AddScoped<IAuthClaimsService>(sp =>
        {
            var options = sp.GetRequiredService<SupabaseOptions>();
            if (!options.Enabled)
                return new NoOpAuthClaimsService(
                    sp.GetRequiredService<ILogger<NoOpAuthClaimsService>>()
                );

            return new SupabaseAuthClaimsService(
                sp.GetRequiredService<GoTrueAdminClient>(),
                sp.GetRequiredService<ILogger<SupabaseAuthClaimsService>>()
            );
        });

        services.AddScoped<IAuthUserProvisioningService>(sp =>
        {
            var options = sp.GetRequiredService<SupabaseOptions>();
            if (!options.Enabled)
                return new NoOpAuthUserProvisioningService();

            return new SupabaseUserProvisioningService(sp.GetRequiredService<GoTrueAdminClient>());
        });

        // Claims transformation — loads roles/permissions from the DB into the principal.
        services.AddScoped<IClaimsTransformation, RoleClaimsTransformer>();

        // ISetupEmailService: sends via the configured email provider when Email:Enabled = true,
        // otherwise logs the link.
        services
            .AddOptions<EmailOptions>()
            .BindConfiguration(EmailOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddScoped<ISetupEmailService>(sp =>
        {
            var emailOptions = sp.GetRequiredService<IOptions<EmailOptions>>().Value;

            if (emailOptions.Enabled)
                return new SetupEmailService(sp.GetRequiredService<IEmailSender>());

            var env = sp.GetRequiredService<IHostEnvironment>();
            if (!env.IsDevelopment() && !env.IsEnvironment("Testing"))
                throw new InvalidOperationException(
                    "Email:Enabled is false but the current environment is not Development or Testing. "
                        + "Set Email:Enabled = true and configure the API key to prevent setup links being logged as plaintext."
                );

            return new NoOpSetupEmailService();
        });

        // Single authentication scheme — Supabase (GoTrue) is the sole provider.
        services
            .AddAuthentication(AuthSchemes.Supabase)
            .AddScheme<AuthenticationSchemeOptions, SupabaseAuthHandler>(
                AuthSchemes.Supabase,
                _ => { }
            );

        // Register authorization handlers
        services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
        services.AddSingleton<IAuthorizationHandler, ClubMemberHandler>();

        // Auto-register one policy per permission constant.
        services.AddAuthorization(options =>
        {
            foreach (var permission in StarterKitPermissions.All)
            {
                options.AddPolicy(
                    permission,
                    policy =>
                    {
                        policy.RequireAuthenticatedUser();
                        policy.Requirements.Add(new PermissionRequirement(permission));
                        policy.Requirements.Add(new ClubMemberRequirement());
                    }
                );
            }
        });

        return services;
    }

    public static IApplicationBuilder UseStarterKitAuth(this IApplicationBuilder app)
    {
        app.UseAuthentication();
        app.UseMiddleware<ImpersonationMiddleware>();
        app.UseMiddleware<OrgSwitchMiddleware>();
        app.UseMiddleware<DisabledUserMiddleware>();
        app.UseAuthorization();

        return app;
    }
}
