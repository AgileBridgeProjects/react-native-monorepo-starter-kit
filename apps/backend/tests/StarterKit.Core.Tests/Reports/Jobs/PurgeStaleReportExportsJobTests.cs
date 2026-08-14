using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Reports.Jobs;
using StarterKit.Core.Reports.Options;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;

namespace StarterKit.Core.Tests.Reports.Jobs;

public class PurgeStaleReportExportsJobTests
{
    private static PurgeStaleReportExportsJob CreateSut(
        Mock<IBlobStorageService> blob,
        int retentionHours
    )
    {
        var options = Options.Create(new ReportExportOptions { RetentionHours = retentionHours });
        return new PurgeStaleReportExportsJob(
            blob.Object,
            options,
            NullLogger<PurgeStaleReportExportsJob>.Instance
        );
    }

    [Fact]
    public async Task ExecuteAsync_DeletesReportExportBlobsOlderThanConfiguredRetention()
    {
        var blob = new Mock<IBlobStorageService>();
        blob.Setup(b =>
                b.DeleteOlderThanAsync(
                    It.IsAny<string>(),
                    It.IsAny<TimeSpan>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(3);

        await CreateSut(blob, retentionHours: 12).ExecuteAsync();

        blob.Verify(
            b =>
                b.DeleteOlderThanAsync(
                    BlobContainerName.ReportExports,
                    TimeSpan.FromHours(12),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_UsesTheDefaultRetentionWhenNotOverridden()
    {
        var blob = new Mock<IBlobStorageService>();
        blob.Setup(b =>
                b.DeleteOlderThanAsync(
                    It.IsAny<string>(),
                    It.IsAny<TimeSpan>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(0);

        // Default ReportExportOptions.RetentionHours is 24.
        await CreateSut(blob, retentionHours: new ReportExportOptions().RetentionHours)
            .ExecuteAsync();

        blob.Verify(
            b =>
                b.DeleteOlderThanAsync(
                    BlobContainerName.ReportExports,
                    TimeSpan.FromHours(24),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }
}
