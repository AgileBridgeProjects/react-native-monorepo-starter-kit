using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Persistence.Configurations;

internal sealed class UserSetupTokenConfiguration : IEntityTypeConfiguration<UserSetupTokenEntity>
{
    public void Configure(EntityTypeBuilder<UserSetupTokenEntity> builder)
    {
        builder.ToTable("UserSetupTokens");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.TokenHash).IsRequired().HasMaxLength(64);
        builder.Property(x => x.TempPasswordHash).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ExpiresAt).IsRequired();
        builder
            .Property(x => x.Purpose)
            .IsRequired()
            .HasDefaultValue(SetupTokenPurpose.AccountSetup)
            .HasConversion<int>();
        builder.Property(x => x.IsInvalidated).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).IsRequired();

        builder
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Fast lookup by hashed token — the primary query path.
        builder
            .HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("IX_UserSetupTokens_TokenHash");

        // Efficient lookup of pending tokens for a given user (resend flow).
        builder.HasIndex(x => x.UserId).HasDatabaseName("IX_UserSetupTokens_UserId");

        // Compound index to optimise GetSetupStatusBulkAsync, which filters by
        // (UserId IN (...), Purpose, UsedAt IS NULL / IS NOT NULL).
        builder
            .HasIndex(x => new
            {
                x.UserId,
                x.Purpose,
                x.UsedAt,
            })
            .HasDatabaseName("IX_UserSetupTokens_UserId_Purpose_UsedAt");
    }
}
