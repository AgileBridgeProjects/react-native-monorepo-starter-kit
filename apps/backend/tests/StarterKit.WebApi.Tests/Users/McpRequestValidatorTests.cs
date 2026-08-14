using FluentAssertions;
using StarterKit.Data.Clubs.Enums;
using StarterKit.WebApi.Users.DTOs;
using StarterKit.WebApi.Users.Mcp;
using ValidationException = StarterKit.Data.Exceptions.ValidationException;

namespace StarterKit.WebApi.Tests.Users;

/// <summary>
/// MCP tool calls bypass ASP.NET model binding, so the DataAnnotations that guard the REST
/// endpoints have to be run explicitly. These tests are what stop a rule from holding
/// over REST and silently not over MCP — the divergence docs/standards/backend/mcp.md forbids.
/// </summary>
public abstract class McpRequestValidatorTests
{
    private static AdminCreateUserRequest ParentRequest(IReadOnlyList<Guid>? dependentUserIds) =>
        new()
        {
            ClubId = Guid.NewGuid(),
            RoleName = "Parent",
            FirstName = "Pat",
            LastName = "Parent",
            AuthMethod = AuthenticationMethod.Credentials,
            Email = "pat.parent@example.com",
            DependentUserIds = dependentUserIds,
            // Coach's own linked-team rule would otherwise fire for this role too —
            // set so these Parent-focused tests only exercise the dependents rule.
            TeamIds = [Guid.NewGuid()],
        };

    private static AdminCreateUserRequest CoachRequest(IReadOnlyList<Guid>? teamIds) =>
        new()
        {
            ClubId = Guid.NewGuid(),
            RoleName = "Coach",
            FirstName = "Casey",
            LastName = "Coach",
            AuthMethod = AuthenticationMethod.Credentials,
            Email = "casey.coach@example.com",
            TeamIds = teamIds,
        };

    public sealed class EnsureValid_WithIValidatableObjectRules : McpRequestValidatorTests
    {
        [Fact]
        public void EnsureValid_WhenParentHasNoLinkedAthlete_ThrowsWithTheRuleMessage()
        {
            var act = () => McpRequestValidator.EnsureValid(ParentRequest(null));

            act.Should().Throw<ValidationException>().WithMessage("*at least one athlete*");
        }

        [Fact]
        public void EnsureValid_WhenParentHasAnEmptyDependentList_Throws()
        {
            var act = () => McpRequestValidator.EnsureValid(ParentRequest([]));

            act.Should().Throw<ValidationException>();
        }

        [Fact]
        public void EnsureValid_WhenParentHasOneLinkedAthlete_DoesNotThrow()
        {
            var act = () => McpRequestValidator.EnsureValid(ParentRequest([Guid.NewGuid()]));

            act.Should().NotThrow();
        }

        [Fact]
        public void EnsureValid_WhenRoleIsNotParent_DoesNotRequireDependents()
        {
            // TeamIds set so this only exercises the "not Parent" branch — Coach has its own
            // linked-team requirement, covered separately below.
            var act = () => McpRequestValidator.EnsureValid(CoachRequest([Guid.NewGuid()]));

            act.Should().NotThrow();
        }

        [Fact]
        public void EnsureValid_WhenCoachHasNoLinkedTeam_ThrowsWithTheRuleMessage()
        {
            var act = () => McpRequestValidator.EnsureValid(CoachRequest(null));

            act.Should().Throw<ValidationException>().WithMessage("*at least one team*");
        }

        [Fact]
        public void EnsureValid_WhenCoachHasAnEmptyTeamList_Throws()
        {
            var act = () => McpRequestValidator.EnsureValid(CoachRequest([]));

            act.Should().Throw<ValidationException>();
        }

        [Fact]
        public void EnsureValid_WhenCoachHasOneLinkedTeam_DoesNotThrow()
        {
            var act = () => McpRequestValidator.EnsureValid(CoachRequest([Guid.NewGuid()]));

            act.Should().NotThrow();
        }
    }

    public sealed class EnsureValid_WithAttributeRules : McpRequestValidatorTests
    {
        [Fact]
        public void EnsureValid_WhenAPropertyAttributeIsViolated_Throws()
        {
            // JerseyNumber carries [Range(0, 99)] — proves property-level attributes are
            // validated too, not just IValidatableObject.
            var request = new AdminCreateUserRequest
            {
                ClubId = Guid.NewGuid(),
                RoleName = "Athlete",
                FirstName = "Ali",
                LastName = "Athlete",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "ali.athlete@example.com",
                JerseyNumber = 100,
            };

            var act = () => McpRequestValidator.EnsureValid(request);

            act.Should().Throw<ValidationException>();
        }

        [Fact]
        public void EnsureValid_WhenUpdateRequestClearsAParentsAthletes_Throws()
        {
            var request = new UpdateUserRequest
            {
                RoleName = "Parent",
                FirstName = "Pat",
                LastName = "Parent",
                Email = "pat.parent@example.com",
                DependentUserIds = [],
            };

            var act = () => McpRequestValidator.EnsureValid(request);

            act.Should().Throw<ValidationException>();
        }

        [Fact]
        public void EnsureValid_WhenUpdateRequestOmitsAthletes_DoesNotThrow()
        {
            var request = new UpdateUserRequest
            {
                RoleName = "Parent",
                FirstName = "Pat",
                LastName = "Parent",
                Email = "pat.parent@example.com",
            };

            var act = () => McpRequestValidator.EnsureValid(request);

            act.Should().NotThrow();
        }
    }
}
