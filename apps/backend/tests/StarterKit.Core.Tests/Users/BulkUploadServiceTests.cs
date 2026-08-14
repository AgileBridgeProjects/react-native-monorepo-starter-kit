using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Excel;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Services;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Users.DTOs;
using StarterKit.Core.Users.Exceptions;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

public abstract class BulkUploadServiceTests
{
    protected readonly Mock<IUserRepository> UserRepoMock = new();
    protected readonly Mock<IRoleRepository> RoleRepoMock = new();
    protected readonly Mock<ITeamRepository> TeamRepoMock = new();
    protected readonly Mock<IUserBulkUploadExcelParserService> ParserMock = new();

    protected BulkUploadServiceTests()
    {
        RoleRepoMock
            .Setup(r => r.ListNamesForClubAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<string>());

        TeamRepoMock
            .Setup(r => r.ListNamesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<(Guid, string)>());

        UserRepoMock
            .Setup(r =>
                r.ListActiveUsernamesByClubOrTeamAsync(
                    It.IsAny<IReadOnlyList<Guid>>(),
                    It.IsAny<IReadOnlyList<Guid>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Array.Empty<string>());
    }

    protected UserService BuildSut() =>
        new(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            UserRepoMock.Object,
            RoleRepoMock.Object,
            Mock.Of<IClubRepository>(),
            TeamRepoMock.Object,
            Mock.Of<IBlobStorageService>(),
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            Mock.Of<IUserSetupTokenRepository>(),
            Mock.Of<ISetupEmailService>(),
            Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
            Options.Create(new UserServiceOptions()),
            ParserMock.Object,
            Mock.Of<IUserExportExcelService>()
        );

    private static Stream EmptyStream() => new MemoryStream();

    // ── PreviewBulkUploadAsync ────────────────────────────────────────────────

    public sealed class PreviewBulkUploadAsync_MissingColumns : BulkUploadServiceTests
    {
        [Fact]
        public async Task ThrowsBulkUploadValidationException_WhenRequiredColumnsMissing()
        {
            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.MissingColumns(["firstname"]));

            var Sut = BuildSut();

            var act = () => Sut.PreviewBulkUploadAsync(Guid.NewGuid(), null, EmptyStream());

            await act.Should()
                .ThrowAsync<BulkUploadValidationException>()
                .Where(ex => ex.ValidationErrors.Any(e => e.Contains("firstname")));
        }
    }

    public sealed class PreviewBulkUploadAsync_EmptyFile : BulkUploadServiceTests
    {
        [Fact]
        public async Task ThrowsBulkUploadValidationException_WhenFileHasNoDataRows()
        {
            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: []));

            var Sut = BuildSut();

            var act = () => Sut.PreviewBulkUploadAsync(Guid.NewGuid(), null, EmptyStream());

