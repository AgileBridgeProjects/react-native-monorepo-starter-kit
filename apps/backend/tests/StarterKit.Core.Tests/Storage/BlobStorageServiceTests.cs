using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage;

namespace StarterKit.Core.Tests.Storage;

public sealed class BlobStorageServiceTests
{
    private readonly Mock<BlobServiceClient> _blobServiceClientMock = new();
    private readonly Mock<BlobContainerClient> _containerClientMock = new();

    public BlobStorageServiceTests()
    {
        _blobServiceClientMock
            .Setup(s => s.GetBlobContainerClient(It.IsAny<string>()))
            .Returns(_containerClientMock.Object);
    }

    private Mock<BlobClient> SetupBlobClientMock(Uri blobUri, Uri? sasUri = null)
    {
        var blobClientMock = new Mock<BlobClient>();
        blobClientMock.SetupGet(b => b.Uri).Returns(blobUri);
        blobClientMock.SetupGet(b => b.BlobContainerName).Returns("container");
        blobClientMock.SetupGet(b => b.Name).Returns("blob");
        blobClientMock
            .Setup(b =>
                b.UploadAsync(
                    It.IsAny<Stream>(),
                    It.IsAny<BlobHttpHeaders>(),
                    It.IsAny<IDictionary<string, string>>(),
                    It.IsAny<BlobRequestConditions>(),
                    It.IsAny<IProgress<long>>(),
                    It.IsAny<AccessTier?>(),
                    It.IsAny<Azure.Storage.StorageTransferOptions>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Mock.Of<Azure.Response<BlobContentInfo>>());

        // Return the provided sasUri (or a default) from GenerateSasUri so tests can
        // verify the SAS URL is returned rather than the raw blob URI.
        var resolvedSasUri = sasUri ?? new Uri(blobUri + "?sv=2024-11-04&sp=r&se=fake");
        blobClientMock
            .Setup(b => b.GenerateSasUri(It.IsAny<BlobSasBuilder>()))
            .Returns(resolvedSasUri);

        _containerClientMock
            .Setup(c => c.GetBlobClient(It.IsAny<string>()))
            .Returns(blobClientMock.Object);
        return blobClientMock;
    }

    private BlobStorageService CreateSut(AzureStorageOptions? options = null) =>
        new(
            _blobServiceClientMock.Object,
            Options.Create(options ?? new AzureStorageOptions()),
            TimeProvider.System
        );

    [Fact]
    public async Task UploadAsync_WithConnectionString_ReturnsBlobPath()
    {
        var blobUri = new Uri("https://storageaccount.blob.core.windows.net/resources/id/file.pdf");
        var sasUri = new Uri(blobUri + "?sv=2024-11-04&sp=r&se=fake-expiry&sig=fake");
        SetupBlobClientMock(blobUri, sasUri);

        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );
        var file = new UploadedFile(
            "file.pdf",
            "application/pdf",
            5L,
            new MemoryStream(new byte[] { 1, 2, 3, 4, 5 })
        );

        var result = await sut.UploadAsync("resources", "id/file.pdf", file);

        // UploadAsync returns the stable blob path so callers can persist it without expiry concerns.
        result.Should().Be("resources/id/file.pdf");
        result.Should().NotContain("sv=");
    }

    [Fact]
    public async Task UploadAsync_AlwaysReturnsBlobPath_RegardlessOfPublicEndpoint()
    {
        // Arrange: BlobServiceClient resolves to an internal azurite base URI.
        var internalBase = new Uri("http://azurite:10000/devstoreaccount1");
        _blobServiceClientMock.SetupGet(s => s.Uri).Returns(internalBase);

        var internalBlobUri = new Uri(
            "http://azurite:10000/devstoreaccount1/topic-images/id/cover.jpg"
        );
        var internalSasUri = new Uri(
            "http://azurite:10000/devstoreaccount1/topic-images/id/cover.jpg?sv=2024-11-04&sp=r&se=fake&sig=fake"
        );
        SetupBlobClientMock(internalBlobUri, internalSasUri);

        var sut = CreateSut(
            new AzureStorageOptions
            {
                ConnectionString =
                    "UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://azurite",
                PublicBlobEndpoint = "http://localhost:10000/devstoreaccount1",
            }
        );

        var file = new UploadedFile(
            "cover.jpg",
            "image/jpeg",
            3L,
            new MemoryStream(new byte[] { 1, 2, 3 })
        );

        var result = await sut.UploadAsync("topic-images", "id/cover.jpg", file);

        // UploadAsync always returns the stable blob path regardless of PublicBlobEndpoint.
        result.Should().Be("topic-images/id/cover.jpg");
        result.Should().NotContain("sv=");
    }

    [Fact]
    public async Task UploadAsync_WhenNoPublicEndpoint_ReturnsBlobPath()
    {
        var blobUri = new Uri(
            "https://storageaccount.blob.core.windows.net/topic-images/id/cover.jpg"
        );
        var sasUri = new Uri(
            "https://storageaccount.blob.core.windows.net/topic-images/id/cover.jpg?sv=2024-11-04&sp=r&se=fake&sig=fake"
        );
        SetupBlobClientMock(blobUri, sasUri);

        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );
        var file = new UploadedFile(
            "cover.jpg",
            "image/jpeg",
            3L,
            new MemoryStream(new byte[] { 1, 2, 3 })
        );

