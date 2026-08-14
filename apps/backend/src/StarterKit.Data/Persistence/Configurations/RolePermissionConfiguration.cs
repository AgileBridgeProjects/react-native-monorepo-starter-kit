using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Persistence.Configurations;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermissionEntity>
{
    public void Configure(EntityTypeBuilder<RolePermissionEntity> builder)
    {
        builder.HasKey(rp => rp.Id);

        builder.Property(rp => rp.Permission).IsRequired().HasMaxLength(128);

        builder
            .HasIndex(rp => new { rp.RoleId, rp.Permission })
            .IsUnique()
            .HasDatabaseName("IX_RolePermissions_RoleId_Permission");

        builder
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
