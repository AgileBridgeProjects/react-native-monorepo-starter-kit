using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Dev;
using StarterKit.Core.Dev.Options;

namespace StarterKit.Core.Tests.Dev;

public sealed class DevClockTimeProviderTests
{
    private readonly Mock<IOptionsMonitor<DevClockOptions>> optionsMock = new();

    [Fact]
    public void GetUtcNow_WithNoOverride_ReturnsRealSystemTime()
    {
        optionsMock.Setup(x => x.CurrentValue).Returns(new DevClockOptions { OverrideUtc = null });
        var sut = new DevClockTimeProvider(optionsMock.Object);

        var result = sut.GetUtcNow();

        result.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void GetUtcNow_WithBlankOverride_ReturnsRealSystemTime()
    {
        optionsMock.Setup(x => x.CurrentValue).Returns(new DevClockOptions { OverrideUtc = "   " });
        var sut = new DevClockTimeProvider(optionsMock.Object);

        var result = sut.GetUtcNow();

        result.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void GetUtcNow_WithOverrideSet_FreezesToThatInstant()
    {
        optionsMock
            .Setup(x => x.CurrentValue)
            .Returns(new DevClockOptions { OverrideUtc = "2026-07-29T21:30:00Z" });
        var sut = new DevClockTimeProvider(optionsMock.Object);

        var first = sut.GetUtcNow();
        var second = sut.GetUtcNow();

        var expected = new DateTimeOffset(2026, 7, 29, 21, 30, 0, TimeSpan.Zero);
        first.Should().Be(expected);
        second.Should().Be(expected);
    }

    [Fact]
    public void GetUtcNow_WithOverrideLackingUtcMarker_AssumesUtc()
    {
        optionsMock
            .Setup(x => x.CurrentValue)
            .Returns(new DevClockOptions { OverrideUtc = "2026-07-29T21:30:00" });
        var sut = new DevClockTimeProvider(optionsMock.Object);

        var result = sut.GetUtcNow();

        result.Should().Be(new DateTimeOffset(2026, 7, 29, 21, 30, 0, TimeSpan.Zero));
    }

    [Fact]
    public void GetUtcNow_WithUnparsableOverride_FallsBackToRealSystemTime()
    {
        optionsMock
            .Setup(x => x.CurrentValue)
            .Returns(new DevClockOptions { OverrideUtc = "not-a-date" });
        var sut = new DevClockTimeProvider(optionsMock.Object);

        var result = sut.GetUtcNow();

        result.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void GetUtcNow_ReReadsOptionsOnEveryCall_SoEditingAppsettingsNeedsNoRestart()
    {
        var current = new DevClockOptions { OverrideUtc = null };
        optionsMock.Setup(x => x.CurrentValue).Returns(() => current);
        var sut = new DevClockTimeProvider(optionsMock.Object);

        sut.GetUtcNow().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));

        current = new DevClockOptions { OverrideUtc = "2026-01-01T00:00:00Z" };

        sut.GetUtcNow().Should().Be(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
    }
}
