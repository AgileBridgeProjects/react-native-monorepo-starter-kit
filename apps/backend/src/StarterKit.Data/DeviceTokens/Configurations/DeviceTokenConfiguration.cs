using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.DeviceTokens.Models;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.DeviceTokens.Configurations;

internal sealed class DeviceTokenConfiguration : IEntityTypeConfiguration<DeviceToken>
{
    public void Configure(EntityTypeBuilder<DeviceToken> builder)
    {
        builder.ToTable("DeviceTokens");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.Platform).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Token).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired();

        builder
            .HasOne<UserEntity>(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique: one token per (UserId, Platform, Token) triple
        builder
            .HasIndex(x => new
            {
                x.UserId,
                x.Platform,
                x.Token,
            })
            .IsUnique()
            .HasDatabaseName("IX_DeviceTokens_Unique");
    }
}
