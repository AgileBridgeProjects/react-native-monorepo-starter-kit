using FluentAssertions;
using StarterKit.Core.Auth.Mappers;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Core.Tests.Auth;

public sealed class UserMapperTests
{
    private static UserEntity MakeUser(params RoleEntity[] roles)
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = "auth-id",
            ClubId = Guid.NewGuid(),
            Email = "user@example.com",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow,
        };
        user.UserRoles = roles
            .Select(role => new UserRoleAssignmentEntity
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                RoleId = role.Id,
                Role = role,
            })
            .ToList();
        return user;
    }

    private static RoleEntity MakeRole(
        string name = "SomeRole",
        bool requiresOnboarding = false,
        bool isPortalRole = false
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            RequiresOnboarding = requiresOnboarding,
            IsPortalRole = isPortalRole,
        };

    [Fact]
    public void ToModel_UserWithAthleteRole_SetsOnboardingRoleToAthlete()
    {
        var entity = MakeUser(MakeRole("Athlete", requiresOnboarding: true));

        var model = entity.ToModel();

        model.OnboardingRole.Should().Be("Athlete");
    }

    [Fact]
    public void ToModel_UserWithCoachRole_SetsOnboardingRoleToCoach()
    {
        // Regression guard: this must resolve to the role's own name, not a hardcoded
        // "Athlete" — Coach/Parent/Director each get their own onboarding flow.
        var entity = MakeUser(MakeRole("Coach", requiresOnboarding: true));

        var model = entity.ToModel();

        model.OnboardingRole.Should().Be("Coach");
    }

    [Fact]
    public void ToModel_UserWithNoRoleRequiringOnboarding_SetsOnboardingRoleNull()
    {
        var entity = MakeUser(MakeRole(), MakeRole("ClubAdmin", isPortalRole: true));

        var model = entity.ToModel();

        model.OnboardingRole.Should().BeNull();
    }

    [Fact]
    public void ToModel_UserWithNoRoles_SetsOnboardingRoleNull()
    {
        var entity = MakeUser();

        var model = entity.ToModel();

        model.OnboardingRole.Should().BeNull();
    }
}