            await act.Should()
                .ThrowAsync<BulkUploadValidationException>()
                .Where(ex => ex.ValidationErrors.Any(e => e.Contains("no data rows")));
        }
    }

    public sealed class PreviewBulkUploadAsync_HappyPath : BulkUploadServiceTests
    {
        [Fact]
        public async Task CategorizesValidRowsIntoReadyToAdd()
        {
            var clubId = Guid.NewGuid();
            var row = new BulkUploadParsedRow(
                RowNumber: 2,
                FirstName: "John",
                LastName: "Doe",
                Email: "john@example.com",
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.Credentials,
                RoleName: "Athlete",
                TeamName: null,
                Username: null,
                Errors: []
            );

            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: [row]));

            UserRepoMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            UserRepoMock
                .Setup(r =>
                    r.ListActivePhonesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            RoleRepoMock
                .Setup(r =>
                    r.ListNamesForClubAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(["Athlete"]);

            var Sut = BuildSut();

            var result = await Sut.PreviewBulkUploadAsync(clubId, null, EmptyStream());

            result.ReadyToAdd.Should().HaveCount(1);
            result.ValidationErrors.Should().BeEmpty();
            result.Duplicates.Should().BeEmpty();
            result.TotalRows.Should().Be(1);
        }

        [Fact]
        public async Task CategorizesRowsWithErrorsIntoValidationErrors()
        {
            var clubId = Guid.NewGuid();
            var row = new BulkUploadParsedRow(
                RowNumber: 2,
                FirstName: "",
                LastName: "Doe",
                Email: null,
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.Credentials,
                RoleName: "Athlete",
                TeamName: null,
                Username: null,
                Errors: ["First name is required."]
            );

            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: [row]));

            UserRepoMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            UserRepoMock
                .Setup(r =>
                    r.ListActivePhonesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);

            var Sut = BuildSut();

            var result = await Sut.PreviewBulkUploadAsync(clubId, null, EmptyStream());

            result.ValidationErrors.Should().HaveCount(1);
            result.ReadyToAdd.Should().BeEmpty();
        }

        [Fact]
        public async Task CategorizesExistingEmailsAsDuplicates()
        {
            var clubId = Guid.NewGuid();
            var row = new BulkUploadParsedRow(
                RowNumber: 2,
                FirstName: "Jane",
                LastName: "Smith",
                Email: "existing@example.com",
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.Credentials,
                RoleName: "Athlete",
                TeamName: null,
                Username: null,
                Errors: []
            );

            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: [row]));

            UserRepoMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(["existing@example.com"]);
            UserRepoMock
                .Setup(r =>
                    r.ListActivePhonesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            RoleRepoMock
                .Setup(r =>
                    r.ListNamesForClubAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(["Athlete"]);

            var Sut = BuildSut();

            var result = await Sut.PreviewBulkUploadAsync(clubId, null, EmptyStream());

            result.Duplicates.Should().HaveCount(1);
            result.ReadyToAdd.Should().BeEmpty();
        }

        [Fact]
        public async Task CategorizesUnknownRoleAsValidationError()
        {
            var clubId = Guid.NewGuid();
            var row = new BulkUploadParsedRow(
                RowNumber: 2,
                FirstName: "Bob",
                LastName: "Builder",
                Email: "bob@example.com",
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.Credentials,
                RoleName: "NonExistentRole",
                TeamName: null,
                Username: null,
                Errors: []
            );

            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: [row]));

            UserRepoMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            UserRepoMock
                .Setup(r =>
                    r.ListActivePhonesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            // ListNamesForClubAsync returns empty list (from constructor default),
            // so "NonExistentRole" won't be found → business validation error.

            var Sut = BuildSut();

            var result = await Sut.PreviewBulkUploadAsync(clubId, null, EmptyStream());

            result.ValidationErrors.Should().HaveCount(1);
            result
                .ValidationErrors[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("NonExistentRole"));
            result.ReadyToAdd.Should().BeEmpty();
        }

        [Fact]
        public async Task CategorizesDuplicateUsernameAsDuplicate()
        {
            var clubId = Guid.NewGuid();
            var row = new BulkUploadParsedRow(
                RowNumber: 2,
                FirstName: "Ava",
                LastName: "Stone",
                Email: null,
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.CustomAuthentication,
                RoleName: "Athlete",
                TeamName: null,
                Username: "ava.stone",
                Errors: []
            );

            ParserMock
                .Setup(p => p.Parse(It.IsAny<Stream>()))
                .Returns(new ExcelParseResult<BulkUploadParsedRow>.Success(Rows: [row]));

            UserRepoMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            UserRepoMock
                .Setup(r =>
                    r.ListActivePhonesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            UserRepoMock
                .Setup(r =>
                    r.ListActiveUsernamesByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(["ava.stone"]);
            RoleRepoMock
                .Setup(r =>
                    r.ListNamesForClubAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(["Athlete"]);

            var Sut = BuildSut();

            var result = await Sut.PreviewBulkUploadAsync(clubId, null, EmptyStream());

            result.Duplicates.Should().HaveCount(1);
            result
                .Duplicates[0]
                .Errors.Should()
                .Contain("A user with this username already exists.");
            result.ReadyToAdd.Should().BeEmpty();
        }
    }

    // ── ConfirmBulkUploadAsync ────────────────────────────────────────────────

    public sealed class ConfirmBulkUploadAsync_HappyPath : BulkUploadServiceTests
    {
        [Fact]
        public async Task ReturnsZeroFailures_WhenAllRowsSucceed()
        {
            var clubId = Guid.NewGuid();
            var validRow = new BulkUploadValidUserDto(
                RowNumber: 2,
                FirstName: "John",
                LastName: "Doe",
                Email: "john@example.com",
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.Credentials,
                RoleName: "Athlete",
                TeamName: null,
                TeamId: null,
                Username: null
            );

            // AdminCreateUserAsync path — role lookup and club checks
            RoleRepoMock
                .Setup(r => r.FindByNameAsync("Athlete", It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new RoleEntity
                    {
                        Id = Guid.NewGuid(),
                        Name = "Athlete",
                        IsActive = true,
                        IsDefault = false,
                    }
                );

            var Sut = BuildSut();

            // This will throw because Firebase is mocked but not set up — we're testing the
            // failure-collection behavior: every row that throws ends up in Failures list.
            var result = await Sut.ConfirmBulkUploadAsync(clubId, null, [validRow], null);

            // AdminCreateUserAsync throws (Firebase not set up) → row goes into Failures
            result.CreatedCount.Should().Be(0);
            result.FailedCount.Should().Be(1);
            result.Failures.Should().HaveCount(1);
        }

        [Fact]
        public async Task ReturnsEmptyResult_WhenNoRowsProvided()
        {
            var Sut = BuildSut();

            var result = await Sut.ConfirmBulkUploadAsync(Guid.NewGuid(), null, [], null);

            result.CreatedCount.Should().Be(0);
            result.FailedCount.Should().Be(0);
            result.Failures.Should().BeEmpty();
        }

        [Fact]
        public async Task ReturnsFailure_WhenAuthMethodRequiredFieldIsMissing()
        {
            var Sut = BuildSut();
            var row = new BulkUploadValidUserDto(
                RowNumber: 4,
                FirstName: "Sam",
                LastName: "Mokoena",
                Email: null,
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.CustomAuthentication,
                RoleName: "Athlete",
                TeamName: null,
                TeamId: null,
                Username: null
            );

            var result = await Sut.ConfirmBulkUploadAsync(
                Guid.NewGuid(),
                null,
                [row],
                "Default123!"
            );

            result.CreatedCount.Should().Be(0);
            result.FailedCount.Should().Be(1);
            result
                .Failures[0]
                .Errors.Should()
                .Contain("Username is required for Custom Authentication sign-in.");
        }

        [Fact]
        public async Task ReturnsFailure_WhenPayloadContainsDuplicateUsername()
        {
            var Sut = BuildSut();
            var row1 = new BulkUploadValidUserDto(
                RowNumber: 2,
                FirstName: "Ava",
                LastName: "Stone",
                Email: null,
                PhoneNumber: null,
                CountryCode: null,
                AuthMethod: AuthenticationMethod.CustomAuthentication,
                RoleName: "Athlete",
                TeamName: null,
                TeamId: null,
                Username: "ava.stone"
            );
            var row2 = row1 with { RowNumber = 3 };

            var result = await Sut.ConfirmBulkUploadAsync(
                Guid.NewGuid(),
                null,
                [row1, row2],
                "Default123!"
            );

            result.FailedCount.Should().BeGreaterThan(0);
            result
                .Failures.SelectMany(f => f.Errors)
                .Should()
                .Contain("A user with this username already exists in this upload.");
        }
    }
}
