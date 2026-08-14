using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.PushNotifications.Models;

namespace StarterKit.Data.PushNotifications.Configurations;

internal sealed class PushNotificationConfiguration : IEntityTypeConfiguration<PushNotification>
{
    public void Configure(EntityTypeBuilder<PushNotification> builder)
    {
        builder.ToTable("PushNotifications");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.UserId).IsRequired();
        builder
            .Property(x => x.NotificationType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Body).IsRequired();
        builder.Property(x => x.IsRead).IsRequired().HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).IsRequired();

        builder
            .HasOne<UserEntity>(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index for sweep job query — pending pushes per user
        builder
            .HasIndex(x => new
            {
                x.UserId,
                x.PushSentAt,
                x.SeenAt,
            })
            .HasDatabaseName("IX_PushNotifications_Sweep");
    }
}
