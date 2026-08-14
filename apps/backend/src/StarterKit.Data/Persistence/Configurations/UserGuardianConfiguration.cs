using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Persistence.Configurations;

internal sealed class UserGuardianConfiguration : IEntityTypeConfiguration<UserGuardianEntity>
{
    public void Configure(EntityTypeBuilder<UserGuardianEntity> builder)
    {
        builder.ToTable("UserGuardians");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.Relationship).HasConversion<string>().HasMaxLength(100);

        // Partial index — excludes soft-deleted rows so a guardian link can be re-added after
        // removal without violating uniqueness (mirrors Team's own IX_Teams_SeasonId_Name pattern).
        builder
            .HasIndex(x => new { x.GuardianId, x.DependentId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false")
            .HasDatabaseName("UX_UserGuardians_GuardianId_DependentId");

        // NoAction (not Cascade) on both FKs: both point at UserEntity, so a Cascade here would
        // create two cascade paths from Users to this table, which the database rejects. Unlike
        // UserTeam (Cascade — a team/user pair only ever needs one side removed), a hard-deleted
        // Guardian or Dependent user is expected to go through soft-delete, not FK cascade cleanup.
        builder
            .HasOne(x => x.Guardian)
            .WithMany(x => x.Dependents)
            .HasForeignKey(x => x.GuardianId)
            .OnDelete(DeleteBehavior.NoAction);

        builder
            .HasOne(x => x.Dependent)
            .WithMany(x => x.Guardians)
            .HasForeignKey(x => x.DependentId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
