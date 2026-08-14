using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.AccountSetup.Repositories;
using StarterKit.Data.Auditing;
using StarterKit.Data.Auditing.Interfaces.Repositories;
using StarterKit.Data.Auditing.Repositories;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Repositories;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.Data.DeviceTokens.Repositories;
using StarterKit.Data.Infrastructure;
using StarterKit.Data.Interfaces;
using StarterKit.Data.Notifications.Interfaces.Repositories;
using StarterKit.Data.Notifications.Repositories;
using StarterKit.Data.Options;
using StarterKit.Data.Persistence;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.Data.PushNotifications.Repositories;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Repositories;
using StarterKit.Data.Resources.Interfaces.Repositories;
using StarterKit.Data.Resources.Repositories;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Repositories;
using StarterKit.Data.Seasons.Interfaces.Repositories;
using StarterKit.Data.Seasons.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Repositories;
using StarterKit.Data.Users.Interfaces.Repositories;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Data.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddStarterKitData(this IServiceCollection services)
    {
        services
            .AddOptions<SqlResilienceOptions>()
            .BindConfiguration(SqlResilienceOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Interceptors are registered as Scoped to share the same lifetime as IAuditUserContext
        // (which is per-request). EF Core resolves interceptors from the factory lambda's
        // scoped IServiceProvider, so Scoped registration is correct here.
        services.AddScoped<AuditInterceptor>();
        services.AddScoped<AuditLogInterceptor>();
        services.AddScoped<IDbExecutionStrategy, DbExecutionStrategy>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IUserSetupTokenRepository, UserSetupTokenRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IClubRepository, ClubRepository>();
        services.AddScoped<ISeasonRepository, SeasonRepository>();
        services.AddScoped<ITeamRepository, TeamRepository>();
        services.AddScoped<IResourceRepository, ResourceRepository>();
        services.AddScoped<INotificationMessageRepository, NotificationMessageRepository>();
        services.AddScoped<IDeviceTokenRepository, DeviceTokenRepository>();
        services.AddScoped<IPushNotificationRepository, PushNotificationRepository>();
        services.AddScoped<IReportSnapshotRepository, ReportSnapshotRepository>();
        services.AddScoped<IUserReportingExclusionRepository, UserReportingExclusionRepository>();
        services.AddScoped<IUserLeaveRecordRepository, UserLeaveRecordRepository>();

        services.AddDbContext<AppDbContext>(
            (sp, options) =>
            {
                var configuration = sp.GetRequiredService<IConfiguration>();
                var connectionString =
                    configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException(
                        "DefaultConnection connection string is not configured."
                    );

                var resilience = sp.GetRequiredService<IOptions<SqlResilienceOptions>>().Value;

                options.UseNpgsql(
                    connectionString,
                    npgsql =>
                    {
                        npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                        npgsql.EnableRetryOnFailure(
                            maxRetryCount: resilience.MaxRetries,
                            maxRetryDelay: resilience.MaxRetryDelay,
                            errorCodesToAdd: null
                        );
                    }
                );

                options.AddInterceptors(
                    sp.GetRequiredService<AuditInterceptor>(),
                    sp.GetRequiredService<AuditLogInterceptor>()
                );
            },
            optionsLifetime: ServiceLifetime.Scoped
        );

        return services;
    }
}
