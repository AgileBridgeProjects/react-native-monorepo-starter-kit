using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Configurations;

internal sealed class DailyClubSnapshotConfig : IEntityTypeConfiguration<DailyClubSnapshot>
{
    public void Configure(EntityTypeBuilder<DailyClubSnapshot> builder)
    {
        builder.ToTable("DailyClubSnapshots");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.ClubId).IsRequired();
        builder.Property(x => x.Date).IsRequired();
        builder.Property(x => x.TotalAssignedPlayers).IsRequired();
        builder.Property(x => x.TotalActivePlayers).IsRequired();
        builder.Property(x => x.TotalSessions).IsRequired();
        builder.Property(x => x.TotalCorrectAnswers).IsRequired();
        builder.Property(x => x.TotalAnswers).IsRequired();
        builder.Property(x => x.AverageAccuracy).IsRequired().HasPrecision(5, 2);
        builder.Property(x => x.TotalCompletions).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasIndex(x => new { x.ClubId, x.Date }).IsUnique();
        builder.HasIndex(x => x.Date);
    }
}
