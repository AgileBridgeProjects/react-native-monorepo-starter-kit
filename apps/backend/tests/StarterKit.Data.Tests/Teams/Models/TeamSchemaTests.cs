using FluentAssertions;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Tests.Teams.Models;

public abstract class TeamSchemaTests
{
    protected static Team CreateTeam() =>
        new()
        {
            Id = Guid.NewGuid(),
            SeasonId = Guid.NewGuid(),
            Name = "Learning",
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class Properties : TeamSchemaTests
    {
        [Fact]
        public void CreateTeam_WithRequiredProperties_HasExpectedValues()
        {
            var entity = CreateTeam();

            entity.Id.Should().NotBeEmpty();
            entity.SeasonId.Should().NotBeEmpty();
            entity.Name.Should().Be("Learning");
            entity.IsDeleted.Should().BeFalse();
        }
    }
}
