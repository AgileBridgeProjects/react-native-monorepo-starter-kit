using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Configurations;

internal sealed class UserLeaveRecordConfig : IEntityTypeConfiguration<UserLeaveRecord>
{
    public void Configure(EntityTypeBuilder<UserLeaveRecord> builder)
    {
        builder.ToTable("UserLeaveRecords");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.ClubId).IsRequired();
        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.EndDate).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        // A user can have multiple (non-overlapping) leave periods, so this is not unique.
        builder.HasIndex(x => new { x.UserId, x.ClubId });
        // Drives the per-date refresh-job lookup (date within [StartDate, EndDate]).
        builder.HasIndex(x => new
        {
            x.ClubId,
            x.StartDate,
            x.EndDate,
        });
    }
}
