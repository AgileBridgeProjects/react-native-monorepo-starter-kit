using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Repositories;

namespace StarterKit.Data.Tests.Roles.Repositories;

public abstract class RoleRepositoryTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly RoleRepository _sut;

    protected RoleRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _sut = new RoleRepository(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        GC.SuppressFinalize(this);
    }

    protected async Task<RoleEntity> SeedRoleAsync(
        string name = "TestRole",
        string? description = null,
        bool isActive = true,
        bool isElevated = false,
        bool isPortalRole = false,
        bool isSystem = false,
        bool isDefault = false,
        List<RolePermissionEntity>? permissions = null
    )
    {
        var entity = new RoleEntity
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            IsActive = isActive,
            IsElevated = isElevated,
            IsPortalRole = isPortalRole,
            IsSystem = isSystem,
            IsDefault = isDefault,
            RolePermissions = permissions ?? [],
        };
        _db.Roles.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    protected async Task<UserRoleAssignmentEntity> SeedAssignmentAsync(Guid userId, Guid roleId)
    {
        var assignment = new UserRoleAssignmentEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RoleId = roleId,
        };
        _db.UserRoleAssignments.Add(assignment);
        await _db.SaveChangesAsync();
        return assignment;
    }

    protected async Task<(Club Club, UserEntity User)> SeedUserWithClubAsync(
        string displayName = "Test User",
        string email = "test@example.com",
        bool isActive = true
    )
    {
        var club = new Club { Id = Guid.NewGuid(), Name = "Test Club" };
        _db.Clubs.Add(club);

        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            DisplayName = displayName,
            Email = email,
            ClubId = club.Id,
            ExternalAuthId = Guid.NewGuid().ToString(),
            IsActive = isActive,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return (club, user);
    }

    // ── ListAsync ────────────────────────────────────────────────────────────

    public sealed class ListAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task ReturnsAllRoles_OrderedByName()
        {
            await SeedRoleAsync("Zulu");
            await SeedRoleAsync("Alpha");

            var result = await _sut.ListAsync(false, true, CancellationToken.None);

            result.Should().HaveCount(2);
            result[0].Name.Should().Be("Alpha");
            result[1].Name.Should().Be("Zulu");
        }

        [Fact]
        public async Task IncludesPermissions()
        {
            var permissions = new List<RolePermissionEntity>
            {
                new() { Id = Guid.NewGuid(), Permission = "StarterKit.Test.View" },
            };
            await SeedRoleAsync("WithPerms", permissions: permissions);

            var result = await _sut.ListAsync(false, true, CancellationToken.None);

            result.Single().RolePermissions.Should().HaveCount(1);
        }

        [Fact]
        public async Task ExcludeSystemRoles_FiltersOutSystemRoles()
        {
            await SeedRoleAsync("SuperAdmin", isSystem: true);
            await SeedRoleAsync("ClubAdmin");

            var result = await _sut.ListAsync(
                excludeSystemRoles: true,
                includeInactive: true,
                CancellationToken.None
            );

            result.Should().HaveCount(1);
            result[0].Name.Should().Be("ClubAdmin");
        }

        [Fact]
        public async Task IncludeSystemRoles_ReturnsAll()
        {
            await SeedRoleAsync("SuperAdmin", isSystem: true);
            await SeedRoleAsync("ClubAdmin");

            var result = await _sut.ListAsync(
                excludeSystemRoles: false,
                includeInactive: true,
                CancellationToken.None
            );

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task IncludeInactiveFalse_ExcludesInactiveRoles()
        {
            await SeedRoleAsync("Active", isActive: true);
            await SeedRoleAsync("Inactive", isActive: false);

            var result = await _sut.ListAsync(
                false,
                includeInactive: false,
                CancellationToken.None
            );

            result.Should().HaveCount(1);
            result[0].Name.Should().Be("Active");
        }

        [Fact]
        public async Task IncludeInactiveTrue_ReturnsAll()
        {
            await SeedRoleAsync("Active", isActive: true);
            await SeedRoleAsync("Inactive", isActive: false);

            var result = await _sut.ListAsync(false, includeInactive: true, CancellationToken.None);

            result.Should().HaveCount(2);
        }
    }

    // ── GetAsync ────────────────────────────────────────────────────────

    public sealed class GetAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task WhenExists_ReturnsEntity()
        {
            var seeded = await SeedRoleAsync("FindMe");

            var result = await _sut.GetAsync(seeded.Id, CancellationToken.None);

            result.Should().NotBeNull();
            result!.Name.Should().Be("FindMe");
        }

        [Fact]
        public async Task WhenNotExists_ReturnsNull()
        {
            var result = await _sut.GetAsync(Guid.NewGuid(), CancellationToken.None);

            result.Should().BeNull();
        }
    }

    // ── FindByNameAsync ──────────────────────────────────────────────────────

    public sealed class FindByNameAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task WhenExists_ReturnsEntity()
        {
            await SeedRoleAsync("Unique");

            var result = await _sut.FindByNameAsync("Unique", CancellationToken.None);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Unique");
        }

        [Fact]
        public async Task WhenNotExists_ReturnsNull()
        {
            var result = await _sut.FindByNameAsync("Ghost", CancellationToken.None);

            result.Should().BeNull();
        }
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    public sealed class CreateAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task PersistsAndReturnsEntity()
        {
            var entity = new RoleEntity
            {
                Id = Guid.NewGuid(),
                Name = "NewRole",
                Description = "A new role",
                IsActive = true,
            };

            var result = await _sut.CreateAsync(entity, CancellationToken.None);

            result.Name.Should().Be("NewRole");

            var persisted = await _sut.GetAsync(entity.Id, CancellationToken.None);
            persisted.Should().NotBeNull();
        }
    }

    // ── AssignmentExistsAsync ────────────────────────────────────────────────

    public sealed class AssignmentExistsAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task WhenAssignmentExists_ReturnsTrue()
        {
            var role = await SeedRoleAsync("Assigned");
            var userId = Guid.NewGuid();
            await SeedAssignmentAsync(userId, role.Id);

            var exists = await _sut.AssignmentExistsAsync(userId, role.Id, CancellationToken.None);

            exists.Should().BeTrue();
        }

        [Fact]
        public async Task WhenAssignmentMissing_ReturnsFalse()
        {
            var exists = await _sut.AssignmentExistsAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                CancellationToken.None
            );

            exists.Should().BeFalse();
        }
    }

    // ── CreateAssignmentAsync ────────────────────────────────────────────────

    public sealed class CreateAssignmentAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task PersistsAssignment()
        {
            var role = await SeedRoleAsync("ForAssignment");
            var userId = Guid.NewGuid();
            var assignment = new UserRoleAssignmentEntity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                RoleId = role.Id,
            };

            await _sut.CreateAssignmentAsync(assignment, CancellationToken.None);

            var exists = await _sut.AssignmentExistsAsync(userId, role.Id, CancellationToken.None);
            exists.Should().BeTrue();
        }
    }

    // ── GetRoleNamesForUserAsync ─────────────────────────────────────────────

    public sealed class GetRoleNamesForUserAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task ReturnsRoleNamesForUser()
        {
            var role1 = await SeedRoleAsync("Admin");
            var role2 = await SeedRoleAsync("Editor");
            var userId = Guid.NewGuid();
            await SeedAssignmentAsync(userId, role1.Id);
            await SeedAssignmentAsync(userId, role2.Id);

            var names = await _sut.GetRoleNamesForUserAsync(userId, CancellationToken.None);

            names.Should().BeEquivalentTo(["Admin", "Editor"]);
        }

        [Fact]
        public async Task WhenNoAssignments_ReturnsEmpty()
        {
            var names = await _sut.GetRoleNamesForUserAsync(Guid.NewGuid(), CancellationToken.None);

            names.Should().BeEmpty();
        }
    }

    // ── GetPermissionsForUserAsync ───────────────────────────────────────────

    public sealed class GetPermissionsForUserAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task ReturnsDistinctPermissions()
        {
            var permissions = new List<RolePermissionEntity>
            {
                new() { Id = Guid.NewGuid(), Permission = "StarterKit.A.View" },
                new() { Id = Guid.NewGuid(), Permission = "StarterKit.B.View" },
            };
            var role = await SeedRoleAsync("WithPerms", permissions: permissions);
            var userId = Guid.NewGuid();
            await SeedAssignmentAsync(userId, role.Id);

            var result = await _sut.GetPermissionsForUserAsync(userId, CancellationToken.None);

            result.Should().BeEquivalentTo(["StarterKit.A.View", "StarterKit.B.View"]);
        }
    }

    // ── ListUserIdsWithPermissionAsync ────────────────────────────────────────

    public sealed class ListUserIdsWithPermissionAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task ReturnsOnlyUsersHoldingThePermission()
        {
            var permittedRole = await SeedRoleAsync(
                "Permitted",
                permissions:
                [
                    new RolePermissionEntity
                    {
                        Id = Guid.NewGuid(),
                        Permission = "StarterKit.A.View",
                    },
                ]
            );
            var otherRole = await SeedRoleAsync(
                "Other",
                permissions:
                [
                    new RolePermissionEntity
                    {
                        Id = Guid.NewGuid(),
                        Permission = "StarterKit.B.View",
                    },
                ]
            );
            var permittedUserId = Guid.NewGuid();
            var unpermittedUserId = Guid.NewGuid();
            var unrequestedUserId = Guid.NewGuid();
            await SeedAssignmentAsync(permittedUserId, permittedRole.Id);
            await SeedAssignmentAsync(unpermittedUserId, otherRole.Id);
            await SeedAssignmentAsync(unrequestedUserId, permittedRole.Id);

            var result = await _sut.ListUserIdsWithPermissionAsync(
                [permittedUserId, unpermittedUserId],
                "StarterKit.A.View",
                CancellationToken.None
            );

            result.Should().BeEquivalentTo([permittedUserId]);
        }

        [Fact]
        public async Task WhenNoUserIdsRequested_ReturnsEmptySetWithoutQuerying()
        {
            var result = await _sut.ListUserIdsWithPermissionAsync(
                [],
                "StarterKit.A.View",
                CancellationToken.None
            );

            result.Should().BeEmpty();
        }
    }

    // ── RemoveAssignmentsForUserAsync ────────────────────────────────────────

    public sealed class RemoveAssignmentsForUserAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task RemovesAllAssignmentsForUser()
        {
            var role1 = await SeedRoleAsync("R1");
            var role2 = await SeedRoleAsync("R2");
            var userId = Guid.NewGuid();
            await SeedAssignmentAsync(userId, role1.Id);
            await SeedAssignmentAsync(userId, role2.Id);

            await _sut.RemoveAssignmentsForUserAsync(userId, CancellationToken.None);

            var exists1 = await _sut.AssignmentExistsAsync(
                userId,
                role1.Id,
                CancellationToken.None
            );
            var exists2 = await _sut.AssignmentExistsAsync(
                userId,
                role2.Id,
                CancellationToken.None
            );
            exists1.Should().BeFalse();
            exists2.Should().BeFalse();
        }
    }

    // ── FindDefaultRoleAsync ─────────────────────────────────────────────────

    public sealed class FindDefaultRoleAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task WhenDefaultExists_ReturnsDefaultRole()
        {
            await SeedRoleAsync("Athlete", isDefault: true);
            await SeedRoleAsync("Admin");

            var result = await _sut.FindDefaultRoleAsync(CancellationToken.None);

            result.Should().NotBeNull();
            result!.Name.Should().Be("Athlete");
        }

        [Fact]
        public async Task WhenNoDefaultExists_ReturnsNull()
        {
            await SeedRoleAsync("Athlete");

            var result = await _sut.FindDefaultRoleAsync(CancellationToken.None);

            result.Should().BeNull();
        }

        [Fact]
        public async Task WhenDefaultRoleIsInactive_ReturnsNull()
        {
            await SeedRoleAsync("Athlete", isDefault: true, isActive: false);

            var result = await _sut.FindDefaultRoleAsync(CancellationToken.None);

            result.Should().BeNull();
        }

        [Fact]
        public async Task WhenDefaultRoleIsClubScoped_ReturnsNull()
        {
            var entity = new RoleEntity
            {
                Id = Guid.NewGuid(),
                Name = "ClubDefault",
                IsDefault = true,
                IsActive = true,
                ClubId = Guid.NewGuid(),
            };
            _db.Roles.Add(entity);
            await _db.SaveChangesAsync();

            var result = await _sut.FindDefaultRoleAsync(CancellationToken.None);

            result.Should().BeNull();
        }
    }

    // ── HasActiveAssignmentsAsync ────────────────────────────────────────────

    public sealed class HasActiveAssignmentsAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task WhenRoleHasAssignments_ReturnsTrue()
        {
            var role = await SeedRoleAsync("Assigned");
            var (_, user) = await SeedUserWithClubAsync();
            await SeedAssignmentAsync(user.Id, role.Id);

            var result = await _sut.HasActiveAssignmentsAsync(role.Id, CancellationToken.None);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task WhenRoleHasNoAssignments_ReturnsFalse()
        {
            var role = await SeedRoleAsync("Unassigned");

            var result = await _sut.HasActiveAssignmentsAsync(role.Id, CancellationToken.None);

            result.Should().BeFalse();
        }
    }

    // ── GetAssignmentsAsync ─────────────────────────────────────────────────

    public sealed class GetAssignmentsAsync : RoleRepositoryTests
    {
        [Fact]
        public async Task ReturnsUserDetailsWithClub()
        {
            var role = await SeedRoleAsync("WithUsers");
            var (club, user) = await SeedUserWithClubAsync("Alice", "alice@test.com");
            await SeedAssignmentAsync(user.Id, role.Id);

            var (items, totalCount) = await _sut.GetAssignmentsAsync(
                role.Id,
                1,
                20,
                CancellationToken.None
            );

            totalCount.Should().Be(1);
            items.Should().HaveCount(1);
            items[0].UserId.Should().Be(user.Id);
            items[0].DisplayName.Should().Be("Alice");
            items[0].Email.Should().Be("alice@test.com");
            items[0].ClubId.Should().Be(club.Id);
            items[0].ClubName.Should().Be("Test Club");
        }

        [Fact]
        public async Task ReturnsEmpty_WhenNoAssignments()
        {
            var role = await SeedRoleAsync("Empty");

            var (items, totalCount) = await _sut.GetAssignmentsAsync(
                role.Id,
                1,
                20,
                CancellationToken.None
            );

            totalCount.Should().Be(0);
            items.Should().BeEmpty();
        }

        [Fact]
        public async Task PaginatesCorrectly()
        {
            var role = await SeedRoleAsync("Paginated");
            var (_, user1) = await SeedUserWithClubAsync("Alpha", "alpha@test.com");
            var (_, user2) = await SeedUserWithClubAsync("Bravo", "bravo@test.com");
            var (_, user3) = await SeedUserWithClubAsync("Charlie", "charlie@test.com");
            await SeedAssignmentAsync(user1.Id, role.Id);
            await SeedAssignmentAsync(user2.Id, role.Id);
            await SeedAssignmentAsync(user3.Id, role.Id);

            var (page1Items, totalCount) = await _sut.GetAssignmentsAsync(
                role.Id,
                1,
                2,
                CancellationToken.None
            );

            totalCount.Should().Be(3);
            page1Items.Should().HaveCount(2);
            page1Items[0].DisplayName.Should().Be("Alpha");
            page1Items[1].DisplayName.Should().Be("Bravo");

            var (page2Items, _) = await _sut.GetAssignmentsAsync(
                role.Id,
                2,
                2,
                CancellationToken.None
            );

            page2Items.Should().HaveCount(1);
            page2Items[0].DisplayName.Should().Be("Charlie");
        }
    }
}
