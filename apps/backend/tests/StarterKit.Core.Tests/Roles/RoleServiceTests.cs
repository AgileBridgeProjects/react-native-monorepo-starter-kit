using FluentAssertions;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Roles;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.Core.Roles.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Models;

namespace StarterKit.Core.Tests.Roles;

public abstract class RoleServiceTests
{
    protected readonly Mock<IRoleRepository> RepositoryMock = new();
    protected readonly IRoleService Sut;

    protected RoleServiceTests()
    {
        Sut = new RoleService(RepositoryMock.Object);
    }

    protected static RoleEntity MakeEntity(
        string name = "TestRole",
        string? description = null,
        bool isActive = true,
        Guid? id = null,
        bool isElevated = false,
        List<RolePermissionEntity>? permissions = null
    ) =>
        new()
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Description = description,
            IsActive = isActive,
            IsElevated = isElevated,
            RolePermissions = permissions ?? [],
        };

    // ── ListAsync ────────────────────────────────────────────────────────────

    public sealed class ListAsync_Filtering : RoleServiceTests
    {
        [Fact]
        public async Task WhenNotSuperAdmin_PassesExcludeSystemRolesTrue()
        {
            RepositoryMock
                .Setup(r => r.ListAsync(true, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync([
                    MakeEntity("ClubAdmin", isElevated: true),
                    MakeEntity("CustomRole"),
                ]);

            var result = await Sut.ListAsync(isSuperAdmin: false);

            result.Should().HaveCount(2);
            RepositoryMock.Verify(
                r => r.ListAsync(true, false, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenSuperAdmin_PassesExcludeSystemRolesFalse()
        {
            RepositoryMock
                .Setup(r => r.ListAsync(false, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync([
                    MakeEntity("SuperAdmin", isElevated: true),
                    MakeEntity("ClubAdmin", isElevated: true),
                ]);

            var result = await Sut.ListAsync(isSuperAdmin: true);

            result.Should().HaveCount(2);
            RepositoryMock.Verify(
                r => r.ListAsync(false, false, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenIncludeInactive_PassesThroughToRepository()
        {
            RepositoryMock
                .Setup(r => r.ListAsync(false, true, It.IsAny<CancellationToken>()))
                .ReturnsAsync([MakeEntity("Active"), MakeEntity("Inactive", isActive: false)]);

            var result = await Sut.ListAsync(isSuperAdmin: true, includeInactive: true);

            result.Should().HaveCount(2);
            RepositoryMock.Verify(
                r => r.ListAsync(false, true, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    // ── GetByIdAsync ─────────────────────────────────────────────────────────

    public sealed class GetByIdAsync : RoleServiceTests
    {
        [Fact]
        public async Task WhenRoleExists_ReturnsRole()
        {
            var entity = MakeEntity("MyRole");
            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var result = await Sut.GetByIdAsync(entity.Id);

            result.Id.Should().Be(entity.Id);
            result.Name.Should().Be("MyRole");
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);

            var act = () => Sut.GetByIdAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    public sealed class CreateAsync : RoleServiceTests
    {
        [Fact]
        public async Task HappyPath_ReturnsCreatedRole()
        {
            RepositoryMock
                .Setup(r => r.FindByNameAsync("NewRole", It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);
            RepositoryMock
                .Setup(r => r.CreateAsync(It.IsAny<RoleEntity>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity e, CancellationToken _) => e);

            var result = await Sut.CreateAsync("NewRole", "A description", false, false, null);

            result.Name.Should().Be("NewRole");
            result.Description.Should().Be("A description");
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task DuplicateName_ThrowsConflictException()
        {
            RepositoryMock
                .Setup(r => r.FindByNameAsync("Existing", It.IsAny<CancellationToken>()))
                .ReturnsAsync(MakeEntity("Existing"));

            var act = () => Sut.CreateAsync("Existing", null, false, false, null);

            await act.Should().ThrowAsync<ConflictException>();
        }
    }

    // ── UpdateAsync ──────────────────────────────────────────────────────────

    public sealed class UpdateAsync : RoleServiceTests
    {
        [Fact]
        public async Task HappyPath_ReturnsUpdatedRole()
        {
            var entity = MakeEntity("OldName");
            var updatedEntity = new RoleEntity
            {
                Id = entity.Id,
                Name = "NewName",
                Description = "New description",
                IsActive = true,
                RolePermissions = [],
            };

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.FindByNameAsync("NewName", It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);
            RepositoryMock
                .Setup(r =>
                    r.UpdateAsync(
                        entity.Id,
                        "NewName",
                        "New description",
                        false,
                        false,
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(updatedEntity);

            var result = await Sut.UpdateAsync(
                entity.Id,
                "NewName",
                "New description",
                false,
                false,
                null
            );

            result.Name.Should().Be("NewName");
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);

            var act = () => Sut.UpdateAsync(Guid.NewGuid(), "NewName", null, false, false, null);

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task NameConflictWithAnotherRole_ThrowsConflictException()
        {
            var roleA = MakeEntity("RoleA");
            var roleB = MakeEntity("RoleB");

            RepositoryMock
                .Setup(r => r.GetAsync(roleB.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(roleB);
            RepositoryMock
                .Setup(r => r.FindByNameAsync("RoleA", It.IsAny<CancellationToken>()))
                .ReturnsAsync(roleA);

            var act = () => Sut.UpdateAsync(roleB.Id, "RoleA", null, false, false, null);

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task SameNameAsOwn_DoesNotThrowConflictException()
        {
            var entity = MakeEntity("SameName");

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.FindByNameAsync("SameName", It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r =>
                    r.UpdateAsync(
                        entity.Id,
                        "SameName",
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<bool>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(entity);

            var act = () =>
                Sut.UpdateAsync(entity.Id, "SameName", "Updated description", false, false, null);

            await act.Should().NotThrowAsync<ConflictException>();
        }
    }

    // ── DeactivateAsync ──────────────────────────────────────────────────────

    public sealed class DeactivateAsync : RoleServiceTests
    {
        [Fact]
        public async Task HappyPath_CallsDeactivateOnRepository()
        {
            var entity = MakeEntity("ActiveRole", isActive: true);

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.HasActiveAssignmentsAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);
            RepositoryMock
                .Setup(r => r.DeactivateAsync(entity.Id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.DeactivateAsync(entity.Id);

            RepositoryMock.Verify(
                r => r.DeactivateAsync(entity.Id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);

            var act = () => Sut.DeactivateAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task WhenSystemRole_ThrowsConflictException()
        {
            var entity = MakeEntity("SuperAdmin", isActive: true);
            entity.IsSystem = true;

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var act = () => Sut.DeactivateAsync(entity.Id);

            (await act.Should().ThrowAsync<ConflictException>())
                .Which.ErrorCode.Should()
                .Be("system-role");
        }

        [Fact]
        public async Task WhenHasActiveAssignments_ThrowsConflictException()
        {
            var entity = MakeEntity("AssignedRole", isActive: true);

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.HasActiveAssignmentsAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var act = () => Sut.DeactivateAsync(entity.Id);

            (await act.Should().ThrowAsync<ConflictException>())
                .Which.ErrorCode.Should()
                .Be("role-has-active-users");
        }
    }

    // ── ActivateAsync ────────────────────────────────────────────────────────

    public sealed class ActivateAsync : RoleServiceTests
    {
        [Fact]
        public async Task HappyPath_CallsActivateOnRepository()
        {
            var entity = MakeEntity("InactiveRole", isActive: false);

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.ActivateAsync(entity.Id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.ActivateAsync(entity.Id);

            RepositoryMock.Verify(
                r => r.ActivateAsync(entity.Id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);

            var act = () => Sut.ActivateAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    // ── GetAssignmentsAsync ──────────────────────────────────────────────────

    public sealed class GetAssignmentsAsync : RoleServiceTests
    {
        [Fact]
        public async Task HappyPath_ReturnsPagedProjections()
        {
            var entity = MakeEntity("Assigned");
            var projections = new List<RoleUserAssignmentProjection>
            {
                new()
                {
                    UserId = Guid.NewGuid(),
                    DisplayName = "Alice",
                    Email = "alice@test.com",
                    ClubId = Guid.NewGuid(),
                    ClubName = "Acme",
                },
            };

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r =>
                    r.GetAssignmentsAsync(
                        entity.Id,
                        PagingConstants.DefaultPage,
                        PagingConstants.DefaultPageSize,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((projections, 1));

            var result = await Sut.GetAssignmentsAsync(entity.Id, new RoleAssignmentsQuery());

            result.Items.Should().HaveCount(1);
            result.Items[0].DisplayName.Should().Be("Alice");
            result.TotalCount.Should().Be(1);
            result.Page.Should().Be(PagingConstants.DefaultPage);
            result.PageSize.Should().Be(PagingConstants.DefaultPageSize);
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((RoleEntity?)null);

            var act = () => Sut.GetAssignmentsAsync(Guid.NewGuid(), new RoleAssignmentsQuery());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task PassesPaginationParamsToRepository()
        {
            var entity = MakeEntity("Paged");

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r => r.GetAssignmentsAsync(entity.Id, 2, 5, It.IsAny<CancellationToken>()))
                .ReturnsAsync((new List<RoleUserAssignmentProjection>(), 0));

            await Sut.GetAssignmentsAsync(
                entity.Id,
                new RoleAssignmentsQuery { Page = 2, PageSize = 5 }
            );

            RepositoryMock.Verify(
                r => r.GetAssignmentsAsync(entity.Id, 2, 5, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    // ── UpdatePermissionsAsync ───────────────────────────────────────────────

    public sealed class UpdatePermissionsAsync : RoleServiceTests
    {
        [Fact]
        public async Task ReplacesPermissions_ReturnsUpdatedRole()
        {
            var permissions = new List<string>
            {
                "StarterKit.New.Permission",
                "StarterKit.Another.Permission",
            };
            var entity = MakeEntity("PermRole");
            var updatedEntity = MakeEntity(
                "PermRole",
                permissions: permissions
                    .Select(p => new RolePermissionEntity
                    {
                        Id = Guid.NewGuid(),
                        RoleId = entity.Id,
                        Permission = p,
                    })
                    .ToList()
            );
            updatedEntity.Id = entity.Id;

            RepositoryMock
                .Setup(r =>
                    r.ReplacePermissionsAsync(entity.Id, permissions, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(updatedEntity);

            var result = await Sut.UpdatePermissionsAsync(entity.Id, permissions);

            result.Permissions.Should().BeEquivalentTo(permissions);
        }

        [Fact]
        public async Task WhenRoleNotFound_ThrowsEntityNotFoundException()
        {
            RepositoryMock
                .Setup(r =>
                    r.ReplacePermissionsAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<IReadOnlyList<string>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException(nameof(RoleEntity), Guid.NewGuid()));

            var act = () =>
                Sut.UpdatePermissionsAsync(Guid.NewGuid(), ["StarterKit.Some.Permission"]);

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }
}
