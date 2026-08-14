using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Configurations;

internal sealed class UserReportingExclusionConfig
    : IEntityTypeConfiguration<UserReportingExclusion>
{
    public void Configure(EntityTypeBuilder<UserReportingExclusion> builder)
    {
        builder.ToTable("UserReportingExclusions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.ClubId).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasIndex(x => new { x.UserId, x.ClubId }).IsUnique();
        builder.HasIndex(x => x.ClubId);
    }
}
