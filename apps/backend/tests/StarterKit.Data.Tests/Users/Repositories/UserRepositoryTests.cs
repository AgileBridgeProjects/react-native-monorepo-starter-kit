using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Data.Tests.Users.Repositories;

public abstract class UserRepositoryTests : IDisposable
{
    private readonly AppDbContext DbContext;
    private readonly UserRepository Sut;

    protected static readonly Guid ClubId = Guid.NewGuid();

    protected UserRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new UserRepository(DbContext, TimeProvider.System);
    }

    public void Dispose() => DbContext.Dispose();

    private async Task<UserEntity> SeedUser(Guid? teamId = null) =>
        await SeedUserInClub(ClubId, teamId: teamId);

    private async Task<UserEntity> SeedUserInClub(
        Guid clubId,
        string? externalAuthId = null,
        Guid? teamId = null
    )
    {
        var entity = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = externalAuthId ?? Guid.NewGuid().ToString(),
            ClubId = clubId,
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow,
        };
        DbContext.Users.Add(entity);
        if (teamId is { } id)
            DbContext.UserTeams.Add(
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = entity.Id,
                    TeamId = id,
                }
            );
        await DbContext.SaveChangesAsync();
        return entity;
    }

    private async Task SeedSetupToken(
        Guid userId,
        bool expired = false,
        bool used = false,
        bool invalidated = false,
        SetupTokenPurpose purpose = SetupTokenPurpose.AccountSetup
    )
    {
        DbContext.UserSetupTokens.Add(
            new UserSetupTokenEntity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TokenHash = Guid.NewGuid().ToString("N"),
                TempPasswordHash = Guid.NewGuid().ToString("N"),
                Purpose = purpose,
                ExpiresAt = expired ? DateTime.UtcNow.AddHours(-24) : DateTime.UtcNow.AddHours(24),
                UsedAt = used ? DateTime.UtcNow : null,
                IsInvalidated = invalidated,
                CreatedAt = DateTime.UtcNow,
            }
        );
        await DbContext.SaveChangesAsync();
    }

    public sealed class ListAsync_TeamIdFilter : UserRepositoryTests
    {
        [Fact]
        public async Task ListAsync_WhenTeamIdFilterSet_ReturnsOnlyMatchingUsers()
        {
            var targetDept = Guid.NewGuid();
            var targetUser = await SeedUser(teamId: targetDept);
            await SeedUser(teamId: Guid.NewGuid());
            await SeedUser();

            var result = await Sut.ListAsync(
                new UserFilter
                {
                    TeamId = targetDept,
                    Page = 1,
                    PageSize = 50,
                },
                CancellationToken.None
            );

            result.Items.Should().HaveCount(1);
            result.Items[0].Id.Should().Be(targetUser.Id);
        }

        [Fact]
        public async Task ListAsync_WhenNoTeamIdFilter_ReturnsAllUsers()
        {
            await SeedUser(teamId: Guid.NewGuid());
            await SeedUser(teamId: Guid.NewGuid());
            await SeedUser();

            var result = await Sut.ListAsync(
                new UserFilter { Page = 1, PageSize = 50 },
                CancellationToken.None
            );

            result.Items.Should().HaveCount(3);
        }
    }

    public sealed class ListAsync_Sorting : UserRepositoryTests
    {
        [Fact]
        public async Task ListAsync_SortByDisplayName_Ascending_ReturnsAlphabeticalOrder()
        {
            await SeedUserWithName("Zara");
            await SeedUserWithName("Alice");
            await SeedUserWithName("Mike");

            var result = await Sut.ListAsync(
                new UserFilter
                {
                    Page = 1,
                    PageSize = 50,
                    SortBy = "DisplayName",
                    SortDescending = false,
                },
                CancellationToken.None
            );

            result.Items.Select(u => u.DisplayName).Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task ListAsync_SortByDisplayName_Descending_ReturnsReverseAlphabeticalOrder()
        {
            await SeedUserWithName("Zara");
            await SeedUserWithName("Alice");
            await SeedUserWithName("Mike");

            var result = await Sut.ListAsync(
                new UserFilter
                {
                    Page = 1,
                    PageSize = 50,
                    SortBy = "DisplayName",
                    SortDescending = true,
                },
                CancellationToken.None
            );

            result.Items.Select(u => u.DisplayName).Should().BeInDescendingOrder();
        }

        [Fact]
        public async Task ListAsync_SortByEmail_Ascending_ReturnsSortedByEmail()
        {
            await SeedUserWithEmail("z@example.com");
            await SeedUserWithEmail("a@example.com");

            var result = await Sut.ListAsync(
                new UserFilter
                {
                    Page = 1,
                    PageSize = 50,
                    SortBy = "Email",
                    SortDescending = false,
                },
                CancellationToken.None
            );

            result.Items.Select(u => u.Email).Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task ListAsync_InvalidSortColumn_ThrowsArgumentException()
        {
            await SeedUser();

            Func<Task> act = () =>
                Sut.ListAsync(
                    new UserFilter
                    {
                        Page = 1,
                        PageSize = 50,
                        SortBy = "NonExistentColumn",
                    },
                    CancellationToken.None
                );

            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*NonExistentColumn*");
        }

        private async Task<UserEntity> SeedUserWithName(string displayName)
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            await DbContext.SaveChangesAsync();
            return entity;
        }

        private async Task<UserEntity> SeedUserWithEmail(string email)
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = email,
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            await DbContext.SaveChangesAsync();
            return entity;
        }
    }

    public sealed class IsSharedAcrossClubsAsync : UserRepositoryTests
    {
        [Fact]
        public async Task ReturnsFalse_WhenUserExistsInOnlyOneClub()
        {
            var user = await SeedUserInClub(ClubId);

            var result = await Sut.IsSharedAcrossClubsAsync(user.Id, CancellationToken.None);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task ReturnsTrue_WhenSameExternalAuthIdExistsInTwoClubs()
        {
            const string sharedAuthId = "firebase-uid-shared";
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var userA = await SeedUserInClub(clubA, externalAuthId: sharedAuthId);
            await SeedUserInClub(clubB, externalAuthId: sharedAuthId);

            var result = await Sut.IsSharedAcrossClubsAsync(userA.Id, CancellationToken.None);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task ReturnsFalse_WhenOnlySiblingIsSoftDeleted()
        {
            const string sharedAuthId = "firebase-uid-deleted-sibling";
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var userA = await SeedUserInClub(clubA, externalAuthId: sharedAuthId);
            var userB = await SeedUserInClub(clubB, externalAuthId: sharedAuthId);

            // Soft-delete the sibling — should not count as shared
            userB.IsDeleted = true;
            userB.DeletedAt = DateTime.UtcNow;
            await DbContext.SaveChangesAsync();

            var result = await Sut.IsSharedAcrossClubsAsync(userA.Id, CancellationToken.None);

            result.Should().BeFalse();
        }

        [Fact]
        public async Task ReturnsFalse_WhenUserDoesNotExist()
        {
            var result = await Sut.IsSharedAcrossClubsAsync(Guid.NewGuid(), CancellationToken.None);

            result.Should().BeFalse();
        }
    }

    public sealed class GetSharedExternalAuthIdsAsync : UserRepositoryTests
    {
        [Fact]
        public async Task ReturnsEmpty_WhenNoAuthIdsAreShared()
        {
            var userA = await SeedUserInClub(ClubId, externalAuthId: "unique-uid-a");
            var userB = await SeedUserInClub(ClubId, externalAuthId: "unique-uid-b");

            var result = await Sut.GetSharedExternalAuthIdsAsync(
                [userA.ExternalAuthId, userB.ExternalAuthId],
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ReturnsSharedId_WhenAuthIdExistsInTwoClubs()
        {
            const string sharedAuthId = "firebase-shared-batch";
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            await SeedUserInClub(clubA, externalAuthId: sharedAuthId);
            await SeedUserInClub(clubB, externalAuthId: sharedAuthId);
            // Unrelated user — should not appear in result
            var solo = await SeedUserInClub(clubA, externalAuthId: "solo-uid");

            var result = await Sut.GetSharedExternalAuthIdsAsync(
                [sharedAuthId, solo.ExternalAuthId],
                CancellationToken.None
            );

            result.Should().ContainSingle().Which.Should().Be(sharedAuthId);
        }

        [Fact]
        public async Task DoesNotCountSoftDeletedSiblings()
        {
            const string sharedAuthId = "firebase-deleted-in-batch";
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            await SeedUserInClub(clubA, externalAuthId: sharedAuthId);
            var userB = await SeedUserInClub(clubB, externalAuthId: sharedAuthId);

            userB.IsDeleted = true;
            userB.DeletedAt = DateTime.UtcNow;
            await DbContext.SaveChangesAsync();

            var result = await Sut.GetSharedExternalAuthIdsAsync(
                [sharedAuthId],
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ReturnsEmpty_WhenInputListIsEmpty()
        {
            var result = await Sut.GetSharedExternalAuthIdsAsync([], CancellationToken.None);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task IgnoresEmptyAuthIds()
        {
            var result = await Sut.GetSharedExternalAuthIdsAsync(["", ""], CancellationToken.None);

            result.Should().BeEmpty();
        }
    }

    // ── ListActiveEmails/Phones — shared filter helper coverage ─────────────

    public sealed class ListActiveContactsByClubOrTeam : UserRepositoryTests
    {
        private async Task<UserEntity> SeedActiveAsync(
            Guid clubId,
            Guid? teamId,
            string? email,
            string? phone,
            bool isActive = true
        )
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = clubId,
                Email = email ?? string.Empty,
                PhoneNumber = phone,
                DisplayName = "Test User",
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            if (teamId is { } id)
                DbContext.UserTeams.Add(
                    new UserTeam
                    {
                        Id = Guid.NewGuid(),
                        UserId = entity.Id,
                        TeamId = id,
                    }
                );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task Emails_ClubOnly_ReturnsAllActiveUsersInClub()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            await SeedActiveAsync(clubA, null, "a@x.com", null);
            await SeedActiveAsync(clubA, null, "b@x.com", null);
            await SeedActiveAsync(clubB, null, "c@x.com", null); // wrong club

            var result = await Sut.ListActiveEmailsByClubOrTeamAsync(
                [clubA],
                [],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["a@x.com", "b@x.com"]);
        }

        [Fact]
        public async Task Emails_TeamOnly_ReturnsOnlyUsersInThoseTeams()
        {
            var club = Guid.NewGuid();
            var deptA = Guid.NewGuid();
            var deptB = Guid.NewGuid();
            await SeedActiveAsync(club, deptA, "a@x.com", null);
            await SeedActiveAsync(club, deptB, "b@x.com", null); // wrong dept
            await SeedActiveAsync(club, null, "c@x.com", null); // no dept

            var result = await Sut.ListActiveEmailsByClubOrTeamAsync(
                [],
                [deptA],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["a@x.com"]);
        }

        [Fact]
        public async Task Emails_ClubAndTeam_UnionsBothMatches()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var dept = Guid.NewGuid();
            await SeedActiveAsync(clubA, null, "a@x.com", null); // club match
            await SeedActiveAsync(clubB, dept, "b@x.com", null); // dept match
            await SeedActiveAsync(clubB, null, "c@x.com", null); // neither

            var result = await Sut.ListActiveEmailsByClubOrTeamAsync(
                [clubA],
                [dept],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["a@x.com", "b@x.com"]);
        }

        [Fact]
        public async Task Emails_InactiveOrEmpty_Excluded()
        {
            var club = Guid.NewGuid();
            await SeedActiveAsync(club, null, "active@x.com", null);
            await SeedActiveAsync(club, null, "inactive@x.com", null, isActive: false);
            await SeedActiveAsync(club, null, "", null);

            var result = await Sut.ListActiveEmailsByClubOrTeamAsync(
                [club],
                [],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["active@x.com"]);
        }

        [Fact]
        public async Task Phones_ClubOnly_ReturnsActiveUsersWithPhones()
        {
            var club = Guid.NewGuid();
            await SeedActiveAsync(club, null, null, "+27821234567");
            await SeedActiveAsync(club, null, null, null); // no phone
            await SeedActiveAsync(club, null, null, ""); // empty phone

            var result = await Sut.ListActivePhonesByClubOrTeamAsync(
                [club],
                [],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["+27821234567"]);
        }

        [Fact]
        public async Task Phones_ClubAndTeam_UnionsBothMatches()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var dept = Guid.NewGuid();
            await SeedActiveAsync(clubA, null, null, "+27111111111");
            await SeedActiveAsync(clubB, dept, null, "+27222222222");
            await SeedActiveAsync(clubB, null, null, "+27333333333"); // neither

            var result = await Sut.ListActivePhonesByClubOrTeamAsync(
                [clubA],
                [dept],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["+27111111111", "+27222222222"]);
        }

        [Fact]
        public async Task UserIds_ClubAndTeam_ReturnsDistinctActiveMatchingUsers()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var dept = Guid.NewGuid();
            var clubUser = await SeedActiveAsync(clubA, null, "a@x.com", null);
            var teamUser = await SeedActiveAsync(clubB, dept, "b@x.com", null);
            await SeedActiveAsync(clubB, null, "c@x.com", null);
            await SeedActiveAsync(clubA, null, "inactive@x.com", null, isActive: false);

            var result = await Sut.ListActiveUserIdsByClubOrTeamAsync(
                [clubA],
                [dept],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo([clubUser.Id, teamUser.Id]);
        }
    }

    // ── UpdateLastPlayedAtAsync ──────────────────────────────────────────────
    // ExecuteUpdateAsync requires a real SQL Server provider — see
    // UpdateLastPlayedAtAsyncSqlServerTests.cs for the three Testcontainers scenarios.

    // ── SetupStatus filter ───────────────────────────────────────────────────

    public sealed class ListAsync_SetupStatusFilter : UserRepositoryTests
    {
        private static readonly UserFilter PendingFilter = new()
        {
            HasPendingSetup = true,
            Page = 1,
            PageSize = 50,
        };

        private static readonly UserFilter ExpiredFilter = new()
        {
            HasExpiredSetup = true,
            Page = 1,
            PageSize = 50,
        };

        // ── HasPendingSetup ───────────────────────────────────────────────

        [Fact]
        public async Task HasPendingSetup_WhenUserHasValidToken_IsIncluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id);

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().ContainSingle().Which.Id.Should().Be(user.Id);
        }

        [Fact]
        public async Task HasPendingSetup_WhenTokenIsExpired_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, expired: true);

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasPendingSetup_WhenTokenIsUsed_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, used: true);

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasPendingSetup_WhenTokenIsInvalidated_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, invalidated: true);

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasPendingSetup_WhenUserHasNoTokens_IsExcluded()
        {
            await SeedUser();

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasPendingSetup_WhenTokenPurposeIsPasswordReset_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, purpose: SetupTokenPurpose.PasswordReset);

            var result = await Sut.ListAsync(PendingFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        // ── HasExpiredSetup ───────────────────────────────────────────────

        [Fact]
        public async Task HasExpiredSetup_WhenTokenHasPassed_IsIncluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, expired: true);

            var result = await Sut.ListAsync(ExpiredFilter, CancellationToken.None);

            result.Items.Should().ContainSingle().Which.Id.Should().Be(user.Id);
        }

        [Fact]
        public async Task HasExpiredSetup_WhenTokenIsInvalidated_IsIncluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, invalidated: true);

            var result = await Sut.ListAsync(ExpiredFilter, CancellationToken.None);

            result.Items.Should().ContainSingle().Which.Id.Should().Be(user.Id);
        }

        [Fact]
        public async Task HasExpiredSetup_WhenUserHasValidToken_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id);

            var result = await Sut.ListAsync(ExpiredFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasExpiredSetup_WhenOnlyTokenIsUsed_IsExcluded()
        {
            var user = await SeedUser();
            await SeedSetupToken(user.Id, used: true);

            var result = await Sut.ListAsync(ExpiredFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task HasExpiredSetup_WhenUserHasNoTokens_IsExcluded()
        {
            await SeedUser();

            var result = await Sut.ListAsync(ExpiredFilter, CancellationToken.None);

            result.Items.Should().BeEmpty();
        }

        // ── Cross-filter isolation ────────────────────────────────────────

        [Fact]
        public async Task NoSetupStatusFilter_WithMixedStates_ReturnsAllUsers()
        {
            var pending = await SeedUser();
            await SeedSetupToken(pending.Id);

            var expired = await SeedUser();
            await SeedSetupToken(expired.Id, expired: true);

            await SeedUser(); // no token

            var result = await Sut.ListAsync(
                new UserFilter { Page = 1, PageSize = 50 },
                CancellationToken.None
            );

            result.Items.Should().HaveCount(3);
        }
    }

    // ── ListActiveUsernamesByClubOrTeamAsync ────────────────────────

    public sealed class ListActiveUsernamesByClubOrTeam : UserRepositoryTests
    {
        private async Task<UserEntity> SeedAsync(
            Guid clubId,
            Guid? teamId,
            string? username,
            bool isActive = true
        )
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = clubId,
                Username = username,
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            if (teamId is { } id)
                DbContext.UserTeams.Add(
                    new UserTeam
                    {
                        Id = Guid.NewGuid(),
                        UserId = entity.Id,
                        TeamId = id,
                    }
                );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task Usernames_ClubOnly_ReturnsAllActiveUsersInClub()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            await SeedAsync(clubA, null, "alice");
            await SeedAsync(clubA, null, "bob");
            await SeedAsync(clubB, null, "carol"); // wrong club

            var result = await Sut.ListActiveUsernamesByClubOrTeamAsync(
                [clubA],
                [],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["alice", "bob"]);
        }

        [Fact]
        public async Task Usernames_InactiveOrEmpty_Excluded()
        {
            var club = Guid.NewGuid();
            await SeedAsync(club, null, "active.user");
            await SeedAsync(club, null, "inactive.user", isActive: false);
            await SeedAsync(club, null, ""); // empty username
            await SeedAsync(club, null, null); // null username

            var result = await Sut.ListActiveUsernamesByClubOrTeamAsync(
                [club],
                [],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["active.user"]);
        }

        [Fact]
        public async Task Usernames_ClubAndTeam_UnionsBothMatches()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var dept = Guid.NewGuid();
            await SeedAsync(clubA, null, "alice"); // club match
            await SeedAsync(clubB, dept, "bob"); // dept match
            await SeedAsync(clubB, null, "carol"); // neither

            var result = await Sut.ListActiveUsernamesByClubOrTeamAsync(
                [clubA],
                [dept],
                CancellationToken.None
            );

            result.Should().BeEquivalentTo(["alice", "bob"]);
        }
    }

    public sealed class AddGuardianLinkAsync : UserRepositoryTests
    {
        [Fact]
        public async Task AddGuardianLinkAsync_WithNewLink_PersistsToDatabase()
        {
            var guardian = await SeedUser();
            var dependent = await SeedUser();

            await Sut.AddGuardianLinkAsync(guardian.Id, dependent.Id, CancellationToken.None);

            var exists = await Sut.GuardianLinkExistsAsync(
                guardian.Id,
                dependent.Id,
                CancellationToken.None
            );
            exists.Should().BeTrue();
        }

        [Fact]
        public async Task AddGuardianLinkAsync_WhenLinkAlreadyExists_DoesNotThrowOrDuplicate()
        {
            var guardian = await SeedUser();
            var dependent = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependent.Id, CancellationToken.None);

            await Sut.AddGuardianLinkAsync(guardian.Id, dependent.Id, CancellationToken.None);

            var dependents = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            dependents.Should().ContainSingle();
        }
    }

    public sealed class GuardianLinkExistsAsync : UserRepositoryTests
    {
        [Fact]
        public async Task GuardianLinkExistsAsync_WhenNoLink_ReturnsFalse()
        {
            var guardian = await SeedUser();
            var dependent = await SeedUser();

            var result = await Sut.GuardianLinkExistsAsync(
                guardian.Id,
                dependent.Id,
                CancellationToken.None
            );

            result.Should().BeFalse();
        }
    }

    public sealed class ListDependentIdsForGuardianAsync : UserRepositoryTests
    {
        [Fact]
        public async Task ListDependentIdsForGuardianAsync_ReturnsAllLinkedDependents()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependentA.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(guardian.Id, dependentB.Id, CancellationToken.None);

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );

            result.Should().BeEquivalentTo([dependentA.Id, dependentB.Id]);
        }

        [Fact]
        public async Task ListDependentIdsForGuardianAsync_WhenNoLinks_ReturnsEmpty()
        {
            var guardian = await SeedUser();

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class CountUsersInClubWithRoleAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedUserWithRoleAsync(string roleName, Guid? clubId = null)
        {
            var user = await SeedUserInClub(clubId ?? ClubId);
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = roleName };
            DbContext.Roles.Add(role);
            DbContext.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = role.Id,
                }
            );
            await DbContext.SaveChangesAsync();
            return user;
        }

        [Fact]
        public async Task WhenAllUsersMatchClubAndRole_ReturnsFullCount()
        {
            var athleteA = await SeedUserWithRoleAsync("Athlete");
            var athleteB = await SeedUserWithRoleAsync("Athlete");

            var result = await Sut.CountUsersInClubWithRoleAsync(
                [athleteA.Id, athleteB.Id],
                ClubId,
                "Athlete",
                CancellationToken.None
            );

            result.Should().Be(2);
        }

        [Fact]
        public async Task WhenUserBelongsToAnotherClub_ExcludesIt()
        {
            var athleteInClub = await SeedUserWithRoleAsync("Athlete");
            var athleteInOtherClub = await SeedUserWithRoleAsync("Athlete", clubId: Guid.NewGuid());

            var result = await Sut.CountUsersInClubWithRoleAsync(
                [athleteInClub.Id, athleteInOtherClub.Id],
                ClubId,
                "Athlete",
                CancellationToken.None
            );

            result.Should().Be(1);
        }

        [Fact]
        public async Task WhenUserDoesNotHaveTheRole_ExcludesIt()
        {
            var athlete = await SeedUserWithRoleAsync("Athlete");
            var coach = await SeedUserWithRoleAsync("Coach");

            var result = await Sut.CountUsersInClubWithRoleAsync(
                [athlete.Id, coach.Id],
                ClubId,
                "Athlete",
                CancellationToken.None
            );

            result.Should().Be(1);
        }
    }

    public sealed class ListUsersInClubWithRoleAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedUserWithRoleAsync(
            string roleName,
            Guid? clubId = null,
            bool isActive = true,
            string? displayName = null
        )
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = clubId ?? ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = displayName ?? "Test User",
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = roleName };
            DbContext.Roles.Add(role);
            DbContext.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = entity.Id,
                    RoleId = role.Id,
                }
            );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsActiveUsersInClubWithRole_OrderedByDisplayName()
        {
            await SeedUserWithRoleAsync("Coach", displayName: "Zoe Coach");
            await SeedUserWithRoleAsync("Coach", displayName: "Amy Coach");

            var result = await Sut.ListUsersInClubWithRoleAsync(
                ClubId,
                "Coach",
                CancellationToken.None
            );

            result.Select(u => u.DisplayName).Should().ContainInOrder("Amy Coach", "Zoe Coach");
        }

        [Fact]
        public async Task ExcludesUsersInAnotherClub()
        {
            await SeedUserWithRoleAsync("Coach");
            await SeedUserWithRoleAsync("Coach", clubId: Guid.NewGuid());

            var result = await Sut.ListUsersInClubWithRoleAsync(
                ClubId,
                "Coach",
                CancellationToken.None
            );

            result.Should().ContainSingle();
        }

        [Fact]
        public async Task ExcludesUsersWithoutTheRole()
        {
            await SeedUserWithRoleAsync("Coach");
            await SeedUserWithRoleAsync("Director");

            var result = await Sut.ListUsersInClubWithRoleAsync(
                ClubId,
                "Coach",
                CancellationToken.None
            );

            result.Should().ContainSingle();
        }

        [Fact]
        public async Task ExcludesInactiveUsers()
        {
            await SeedUserWithRoleAsync("Coach", isActive: false);

            var result = await Sut.ListUsersInClubWithRoleAsync(
                ClubId,
                "Coach",
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class ListUsersInTeamsWithRoleAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedTeamMemberAsync(
            string roleName,
            Guid? teamId = null,
            bool isActive = true
        )
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            if (teamId is not null)
            {
                DbContext.UserTeams.Add(
                    new UserTeam
                    {
                        Id = Guid.NewGuid(),
                        UserId = entity.Id,
                        TeamId = teamId.Value,
                        CreatedAt = DateTime.UtcNow,
                    }
                );
            }
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = roleName };
            DbContext.Roles.Add(role);
            DbContext.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = entity.Id,
                    RoleId = role.Id,
                }
            );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsUsersLinkedViaUserTeamsJoin()
        {
            var teamId = Guid.NewGuid();
            var viaJoin = await SeedTeamMemberAsync("Athlete", teamId: teamId);
            await SeedTeamMemberAsync("Athlete"); // unrelated team — excluded

            var result = await Sut.ListUsersInTeamsWithRoleAsync(
                [teamId],
                "Athlete",
                CancellationToken.None
            );

            result.Select(u => u.Id).Should().BeEquivalentTo([viaJoin.Id]);
        }

        [Fact]
        public async Task ExcludesUsersWithoutTheRole()
        {
            var teamId = Guid.NewGuid();
            await SeedTeamMemberAsync("Coach", teamId: teamId);

            var result = await Sut.ListUsersInTeamsWithRoleAsync(
                [teamId],
                "Athlete",
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesInactiveUsers()
        {
            var teamId = Guid.NewGuid();
            await SeedTeamMemberAsync("Athlete", teamId: teamId, isActive: false);

            var result = await Sut.ListUsersInTeamsWithRoleAsync(
                [teamId],
                "Athlete",
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class AddGuardianLinksAsync : UserRepositoryTests
    {
        [Fact]
        public async Task AddGuardianLinksAsync_WithNewLinks_PersistsAll()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();

            await Sut.AddGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEquivalentTo([dependentA.Id, dependentB.Id]);
        }

        [Fact]
        public async Task AddGuardianLinksAsync_WhenSomeLinksAlreadyExist_SkipsThoseAndAddsRest()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependentA.Id, CancellationToken.None);

            await Sut.AddGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEquivalentTo([dependentA.Id, dependentB.Id]);
        }

        [Fact]
        public async Task AddGuardianLinksAsync_WithEmptyList_DoesNothing()
        {
            var guardian = await SeedUser();

            await Sut.AddGuardianLinksAsync(guardian.Id, [], CancellationToken.None);

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEmpty();
        }
    }

    public sealed class BulkAddGuardianLinksAsync : UserRepositoryTests
    {
        [Fact]
        public async Task BulkAddGuardianLinksAsync_WithLinksAcrossMultipleGuardians_PersistsAll()
        {
            var guardianA = await SeedUser();
            var guardianB = await SeedUser();
            var athleteA = await SeedUser();
            var athleteB = await SeedUser();

            await Sut.BulkAddGuardianLinksAsync(
                [(guardianA.Id, athleteA.Id), (guardianB.Id, athleteB.Id)],
                CancellationToken.None
            );

            (await Sut.ListDependentIdsForGuardianAsync(guardianA.Id, CancellationToken.None))
                .Should()
                .BeEquivalentTo([athleteA.Id]);
            (await Sut.ListDependentIdsForGuardianAsync(guardianB.Id, CancellationToken.None))
                .Should()
                .BeEquivalentTo([athleteB.Id]);
        }

        [Fact]
        public async Task BulkAddGuardianLinksAsync_WhenSomeLinksAlreadyExist_SkipsThoseAndAddsRest()
        {
            var guardianA = await SeedUser();
            var guardianB = await SeedUser();
            var athleteA = await SeedUser();
            var athleteB = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardianA.Id, athleteA.Id, CancellationToken.None);

            await Sut.BulkAddGuardianLinksAsync(
                [(guardianA.Id, athleteA.Id), (guardianB.Id, athleteB.Id)],
                CancellationToken.None
            );

            (await Sut.ListDependentIdsForGuardianAsync(guardianA.Id, CancellationToken.None))
                .Should()
                .BeEquivalentTo([athleteA.Id]);
            (await Sut.ListDependentIdsForGuardianAsync(guardianB.Id, CancellationToken.None))
                .Should()
                .BeEquivalentTo([athleteB.Id]);
        }

        [Fact]
        public async Task BulkAddGuardianLinksAsync_WithEmptyList_DoesNothing()
        {
            await Sut.BulkAddGuardianLinksAsync([], CancellationToken.None);
        }
    }

    public sealed class ReplaceGuardianLinksAsync : UserRepositoryTests
    {
        [Fact]
        public async Task ReplaceGuardianLinksAsync_WhenNoExistingLinks_AddsAllGivenDependents()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();

            await Sut.ReplaceGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEquivalentTo([dependentA.Id, dependentB.Id]);
        }

        [Fact]
        public async Task ReplaceGuardianLinksAsync_WhenDependentRemovedFromList_UnlinksIt()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();
            await Sut.AddGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            await Sut.ReplaceGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEquivalentTo([dependentA.Id]);
        }

        [Fact]
        public async Task ReplaceGuardianLinksAsync_WithSameSet_IsIdempotent()
        {
            var guardian = await SeedUser();
            var dependent = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependent.Id, CancellationToken.None);

            await Sut.ReplaceGuardianLinksAsync(
                guardian.Id,
                [dependent.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().ContainSingle().Which.Should().Be(dependent.Id);
        }

        [Fact]
        public async Task ReplaceGuardianLinksAsync_WithEmptyList_ClearsAllLinks()
        {
            var guardian = await SeedUser();
            var dependentA = await SeedUser();
            var dependentB = await SeedUser();
            await Sut.AddGuardianLinksAsync(
                guardian.Id,
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            await Sut.ReplaceGuardianLinksAsync(guardian.Id, [], CancellationToken.None);

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ReplaceGuardianLinksAsync_AfterRemoval_CanReAddSameDependent()
        {
            // Regression guard for the partial-unique-index fix: soft-deleting a UserGuardian
            // link must not block re-linking the same (GuardianId, DependentId) pair later.
            var guardian = await SeedUser();
            var dependent = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependent.Id, CancellationToken.None);
            await Sut.ReplaceGuardianLinksAsync(guardian.Id, [], CancellationToken.None);

            await Sut.ReplaceGuardianLinksAsync(
                guardian.Id,
                [dependent.Id],
                CancellationToken.None
            );

            var result = await Sut.ListDependentIdsForGuardianAsync(
                guardian.Id,
                CancellationToken.None
            );
            result.Should().BeEquivalentTo([dependent.Id]);
        }
    }

    // ── the identity split messaging support queries ────────────────────────────────────

    public sealed class ListGuardianIdsForDependentsAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedUserWithActivityAsync(bool isActive = true)
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task WhenGuardianLinkedToMultipleRequestedDependents_ReturnsGuardianOnce()
        {
            var guardian = await SeedUserWithActivityAsync();
            var dependentA = await SeedUserWithActivityAsync();
            var dependentB = await SeedUserWithActivityAsync();
            await Sut.AddGuardianLinkAsync(guardian.Id, dependentA.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(guardian.Id, dependentB.Id, CancellationToken.None);

            var result = await Sut.ListGuardianIdsForDependentsAsync(
                [dependentA.Id, dependentB.Id],
                CancellationToken.None
            );

            result.Should().ContainSingle().Which.Should().Be(guardian.Id);
        }

        [Fact]
        public async Task ExcludesInactiveGuardians()
        {
            var activeGuardian = await SeedUserWithActivityAsync();
            var inactiveGuardian = await SeedUserWithActivityAsync(isActive: false);
            var dependent = await SeedUserWithActivityAsync();
            await Sut.AddGuardianLinkAsync(activeGuardian.Id, dependent.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(
                inactiveGuardian.Id,
                dependent.Id,
                CancellationToken.None
            );

            var result = await Sut.ListGuardianIdsForDependentsAsync(
                [dependent.Id],
                CancellationToken.None
            );

            result.Should().ContainSingle().Which.Should().Be(activeGuardian.Id);
        }

        [Fact]
        public async Task ReturnsOnlyGuardiansOfRequestedDependents()
        {
            var guardianA = await SeedUserWithActivityAsync();
            var guardianB = await SeedUserWithActivityAsync();
            var dependentA = await SeedUserWithActivityAsync();
            var dependentB = await SeedUserWithActivityAsync();
            await Sut.AddGuardianLinkAsync(guardianA.Id, dependentA.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(guardianB.Id, dependentB.Id, CancellationToken.None);

            var result = await Sut.ListGuardianIdsForDependentsAsync(
                [dependentA.Id],
                CancellationToken.None
            );

            result.Should().ContainSingle().Which.Should().Be(guardianA.Id);
        }

        [Fact]
        public async Task WhenNoLinks_ReturnsEmpty()
        {
            var dependent = await SeedUserWithActivityAsync();

            var result = await Sut.ListGuardianIdsForDependentsAsync(
                [dependent.Id],
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class ListActiveMemberIdsForTeamAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedMemberAsync(Guid? teamId = null, bool isActive = true)
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            if (teamId is not null)
            {
                DbContext.UserTeams.Add(
                    new UserTeam
                    {
                        Id = Guid.NewGuid(),
                        UserId = entity.Id,
                        TeamId = teamId.Value,
                        CreatedAt = DateTime.UtcNow,
                    }
                );
            }
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsUsersLinkedViaUserTeamsJoin()
        {
            var teamId = Guid.NewGuid();
            var joinUser = await SeedMemberAsync(teamId: teamId);
            await SeedMemberAsync(teamId: Guid.NewGuid()); // other team — excluded
            await SeedMemberAsync(); // no team — excluded

            var result = await Sut.ListActiveMemberIdsForTeamAsync(teamId, CancellationToken.None);

            result.Should().BeEquivalentTo([joinUser.Id]);
        }

        [Fact]
        public async Task ExcludesInactiveUsers()
        {
            var teamId = Guid.NewGuid();
            var activeUser = await SeedMemberAsync(teamId: teamId);
            await SeedMemberAsync(teamId: teamId, isActive: false);

            var result = await Sut.ListActiveMemberIdsForTeamAsync(teamId, CancellationToken.None);

            result.Should().BeEquivalentTo([activeUser.Id]);
        }

        [Fact]
        public async Task WhenTeamHasNoMembers_ReturnsEmpty()
        {
            var result = await Sut.ListActiveMemberIdsForTeamAsync(
                Guid.NewGuid(),
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class ListLastActiveAtAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedUserActiveAtAsync(DateTime lastActiveAt)
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                LastActiveAt = lastActiveAt,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsPairsForRequestedIdsOnly()
        {
            var baseUtc = new DateTime(2026, 7, 20, 8, 0, 0, DateTimeKind.Utc);
            var userA = await SeedUserActiveAtAsync(baseUtc.AddHours(1));
            var userB = await SeedUserActiveAtAsync(baseUtc.AddHours(2));
            await SeedUserActiveAtAsync(baseUtc.AddHours(3)); // not requested — excluded

            var result = await Sut.ListLastActiveAtAsync(
                [userA.Id, userB.Id],
                CancellationToken.None
            );

            result
                .Should()
                .BeEquivalentTo([(userA.Id, baseUtc.AddHours(1)), (userB.Id, baseUtc.AddHours(2))]);
        }

        [Fact]
        public async Task WhenIdIsUnknown_OmitsItFromResult()
        {
            var user = await SeedUserActiveAtAsync(DateTime.UtcNow);

            var result = await Sut.ListLastActiveAtAsync(
                [user.Id, Guid.NewGuid()],
                CancellationToken.None
            );

            result.Should().ContainSingle().Which.UserId.Should().Be(user.Id);
        }
    }

    // ── UpdateAthleteOnboardingProfileAsync ──────────────────────────────────
    // ExecuteUpdateAsync requires a real SQL Server provider — same InMemory
    // limitation as UpdateLastPlayedAtAsync above, so it isn't unit-tested here.

    // ── ListGuardianLinksWithDependentsAsync ───────────────────────

    public sealed class ListGuardianLinksWithDependentsAsync : UserRepositoryTests
    {
        private async Task<UserEntity> SeedAthleteAsync(string displayName, Team? team = null)
        {
            if (team is not null)
            {
                // Team's multitenancy query filter reads `Season.ClubId`, so the parent Season has
                // to exist or the team is filtered out of the Include.
                DbContext.Seasons.Add(
                    new Season
                    {
                        Id = team.SeasonId,
                        ClubId = ClubId,
                        Name = "2026",
                    }
                );
                DbContext.Teams.Add(team);
            }

            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            if (team is not null)
                DbContext.UserTeams.Add(
                    new UserTeam
                    {
                        Id = Guid.NewGuid(),
                        UserId = entity.Id,
                        TeamId = team.Id,
                    }
                );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsLinksWithTheDependentAndTheirTeamLoaded()
        {
            var guardian = await SeedUser();
            var team = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = Guid.NewGuid(),
                Name = "U14 Texas Slam",
            };
            var athlete = await SeedAthleteAsync("Julia Smith", team);
            await Sut.AddGuardianLinkAsync(guardian.Id, athlete.Id, CancellationToken.None);

            var result = await Sut.ListGuardianLinksWithDependentsAsync(
                guardian.Id,
                CancellationToken.None
            );

            var link = result.Should().ContainSingle().Subject;
            link.DependentId.Should().Be(athlete.Id);
            link.Dependent.DisplayName.Should().Be("Julia Smith");
            link.Dependent.UserTeams.Should()
                .ContainSingle()
                .Which.Team.Name.Should()
                .Be("U14 Texas Slam");
            link.Relationship.Should().BeNull();
        }

        [Fact]
        public async Task OrdersByDependentDisplayName()
        {
            var guardian = await SeedUser();
            var zara = await SeedAthleteAsync("Zara Athlete");
            var adam = await SeedAthleteAsync("Adam Athlete");
            await Sut.AddGuardianLinkAsync(guardian.Id, zara.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(guardian.Id, adam.Id, CancellationToken.None);

            var result = await Sut.ListGuardianLinksWithDependentsAsync(
                guardian.Id,
                CancellationToken.None
            );

            result
                .Select(x => x.Dependent.DisplayName)
                .Should()
                .Equal("Adam Athlete", "Zara Athlete");
        }

        [Fact]
        public async Task ExcludesLinksBelongingToAnotherGuardian()
        {
            var guardian = await SeedUser();
            var otherGuardian = await SeedUser();
            var athlete = await SeedAthleteAsync("Someone Else's Child");
            await Sut.AddGuardianLinkAsync(otherGuardian.Id, athlete.Id, CancellationToken.None);

            var result = await Sut.ListGuardianLinksWithDependentsAsync(
                guardian.Id,
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    // ── SetGuardianRelationshipsAsync ──────────────────────────────

    public sealed class SetGuardianRelationshipsAsync : UserRepositoryTests
    {
        [Fact]
        public async Task PersistsARelationshipPerLink()
        {
            var guardian = await SeedUser();
            var firstAthlete = await SeedUser();
            var secondAthlete = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, firstAthlete.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(guardian.Id, secondAthlete.Id, CancellationToken.None);

            var updated = await Sut.SetGuardianRelationshipsAsync(
                guardian.Id,
                new Dictionary<Guid, GuardianRelationship>
                {
                    [firstAthlete.Id] = GuardianRelationship.Mother,
                    [secondAthlete.Id] = GuardianRelationship.Guardian,
                },
                CancellationToken.None
            );

            updated.Should().Be(2);
            var links = await Sut.ListGuardianLinksWithDependentsAsync(
                guardian.Id,
                CancellationToken.None
            );
            links
                .Should()
                .BeEquivalentTo(
                    new[]
                    {
                        new
                        {
                            DependentId = firstAthlete.Id,
                            Relationship = (GuardianRelationship?)GuardianRelationship.Mother,
                        },
                        new
                        {
                            DependentId = secondAthlete.Id,
                            Relationship = (GuardianRelationship?)GuardianRelationship.Guardian,
                        },
                    },
                    o => o.ExcludingMissingMembers()
                );
        }

        [Fact]
        public async Task OverwritesAPreviouslyChosenRelationship()
        {
            var guardian = await SeedUser();
            var athlete = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, athlete.Id, CancellationToken.None);
            await Sut.SetGuardianRelationshipsAsync(
                guardian.Id,
                new Dictionary<Guid, GuardianRelationship>
                {
                    [athlete.Id] = GuardianRelationship.Other,
                },
                CancellationToken.None
            );

            await Sut.SetGuardianRelationshipsAsync(
                guardian.Id,
                new Dictionary<Guid, GuardianRelationship>
                {
                    [athlete.Id] = GuardianRelationship.Father,
                },
                CancellationToken.None
            );

            var links = await Sut.ListGuardianLinksWithDependentsAsync(
                guardian.Id,
                CancellationToken.None
            );
            links.Single().Relationship.Should().Be(GuardianRelationship.Father);
        }

        [Fact]
        public async Task NeverTouchesAnotherGuardiansLinkForTheSameAthlete()
        {
            var guardian = await SeedUser();
            var otherGuardian = await SeedUser();
            var athlete = await SeedUser();
            await Sut.AddGuardianLinkAsync(guardian.Id, athlete.Id, CancellationToken.None);
            await Sut.AddGuardianLinkAsync(otherGuardian.Id, athlete.Id, CancellationToken.None);

            var updated = await Sut.SetGuardianRelationshipsAsync(
                guardian.Id,
                new Dictionary<Guid, GuardianRelationship>
                {
                    [athlete.Id] = GuardianRelationship.Mother,
                },
                CancellationToken.None
            );

            updated.Should().Be(1);
            var otherLinks = await Sut.ListGuardianLinksWithDependentsAsync(
                otherGuardian.Id,
                CancellationToken.None
            );
            otherLinks.Single().Relationship.Should().BeNull();
        }

        [Fact]
        public async Task WithAnEmptyDictionary_WritesNothing()
        {
            var guardian = await SeedUser();

            var updated = await Sut.SetGuardianRelationshipsAsync(
                guardian.Id,
                new Dictionary<Guid, GuardianRelationship>(),
                CancellationToken.None
            );

            updated.Should().Be(0);
        }
    }

    public sealed class ListAthletesByTeamsAsync : UserRepositoryTests
    {
        private async Task<Team> SeedTeamAsync(string name)
        {
            // Team's global query filter joins through Season.ClubId, so a Team with no
            // matching Season row is structurally excluded from every query, filter or not.
            var club = new Club
            {
                Id = Guid.NewGuid(),
                Name = "Test Club",
                CreatedAt = DateTime.UtcNow,
            };
            var season = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = club.Id,
                StartDate = new DateOnly(2026, 1, 1),
                EndDate = new DateOnly(2026, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            var team = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = season.Id,
                Name = name,
            };
            DbContext.Clubs.Add(club);
            DbContext.Seasons.Add(season);
            DbContext.Teams.Add(team);
            await DbContext.SaveChangesAsync();
            return team;
        }

        private async Task<UserEntity> SeedTeamAthleteAsync(
            Team team,
            string roleName = "Athlete",
            bool isActive = true,
            string displayName = "Test Athlete"
        )
        {
            var entity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = displayName,
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow,
            };
            DbContext.Users.Add(entity);
            DbContext.UserTeams.Add(
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = entity.Id,
                    TeamId = team.Id,
                }
            );
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = roleName };
            DbContext.Roles.Add(role);
            DbContext.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = entity.Id,
                    RoleId = role.Id,
                }
            );
            await DbContext.SaveChangesAsync();
            return entity;
        }

        [Fact]
        public async Task ReturnsEachAthleteTaggedWithTheTeamItWasFoundOn()
        {
            var teamA = await SeedTeamAsync("General");
            var teamB = await SeedTeamAsync("Varsity");
            var athleteA = await SeedTeamAthleteAsync(teamA);
            var athleteB = await SeedTeamAthleteAsync(teamB);

            var result = await Sut.ListAthletesByTeamsAsync(
                [teamA.Id, teamB.Id],
                CancellationToken.None
            );

            result.Should().HaveCount(2);
            result
                .Should()
                .ContainSingle(m => m.Athlete.Id == athleteA.Id && m.TeamId == teamA.Id)
                .Which.TeamName.Should()
                .Be("General");
            result
                .Should()
                .ContainSingle(m => m.Athlete.Id == athleteB.Id && m.TeamId == teamB.Id)
                .Which.TeamName.Should()
                .Be("Varsity");
        }

        [Fact]
        public async Task OrdersByTeamNameThenAthleteDisplayName()
        {
            var teamB = await SeedTeamAsync("Varsity");
            var teamA = await SeedTeamAsync("General");
            await SeedTeamAthleteAsync(teamB, displayName: "Zoe");
            await SeedTeamAthleteAsync(teamA, displayName: "Zach");
            await SeedTeamAthleteAsync(teamA, displayName: "Amy");

            var result = await Sut.ListAthletesByTeamsAsync(
                [teamA.Id, teamB.Id],
                CancellationToken.None
            );

            result
                .Select(m => (m.TeamName, m.Athlete.DisplayName))
                .Should()
                .Equal(("General", "Amy"), ("General", "Zach"), ("Varsity", "Zoe"));
        }

        [Fact]
        public async Task ExcludesTeamsNotInTheRequestedList()
        {
            var teamA = await SeedTeamAsync("General");
            var teamB = await SeedTeamAsync("Varsity");
            var athleteA = await SeedTeamAthleteAsync(teamA);
            await SeedTeamAthleteAsync(teamB);

            var result = await Sut.ListAthletesByTeamsAsync([teamA.Id], CancellationToken.None);

            result.Should().ContainSingle().Which.Athlete.Id.Should().Be(athleteA.Id);
        }

        [Fact]
        public async Task ExcludesUsersWithoutTheAthleteRole()
        {
            var team = await SeedTeamAsync("General");
            await SeedTeamAthleteAsync(team, roleName: "Coach");

            var result = await Sut.ListAthletesByTeamsAsync([team.Id], CancellationToken.None);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesInactiveAthletes()
        {
            var team = await SeedTeamAsync("General");
            await SeedTeamAthleteAsync(team, isActive: false);

            var result = await Sut.ListAthletesByTeamsAsync([team.Id], CancellationToken.None);

            result.Should().BeEmpty();
        }
    }
}
