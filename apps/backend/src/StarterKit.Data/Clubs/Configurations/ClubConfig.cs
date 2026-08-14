using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Clubs.Models;

namespace StarterKit.Data.Clubs.Configurations;

internal sealed class ClubConfig : IEntityTypeConfiguration<Club>
{
    public void Configure(EntityTypeBuilder<Club> builder)
    {
        builder.ToTable("Clubs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.StreetAddress).IsRequired().HasMaxLength(200);
        builder.Property(x => x.City).IsRequired().HasMaxLength(100);
        builder.Property(x => x.State).IsRequired().HasMaxLength(2);
        builder.Property(x => x.ZipCode).HasMaxLength(10);
        builder.Property(x => x.Timezone).HasMaxLength(100);
        builder.Property(x => x.MaxAthletes);
        builder.Property(x => x.LogoUrl).HasMaxLength(2048);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
    }
}
