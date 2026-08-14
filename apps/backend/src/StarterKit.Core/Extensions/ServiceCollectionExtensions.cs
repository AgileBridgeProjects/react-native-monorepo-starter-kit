using Mediator;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.Core.Auditing.Options;
using StarterKit.Core.Auditing.Services;
using StarterKit.Core.Caching;
using StarterKit.Core.Caching.Interfaces;
using StarterKit.Core.Caching.Options;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Notifications.Extensions;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Core.PushNotifications.Jobs;
using StarterKit.Core.PushNotifications.Options;
using StarterKit.Core.PushNotifications.Services;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Core.Reports.Services;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.Core.Resources.Services;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.Core.Roles.Services;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Core.Seasons.Services;
using StarterKit.Core.Services;
using StarterKit.Core.Shared.Events;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.Core.Teams.Services;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Core.Users.Services;
using StarterKit.Data.Extensions;

namespace StarterKit.Core.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddStarterKitCore(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Wire up the data layer — APIs never call this directly
        services.AddStarterKitData();

        // Register core services
        services.AddSingleton<
            IUserBulkUploadExcelParserService,
            UserBulkUploadExcelParserService
        >();
        services.AddSingleton<IUserExportExcelService, UserExportExcelService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IClubService, ClubService>();
        services.AddScoped<ISeasonService, SeasonService>();
        services.AddScoped<ITeamService, TeamService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services
            .AddOptions<AuditLogRetentionOptions>()
            .BindConfiguration(AuditLogRetentionOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddScoped<IResourceService, ResourceService>();

        services
            .AddOptions<StarterKit.Core.Storage.ImageUploadOptions>()
            .BindConfiguration(StarterKit.Core.Storage.ImageUploadOptions.SectionName);
        services
            .AddOptions<StarterKit.Core.Storage.LogoUploadOptions>()
            .BindConfiguration(StarterKit.Core.Storage.LogoUploadOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services
            .AddOptions<StarterKit.Core.Storage.MediaUploadOptions>()
            .BindConfiguration(StarterKit.Core.Storage.MediaUploadOptions.SectionName);
        services
            .AddOptions<StarterKit.Core.Reports.Options.ReportExportOptions>()
            .BindConfiguration(StarterKit.Core.Reports.Options.ReportExportOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddScoped<StarterKit.Core.Reports.Jobs.PurgeStaleReportExportsJob>();
        services
            .AddOptions<AccountSetupOptions>()
            .BindConfiguration(AccountSetupOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<UserServiceOptions>().BindConfiguration(UserServiceOptions.SectionName);

        // Named HTTP client for seeding OAuth avatar images from external providers.
        // No retry — a failed avatar seed is non-critical (caught and logged in UserService).
        services
            .AddHttpClient("avatar-seed")
            .ConfigureHttpClient(c => c.Timeout = TimeSpan.FromSeconds(10));

        // Distributed cache (in-memory now; swap AddDistributedMemoryCache → AddStackExchangeRedisCache
        // for multi-instance. When doing so, also add the SignalR Redis backplane:
        // builder.Services.AddSignalR().AddStackExchangeRedis(connectionString)
        services.AddDistributedMemoryCache();
        services
            .AddOptions<CacheOptions>()
            .BindConfiguration(CacheOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<ICacheService, DistributedCacheService>();

        // Mediator (source-generated) — domain events
        services.AddMediator(options => options.ServiceLifetime = ServiceLifetime.Scoped);
        services.AddScoped<IDomainEventPublisher, DomainEventPublisher>();

        // Notification channels (Resend + Twilio)
        services.AddStarterKitNotifications(configuration);

        // Push notifications — Expo Push (iOS + Android) + Huawei HMS. No Firebase SDK.
        services.AddOptions<ExpoPushOptions>().BindConfiguration(ExpoPushOptions.SectionName);
        services.AddOptions<HmsPushOptions>().BindConfiguration(HmsPushOptions.SectionName);
        services.AddSingleton<IPushSender, ExpoPushSender>();
        services.AddSingleton<IPushSender, HmsPushSender>();
        // Default no-op broadcaster — MobileApi overrides this with SignalRNotificationBroadcaster.
        services.AddScoped<INotificationBroadcaster, NoOpNotificationBroadcaster>();
        services.AddScoped<IPushNotificationsService, PushNotificationsService>();
        services.AddScoped<PushNotificationSweepJob>();
        services.AddScoped<IContentAssignedDispatchJob, ContentAssignedDispatchJob>();

        // Reports (club/team/user snapshot reporting only)
        services.AddScoped<IReportService, ReportService>();
        services.AddSingleton<IReportExcelService, ReportExcelService>();
        services.AddScoped<IReportSnapshotRefreshService, ReportSnapshotRefreshJob>();
        services.AddScoped<StartupSnapshotBackfillJob>();
        services.AddScoped<IReportExportBroadcaster, NoOpReportExportBroadcaster>();

        services.AddHttpClient("HmsPush", c => c.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient("ExpoPush", c => c.Timeout = TimeSpan.FromSeconds(15));

        return services;
    }
}
