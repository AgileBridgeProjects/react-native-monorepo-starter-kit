using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Persistence.Configurations;

internal sealed class UserEntityConfiguration : IEntityTypeConfiguration<UserEntity>
{
    public void Configure(EntityTypeBuilder<UserEntity> builder)
    {
        builder.Property(x => x.PhoneNumber).HasMaxLength(20);

        builder.Property(x => x.Username).HasMaxLength(64);

        builder.Property(x => x.Position).HasConversion<string>().HasMaxLength(100);

        builder
            .HasIndex(x => x.Username)
            .IsUnique()
            .HasFilter("\"Username\" IS NOT NULL AND \"IsDeleted\" = false")
            .HasDatabaseName("UX_Users_Username");
    }
}
