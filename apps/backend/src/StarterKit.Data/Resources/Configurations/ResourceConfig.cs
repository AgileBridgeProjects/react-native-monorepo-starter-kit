using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Resources.Models;

namespace StarterKit.Data.Resources.Configurations;

internal sealed class ResourceConfig : IEntityTypeConfiguration<Resource>
{
    public void Configure(EntityTypeBuilder<Resource> builder)
    {
        builder.ToTable("Resources");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Title).IsRequired().HasMaxLength(255);
        builder.Property(x => x.SourceType).IsRequired().HasConversion<string>().HasMaxLength(50);
        builder.Property(x => x.StorageUrl).IsRequired().HasMaxLength(2048);
        builder
            .Property(x => x.MediaType)
            .IsRequired(false)
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
    }
}
