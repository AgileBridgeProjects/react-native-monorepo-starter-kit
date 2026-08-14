using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Moq;
using StarterKit.Core.Dev;

namespace StarterKit.Core.Tests.Dev;

public sealed class DevClockGateTests
{
    private static IConfiguration ConfigWithoutWebsiteSiteName()
    {
        var mock = new Mock<IConfiguration>();
        mock.Setup(x => x["WEBSITE_SITE_NAME"]).Returns((string?)null);
        return mock.Object;
    }

    private static IConfiguration ConfigWithWebsiteSiteName()
    {
        var mock = new Mock<IConfiguration>();
        mock.Setup(x => x["WEBSITE_SITE_NAME"]).Returns("starterkit-mobileapi-dev");
        return mock.Object;
    }

    private static Mock<IHostEnvironment> EnvironmentNamed(string name)
    {
        var mock = new Mock<IHostEnvironment>();
        mock.Setup(x => x.EnvironmentName).Returns(name);
        return mock;
    }

    [Fact]
    public void IsLocalDevelopment_InDevelopmentWithNoWebsiteSiteName_ReturnsTrue()
    {
        var result = DevClockGate.IsLocalDevelopment(
            EnvironmentNamed("Development").Object,
            ConfigWithoutWebsiteSiteName()
        );

        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("Testing")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void IsLocalDevelopment_InNonDevelopmentEnvironment_ReturnsFalse(string environmentName)
    {
        var result = DevClockGate.IsLocalDevelopment(
            EnvironmentNamed(environmentName).Object,
            ConfigWithoutWebsiteSiteName()
        );

        result.Should().BeFalse();
    }

    [Fact]
    public void IsLocalDevelopment_InDevelopmentButRunningInAzureAppService_ReturnsFalse()
    {
        // Guards against a deployed Azure slot accidentally configured with
        // ASPNETCORE_ENVIRONMENT=Development — WEBSITE_SITE_NAME is always set by Azure
        // App Service regardless of that setting, so it must win over IsDevelopment().
        var result = DevClockGate.IsLocalDevelopment(
            EnvironmentNamed("Development").Object,
            ConfigWithWebsiteSiteName()
        );

        result.Should().BeFalse();
    }
}