        var result = await sut.UploadAsync("topic-images", "id/cover.jpg", file);

        result.Should().Be("topic-images/id/cover.jpg");
        result.Should().NotContain("sv=");
    }

    [Fact]
    public async Task GenerateSasUriAsync_WithConnectionString_ReturnsSasUri()
    {
        var blobUri = new Uri("https://storageaccount.blob.core.windows.net/resources/id/file.pdf");
        var sasUri = new Uri(blobUri + "?sv=2024-11-04&sp=r&se=fake-expiry&sig=fake");
        SetupBlobClientMock(blobUri, sasUri);

        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );

        var result = await sut.GenerateSasUriAsync("resources", "id/file.pdf");

        result.Should().Be(sasUri.ToString());
        result.Should().Contain("sv=");
    }

    [Fact]
    public async Task GenerateSasUriAsync_WithPublicBlobEndpoint_RewritesInternalUri()
    {
        var internalBase = new Uri("http://azurite:10000/devstoreaccount1");
        _blobServiceClientMock.SetupGet(s => s.Uri).Returns(internalBase);

        var internalBlobUri = new Uri(
            "http://azurite:10000/devstoreaccount1/topic-images/id/cover.jpg"
        );
        var internalSasUri = new Uri(
            "http://azurite:10000/devstoreaccount1/topic-images/id/cover.jpg?sv=2024-11-04&sp=r&se=fake&sig=fake"
        );
        SetupBlobClientMock(internalBlobUri, internalSasUri);

        var sut = CreateSut(
            new AzureStorageOptions
            {
                ConnectionString =
                    "UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://azurite",
                PublicBlobEndpoint = "http://localhost:10000/devstoreaccount1",
            }
        );

        var result = await sut.GenerateSasUriAsync("topic-images", "id/cover.jpg");

        result
            .Should()
            .StartWith("http://localhost:10000/devstoreaccount1/topic-images/id/cover.jpg");
        result.Should().Contain("sv=");
    }

    [Fact]
    public async Task ResolveStoredPathAsync_WithNullPath_ReturnsNull()
    {
        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );

        var result = await sut.ResolveStoredPathAsync(null);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ResolveStoredPathAsync_WithEmptyPath_ReturnsNull()
    {
        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );

        var result = await sut.ResolveStoredPathAsync(string.Empty);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ResolveStoredPathAsync_WithLegacyHttpUrl_ReturnsUnchanged()
    {
        // A URL for a different host (not our Azure account) passes through unchanged.
        var sut = CreateSut(
            new AzureStorageOptions
            {
                ConnectionString = "UseDevelopmentStorage=true",
                AccountName = "ststarterkitdev",
            }
        );
        var externalUrl = "https://example.com/images/cover.jpg";

        var result = await sut.ResolveStoredPathAsync(externalUrl);

        result.Should().Be(externalUrl);
    }

    [Fact]
    public async Task ResolveStoredPathAsync_WithLegacyAzureBlobUrl_GeneratesSasUri()
    {
        // Legacy rows stored the raw Azure Blob URL (no SAS). These 409 with public access
        // disabled. The service detects the account host and converts to a SAS URL.
        var rawBlobUrl =
            "https://ststarterkitdev.blob.core.windows.net/topic-images/abc123/cover.jpg";
        var blobUri = new Uri(
            "https://ststarterkitdev.blob.core.windows.net/topic-images/abc123/cover.jpg"
        );
        var sasUri = new Uri(
            "https://ststarterkitdev.blob.core.windows.net/topic-images/abc123/cover.jpg?sv=2024-11-04&sp=r&se=fake&sig=fake"
        );
        SetupBlobClientMock(blobUri, sasUri);

        var sut = CreateSut(
            new AzureStorageOptions
            {
                ConnectionString = "UseDevelopmentStorage=true",
                AccountName = "ststarterkitdev",
            }
        );

        var result = await sut.ResolveStoredPathAsync(rawBlobUrl);

        result.Should().Be(sasUri.ToString());
        result.Should().Contain("sv=");
    }

    [Fact]
    public async Task ResolveStoredPathAsync_WithBlobPath_GeneratesSasUri()
    {
        var blobUri = new Uri(
            "https://storageaccount.blob.core.windows.net/topic-images/id/cover.jpg"
        );
        var sasUri = new Uri(
            "https://storageaccount.blob.core.windows.net/topic-images/id/cover.jpg?sv=2024-11-04&sp=r&se=fake&sig=fake"
        );
        SetupBlobClientMock(blobUri, sasUri);

        var sut = CreateSut(
            new AzureStorageOptions { ConnectionString = "UseDevelopmentStorage=true" }
        );

        var result = await sut.ResolveStoredPathAsync("topic-images/id/cover.jpg");

        result.Should().Be(sasUri.ToString());
        result.Should().Contain("sv=");
    }
}
