using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Data.Notifications.Configurations;

internal sealed class NotificationMessageConfig : IEntityTypeConfiguration<NotificationMessage>
{
    public void Configure(EntityTypeBuilder<NotificationMessage> builder)
    {
        builder.ToTable("NotificationMessages");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.Subject).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Message).IsRequired().HasColumnType("text");
        builder.Property(x => x.Status).IsRequired().HasConversion<string>().HasMaxLength(50);
        builder.Property(x => x.Channel).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder.Property(x => x.ClubId).IsRequired();
        builder.Property(x => x.TeamId);
        builder.Property(x => x.BackgroundJobId).HasMaxLength(100);

        builder
            .Property(x => x.Attachments)
            .HasColumnType("text")
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                v =>
                    JsonSerializer.Deserialize<List<StoredAttachment>>(
                        v,
                        JsonSerializerOptions.Default
                    ) ?? new List<StoredAttachment>()
            )
            .Metadata.SetValueComparer(
                new ValueComparer<List<StoredAttachment>>(
                    (a, b) =>
                        JsonSerializer.Serialize(a, JsonSerializerOptions.Default)
                        == JsonSerializer.Serialize(b, JsonSerializerOptions.Default),
                    c => c.Aggregate(0, (hash, att) => HashCode.Combine(hash, att.GetHashCode())),
                    c => c.ToList()
                )
            );

        builder.Property(x => x.MediaUrl).HasMaxLength(2048);
        builder.Property(x => x.SentBy).HasMaxLength(450);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
    }
}
