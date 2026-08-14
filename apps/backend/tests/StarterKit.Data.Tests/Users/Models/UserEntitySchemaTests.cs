using FluentAssertions;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Tests.Users.Models;

public abstract class UserEntitySchemaTests
{
    protected static UserEntity CreateUser() =>
        new()
        {
            Id = Guid.NewGuid(),
            ClubId = Guid.NewGuid(),
            ExternalAuthId = "auth0|12345",
            Email = "user@example.com",
            DisplayName = "John Doe",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class Properties : UserEntitySchemaTests
    {
        [Fact]
        public void CreateUser_WithRequiredProperties_HasExpectedValues()
        {
            var entity = CreateUser();

            entity.Id.Should().NotBeEmpty();
            entity.ClubId.Should().NotBeEmpty();
            entity.Email.Should().Be("user@example.com");
            entity.DisplayName.Should().Be("John Doe");
            entity.IsActive.Should().BeTrue();
            entity.IsDeleted.Should().BeFalse();
        }
    }
}
