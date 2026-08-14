using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace StarterKit.Data.Auditing;

internal sealed class AuditLogConfig : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.EntityName).IsRequired().HasMaxLength(200);
        builder.Property(x => x.EntityId).IsRequired().HasMaxLength(100);
        builder.Property(x => x.Action).IsRequired().HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.OldValues).HasColumnType("text");
        builder.Property(x => x.NewValues).HasColumnType("text");
        builder.Property(x => x.UserId).HasMaxLength(100);
        builder.Property(x => x.Timestamp).IsRequired();

        // Efficient querying by entity (admin UI) and by time (retention management).
        builder
            .HasIndex(x => new { x.EntityName, x.EntityId })
            .HasDatabaseName("IX_AuditLogs_EntityName_EntityId");
        builder.HasIndex(x => x.Timestamp).HasDatabaseName("IX_AuditLogs_Timestamp");
    }
}
