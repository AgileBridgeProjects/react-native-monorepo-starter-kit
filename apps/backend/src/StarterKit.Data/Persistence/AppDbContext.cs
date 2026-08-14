using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.DeviceTokens.Models;
using StarterKit.Data.Notifications.Models;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.PushNotifications.Models;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Resources.Models;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Persistence;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    /// <param name="options">EF Core options (connection string, resilience, etc.)</param>
    /// <param name="tenantContext">
    /// Tenant context used by global query filters. When omitted (design-time factory,
    /// tests, migrator) a <see cref="NullTenantContext"/> is used, which sets
    /// <c>IsActive = false</c> and disables all tenant filtering.
    /// In production the DI container injects <c>CurrentTenantContext</c> backed
    /// by <c>ICurrentSession</c>.
    /// </param>
    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ITenantContext? tenantContext = null
    )
        : base(options)
    {
        _tenantContext = tenantContext ?? NullTenantContext.Instance;
    }

    /// <summary>
    /// No-op <see cref="ITenantContext"/> used when no tenant is in scope
    /// (design-time factory, background jobs, tests). All query filters are
    /// bypassed because <see cref="IsActive"/> is <c>false</c>.
    /// </summary>
    private sealed class NullTenantContext : ITenantContext
    {
        public static readonly NullTenantContext Instance = new();

        private NullTenantContext() { }

        public Guid? ClubId => null;
        public bool IsActive => false;
    }

    public DbSet<Club> Clubs => Set<Club>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<RoleEntity> Roles => Set<RoleEntity>();
    public DbSet<UserRoleAssignmentEntity> UserRoleAssignments => Set<UserRoleAssignmentEntity>();
    public DbSet<RolePermissionEntity> RolePermissions => Set<RolePermissionEntity>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserSetupTokenEntity> UserSetupTokens => Set<UserSetupTokenEntity>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<NotificationMessage> NotificationMessages => Set<NotificationMessage>();
    public DbSet<DeviceToken> DeviceTokens => Set<DeviceToken>();
    public DbSet<PushNotification> PushNotifications => Set<PushNotification>();
    public DbSet<DailyClubSnapshot> DailyClubSnapshots => Set<DailyClubSnapshot>();
    public DbSet<DailyTeamSnapshot> DailyTeamSnapshots => Set<DailyTeamSnapshot>();
    public DbSet<SnapshotBackfillRun> SnapshotBackfillRuns => Set<SnapshotBackfillRun>();
    public DbSet<UserReportingExclusion> UserReportingExclusions => Set<UserReportingExclusion>();
    public DbSet<UserLeaveRecord> UserLeaveRecords => Set<UserLeaveRecord>();
    public DbSet<UserTeam> UserTeams => Set<UserTeam>();
    public DbSet<UserGuardianEntity> UserGuardians => Set<UserGuardianEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyMultitenancyFilters(modelBuilder);
        ApplySoftDeleteFilters(modelBuilder);
        ApplyConcurrencyTokens(modelBuilder);
        ApplyAuditFieldConventions(modelBuilder);
    }

    /// <summary>
    /// Applies global query filters to all tenant-scoped entities.
    ///
    /// Filter logic (evaluated per-query): when <see cref="ITenantContext.IsActive"/> is
    /// <c>false</c> (background jobs, unauthenticated requests, migrator, tests) the filter
    /// is a no-op and all rows are visible. When active, only rows whose
    /// <c>ClubId</c> matches the current tenant are returned.
    ///
    /// Callers that need cross-tenant access in trusted contexts (admin, seeder, background
    /// read-all) must explicitly call <c>.IgnoreQueryFilters()</c> on their query.
    /// </summary>
    private void ApplyMultitenancyFilters(ModelBuilder modelBuilder)
    {
        modelBuilder
            .Entity<Season>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );

        modelBuilder
            .Entity<Team>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.Season.ClubId == _tenantContext.ClubId)
                && !e.IsDeleted
            );

        modelBuilder
            .Entity<UserEntity>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );

        modelBuilder
            .Entity<DailyClubSnapshot>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );

        modelBuilder
            .Entity<DailyTeamSnapshot>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );

        modelBuilder
            .Entity<UserReportingExclusion>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );

        modelBuilder
            .Entity<UserLeaveRecord>()
            .HasQueryFilter(e =>
                (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted
            );
    }

    /// <summary>
    /// Applies <c>IsDeleted = false</c> global query filters for all <see cref="ISoftDeletable"/>
    /// entities that are NOT already filtered in <see cref="ApplyMultitenancyFilters"/> (those
    /// combine both filters in one expression to satisfy EF Core's one-filter-per-entity rule).
    /// </summary>
    private static void ApplySoftDeleteFilters(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Club>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Resource>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NotificationMessage>().HasQueryFilter(e => !e.IsDeleted);
        // Not tenant-scoped — one run record per calendar day covers every club's snapshots.
        modelBuilder.Entity<SnapshotBackfillRun>().HasQueryFilter(e => !e.IsDeleted);

        // Membership joins. Both are ISoftDeletable, so removing a link (ReplaceUserTeamsAsync /
        // ReplaceGuardianLinksAsync) leaves the row in place with IsDeleted = true — without these
        // filters every membership read counts removed links, and the "already exists" checks in
        // AddUserTeamsAsync/AddGuardianLinksAsync treat a removed link as present and silently skip
        // re-adding it. Their partial unique indexes are filtered on IsDeleted = false for exactly
        // this reason: a re-added link inserts a fresh row alongside the tombstone.
        // Neither carries a ClubId (pure joins, like TeamCalendarEvent above) — tenant scoping comes
        // transitively from UserEntity/Team on any query that joins through them.
        modelBuilder.Entity<UserTeam>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<UserGuardianEntity>().HasQueryFilter(e => !e.IsDeleted);
    }

    /// <summary>
    /// Applies PostgreSQL's <c>xmin</c> system column as the optimistic-concurrency token
    /// globally for all <see cref="IConcurrent"/> entities. Any
    /// <see cref="Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException"/> is caught by
    /// the global exception handler and mapped to HTTP 409.
    /// </summary>
    private static void ApplyConcurrencyTokens(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(IConcurrent).IsAssignableFrom(entityType.ClrType))
                continue;

            // Map PostgreSQL's system "xmin" column as a shadow rowversion concurrency token.
            // Equivalent to the generic UseXminAsConcurrencyToken() extension, but usable from
            // the non-generic ModelBuilder.Entity(Type) loop.
            modelBuilder
                .Entity(entityType.ClrType)
                .Property<uint>("xmin")
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();
        }
    }

    /// <summary>
    /// Enforces a uniform max-length on audit user-identifier columns for every entity
    /// that implements <see cref="IAuditable"/> or <see cref="ISoftDeletable"/>.
    /// The columns store the string representation of an internal-user Guid (36 chars).
    /// Applying this once here avoids per-configuration repetition.
    /// </summary>
    private static void ApplyAuditFieldConventions(ModelBuilder modelBuilder)
    {
        const int UserIdMaxLength = 36;

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(IAuditable).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder
                    .Entity(entityType.ClrType)
                    .Property(nameof(IAuditable.CreatedBy))
                    .HasMaxLength(UserIdMaxLength);

                modelBuilder
                    .Entity(entityType.ClrType)
                    .Property(nameof(IAuditable.UpdatedBy))
                    .HasMaxLength(UserIdMaxLength);
            }

            if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder
                    .Entity(entityType.ClrType)
                    .Property(nameof(ISoftDeletable.DeletedBy))
                    .HasMaxLength(UserIdMaxLength);
            }
        }
    }
}
