using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Seasons.Models;

namespace StarterKit.Data.Seasons.Configurations;

internal sealed class SeasonConfig : IEntityTypeConfiguration<Season>
{
    public void Configure(EntityTypeBuilder<Season> builder)
    {
        builder.ToTable("Seasons");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.ClubId).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100);
        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.EndDate).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);

        builder
            .HasIndex(x => new
            {
                x.ClubId,
                x.StartDate,
                x.EndDate,
            })
            .HasDatabaseName("IX_Seasons_ClubId_StartDate_EndDate");

        builder
            .HasOne(x => x.Club)
            .WithMany()
            .HasForeignKey(x => x.ClubId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
