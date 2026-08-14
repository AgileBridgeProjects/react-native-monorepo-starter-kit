using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Polly;
using Polly.Registry;
using StarterKit.Core.Notifications.Options;
using StarterKit.Core.Notifications.Services;
using StarterKit.Core.Tests.Notifications.Helpers;
using Twilio.Clients;
using Twilio.Http;

namespace StarterKit.Core.Tests.Notifications;

public abstract class TwilioSmsSenderTests
{
    protected readonly Mock<ITwilioRestClient> TwilioClientMock = new();
    protected readonly Mock<ResiliencePipelineProvider<string>> PipelinesMock = new();

    protected TwilioSmsSenderTests()
    {
        PipelinesMock
            .Setup(x => x.GetPipeline(It.IsAny<string>()))
            .Returns(ResiliencePipeline.Empty);

        // Default: successful Twilio response
        TwilioClientMock.Setup(x => x.AccountSid).Returns("ACtest");

        TwilioClientMock
            .Setup(x => x.RequestAsync(It.IsAny<Request>()))
            .ReturnsAsync(
                new Twilio.Http.Response(
                    HttpStatusCode.Created,
                    """
                    {
                        "account_sid":"ACtest","api_version":"2010-04-01",
                        "body":"test","date_created":null,"date_updated":null,
                        "date_sent":null,"direction":"outbound-api",
                        "error_code":null,"error_message":null,
                        "from":"+15005550006","messaging_service_sid":null,
                        "num_media":"0","num_segments":"1","price":null,
                        "price_unit":"USD","sid":"SMtest123","status":"queued",
                        "subresource_uris":{},"to":"+27821234567",
                        "uri":"/2010-04-01/Accounts/ACtest/Messages/SMtest123.json"
                    }
                    """
                )
            );
    }

    protected TwilioSmsSender BuildSut(TwilioOptions? options = null)
    {
        var opts = Options.Create(options ?? NotificationTestHelpers.FakeTwilioOptions());
        return new TwilioSmsSender(
            opts,
            TwilioClientMock.Object,
            PipelinesMock.Object,
            NullLogger<TwilioSmsSender>.Instance
        );
    }

    public sealed class WhenSmsSentSuccessfully : TwilioSmsSenderTests
    {
        [Fact]
        public async Task SendAsync_HappyPath_CallsTwilioClient()
        {
            var sut = BuildSut();
            var payload = NotificationTestHelpers.FakeSmsPayload();

            await sut.SendAsync(payload, "+27821234567");

            TwilioClientMock.Verify(x => x.RequestAsync(It.IsAny<Request>()), Times.Once);
        }

        [Fact]
        public async Task SendAsync_HappyPath_DoesNotThrow()
        {
            var sut = BuildSut();

            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");
            await act.Should().NotThrowAsync();
        }
    }

    public sealed class WhenTestCredentialsEnabled : TwilioSmsSenderTests
    {
        [Fact]
        public async Task SendAsync_UseTestCredentials_DoesNotThrow()
        {
            var sut = BuildSut(NotificationTestHelpers.FakeTwilioOptions(useTestCredentials: true));

            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task SendAsync_UseTestCredentials_MissingTestSid_ThrowsInvalidOperationException()
        {
            var opts = new TwilioOptions
            {
                AccountSid = "ACtest",
                AuthToken = "token",
                FromNumber = "+1234567890",
                UseTestCredentials = true,
                TestAccountSid = null, // missing
                TestAuthToken = null,
            };

            var sut = BuildSut(opts);

            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*UseTestCredentials*");
        }

        [Fact]
        public async Task SendAsync_UseTestCredentials_MissingTestFromNumber_ThrowsInvalidOperationException()
        {
            var opts = new TwilioOptions
            {
                AccountSid = "ACtest",
                AuthToken = "token",
                FromNumber = "+1234567890",
                UseTestCredentials = true,
                TestAccountSid = $"AC{new Bogus.Faker().Random.AlphaNumeric(32)}",
                TestAuthToken = new Bogus.Faker().Random.AlphaNumeric(32),
                TestFromNumber = null, // missing
            };

            var sut = BuildSut(opts);

            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");
            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*UseTestCredentials*");
        }
    }

    public sealed class WhenTwilioReturnsDeliveryFailure : TwilioSmsSenderTests
    {
        [Fact]
        public async Task SendAsync_TwilioReturnsFailed_ThrowsInvalidOperationException()
        {
            // Twilio can return HTTP 200 with status:"failed" in the body — this is the silent
            // killer that would go undetected without an explicit status check and test.
            TwilioClientMock
                .Setup(x => x.RequestAsync(It.IsAny<Request>()))
                .ReturnsAsync(
                    new Twilio.Http.Response(
                        HttpStatusCode.OK,
                        """
                        {
                            "account_sid":"ACtest","api_version":"2010-04-01",
                            "body":"test","date_created":null,"date_updated":null,
                            "date_sent":null,"direction":"outbound-api",
                            "error_code":30006,"error_message":"Landline or unreachable carrier",
                            "from":"+15005550006","messaging_service_sid":null,
                            "num_media":"0","num_segments":"1","price":null,
                            "price_unit":"USD","sid":"SMtest123","status":"failed",
                            "subresource_uris":{},"to":"+27821234567",
                            "uri":"/2010-04-01/Accounts/ACtest/Messages/SMtest123.json"
                        }
                        """
                    )
                );

            var sut = BuildSut();
            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*failed*");
        }

        [Fact]
        public async Task SendAsync_TwilioReturnsUndelivered_ThrowsInvalidOperationException()
        {
            // undelivered = message reached the carrier but wasn't delivered to the handset
            TwilioClientMock
                .Setup(x => x.RequestAsync(It.IsAny<Request>()))
                .ReturnsAsync(
                    new Twilio.Http.Response(
                        HttpStatusCode.OK,
                        """
                        {
                            "account_sid":"ACtest","api_version":"2010-04-01",
                            "body":"test","date_created":null,"date_updated":null,
                            "date_sent":null,"direction":"outbound-api",
                            "error_code":30003,"error_message":"Unreachable destination handset",
                            "from":"+15005550006","messaging_service_sid":null,
                            "num_media":"0","num_segments":"1","price":null,
                            "price_unit":"USD","sid":"SMtest123","status":"undelivered",
                            "subresource_uris":{},"to":"+27821234567",
                            "uri":"/2010-04-01/Accounts/ACtest/Messages/SMtest123.json"
                        }
                        """
                    )
                );

            var sut = BuildSut();
            var act = () => sut.SendAsync(NotificationTestHelpers.FakeSmsPayload(), "+27821234567");

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*undelivered*");
        }
    }
}
