using Bogus;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Resources;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.Core.Resources.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Resources.Enums;
using StarterKit.Data.Resources.Interfaces.Repositories;
using StarterKit.Data.Resources.Models;

namespace StarterKit.Core.Tests.Resources.Services;

public abstract class ResourceServiceTests
{
    private readonly Mock<IResourceRepository> _repositoryMock = new();
    private readonly Mock<IBlobStorageService> _blobStorageServiceMock = new();
    protected readonly IResourceService Sut;
    protected static readonly Faker Faker = new();

    protected ResourceServiceTests()
    {
        Sut = new ResourceService(
            _repositoryMock.Object,
            _blobStorageServiceMock.Object,
            Mock.Of<ILogger<ResourceService>>()
        );
    }

    protected Mock<IBlobStorageService> BlobStorageServiceMock => _blobStorageServiceMock;

    protected Resource BuildResource() =>
        new()
        {
            Id = Guid.NewGuid(),
            Title = Faker.Lorem.Sentence(3),
            SourceType = Faker.PickRandom<ResourceSourceType>(),
            StorageUrl = Faker.Internet.Url(),
        };

    protected Mock<IResourceRepository> RepositoryMock => _repositoryMock;

    public sealed class ListAsync : ResourceServiceTests
    {
        [Fact]
        public async Task ListAsync_WithQuery_ReturnsPagedResult()
        {
            var items = new[] { BuildResource(), BuildResource() };
            var query = new ResourceListQuery
            {
                Page = 1,
                PageSize = 10,
                FilterText = "abc",
            };

            RepositoryMock
                .Setup(r => r.ListAsync(1, 10, "abc", It.IsAny<CancellationToken>()))
                .ReturnsAsync((items, 2));

            var result = await Sut.ListAsync(query, CancellationToken.None);

            result.Items.Should().BeEquivalentTo(items);
            result.TotalCount.Should().Be(2);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
        }

        [Fact]
        public async Task ListAsync_WithOutOfRangePaging_UsesClampedValues()
        {
            var query = new ResourceListQuery { Page = -1, PageSize = 999 };

            RepositoryMock
                .Setup(r => r.ListAsync(1, 250, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Array.Empty<Resource>(), 0));

            var result = await Sut.ListAsync(query, CancellationToken.None);

            result.Page.Should().Be(1);
            result.PageSize.Should().Be(250);
        }
    }

    public sealed class GetAsync : ResourceServiceTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_ReturnsResource()
        {
            var resource = BuildResource();
            RepositoryMock
                .Setup(r => r.GetAsync(resource.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(resource);

            var result = await Sut.GetAsync(resource.Id, CancellationToken.None);

            result.Should().Be(resource);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.GetAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () => await Sut.GetAsync(id, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class FindByIdAsync : ResourceServiceTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsResource()
        {
            var resource = BuildResource();
            RepositoryMock
                .Setup(r => r.FindByIdAsync(resource.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(resource);

            var result = await Sut.FindByIdAsync(resource.Id, CancellationToken.None);

            result.Should().Be(resource);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.FindByIdAsync(id, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Resource?)null);

            var result = await Sut.FindByIdAsync(id, CancellationToken.None);

            result.Should().BeNull();
        }
    }

    public sealed class CreateAsync : ResourceServiceTests
    {
        [Fact]
        public async Task CreateAsync_WithValidParams_AddsAndReturnsResource()
        {
            var title = Faker.Lorem.Sentence(3);
            var sourceType = ResourceSourceType.Url;
            var expectedId = Guid.NewGuid();
            var expectedUrl = "resources/some-id/test.pdf";

            BlobStorageServiceMock
                .Setup(b =>
                    b.UploadAsync(
                        It.IsAny<string>(),
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new BlobUploadResult(expectedId, expectedUrl));

            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Resource>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(
                title,
                sourceType,
                new UploadedFile("test.pdf", "application/pdf", 0L, Stream.Null),
                CancellationToken.None
            );

            result.Title.Should().Be(title);
            result.SourceType.Should().Be(sourceType);
            result.StorageUrl.Should().Be(expectedUrl);
            result.Id.Should().Be(expectedId);

            RepositoryMock.Verify(
                r =>
                    r.AddAsync(
                        It.Is<Resource>(x => x.Title == title),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    public sealed class UpdateAsync : ResourceServiceTests
    {
        [Fact]
        public async Task UpdateAsync_WhenExists_UpdatesAndReturnsResource()
        {
            var resource = BuildResource();
            var newTitle = Faker.Lorem.Sentence(3);
            var newSourceType = ResourceSourceType.Text;
            var expectedUrl = "https://blob.example.com/resources/updated.pdf";

            BlobStorageServiceMock
                .Setup(b =>
                    b.UploadAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(expectedUrl);

            RepositoryMock
                .Setup(r => r.GetAsync(resource.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(resource);
            RepositoryMock
                .Setup(r => r.UpdateAsync(resource, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await Sut.UpdateAsync(
                resource.Id,
                newTitle,
                newSourceType,
                new UploadedFile("updated.pdf", "application/pdf", 0L, Stream.Null),
                CancellationToken.None
            );

            result.Title.Should().Be(newTitle);
            result.SourceType.Should().Be(newSourceType);
            result.StorageUrl.Should().Be(expectedUrl);
        }

        [Fact]
        public async Task UpdateAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.GetAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () =>
                await Sut.UpdateAsync(
                    id,
                    Faker.Lorem.Sentence(3),
                    ResourceSourceType.File,
                    new UploadedFile("file.pdf", "application/pdf", 0L, Stream.Null),
                    CancellationToken.None
                );

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class DeleteAsync : ResourceServiceTests
    {
        [Fact]
        public async Task DeleteAsync_WhenExists_CallsRepositoryDelete()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.DeleteAsync(id, CancellationToken.None);

            RepositoryMock.Verify(
                r => r.DeleteAsync(id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () => await Sut.DeleteAsync(id, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }
}
