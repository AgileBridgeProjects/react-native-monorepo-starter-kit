using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Teams.Configurations;

internal sealed class UserTeamConfig : IEntityTypeConfiguration<UserTeam>
{
    public void Configure(EntityTypeBuilder<UserTeam> builder)
    {
        builder.ToTable("UserTeams");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);

        // Partial index — excludes soft-deleted rows so a team can be re-added after removal
        // without violating uniqueness (mirrors Team's own IX_Teams_SeasonId_Name pattern).
        builder
            .HasIndex(x => new { x.UserId, x.TeamId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false")
            .HasDatabaseName("UX_UserTeams_UserId_TeamId");

        builder
            .HasOne(x => x.User)
            .WithMany(x => x.UserTeams)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(x => x.Team)
            .WithMany()
            .HasForeignKey(x => x.TeamId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
