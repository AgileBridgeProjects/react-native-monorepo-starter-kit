using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Configurations;

internal sealed class SnapshotBackfillRunConfig : IEntityTypeConfiguration<SnapshotBackfillRun>
{
    public void Configure(EntityTypeBuilder<SnapshotBackfillRun> builder)
    {
        builder.ToTable("SnapshotBackfillRuns");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Date).IsRequired();
        builder.Property(x => x.StartedAt).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasIndex(x => x.Date).IsUnique();
    }
}
