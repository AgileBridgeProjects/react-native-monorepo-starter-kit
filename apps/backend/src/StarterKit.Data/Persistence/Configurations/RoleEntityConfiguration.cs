using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Persistence.Configurations;

internal sealed class RoleEntityConfiguration : IEntityTypeConfiguration<RoleEntity>
{
    public void Configure(EntityTypeBuilder<RoleEntity> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Name).IsRequired().HasMaxLength(64);
        builder.Property(r => r.Description).HasMaxLength(500);
        builder.Property(r => r.IsActive).HasDefaultValue(true);
        builder.HasIndex(r => r.Name).IsUnique();
        builder.Property(r => r.IsElevated).IsRequired().HasDefaultValue(false);
        builder.Property(r => r.IsPortalRole).IsRequired().HasDefaultValue(false);
        builder.Property(r => r.IsSystem).IsRequired().HasDefaultValue(false);
        builder.Property(r => r.IsDefault).IsRequired().HasDefaultValue(false);
        builder.Property(r => r.RequiresOnboarding).IsRequired().HasDefaultValue(false);
        builder
            .HasIndex(r => r.IsDefault)
            .IsUnique()
            .HasFilter("\"IsDefault\" = true")
            .HasDatabaseName("UX_Roles_IsDefault");
        builder
            .HasOne<StarterKit.Data.Clubs.Models.Club>()
            .WithMany()
            .HasForeignKey(r => r.ClubId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(r => r.ClubId);
    }
}
