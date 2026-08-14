using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Polly;
using Polly.Registry;
using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Options;
using StarterKit.Core.Notifications.Services;
using StarterKit.Core.Tests.Notifications.Helpers;

namespace StarterKit.Core.Tests.Notifications;

public abstract class ResendEmailSenderTests
{
    protected readonly Mock<ResiliencePipelineProvider<string>> PipelinesMock = new();
    protected HttpRequestMessage? CapturedRequest;
    protected JsonElement CapturedRequestBody;
    protected ResendEmailSender Sut = null!;

    protected ResendEmailSenderTests()
    {
        PipelinesMock
            .Setup(x => x.GetPipeline(It.IsAny<string>()))
            .Returns(ResiliencePipeline.Empty);
    }

    protected ResendEmailSender BuildSut(
        EmailOptions? options = null,
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string responseBody = "{}",
        Exception? throwException = null
    )
    {
        var handler = new FakeHttpMessageHandler(
            async (request, ct) =>
            {
                CapturedRequest = request;
                if (request.Content is not null)
                {
                    var body = await request.Content.ReadAsStringAsync(ct);
                    CapturedRequestBody = JsonDocument.Parse(body).RootElement.Clone();
                }

                if (throwException is not null)
                    throw throwException;

                return new HttpResponseMessage(statusCode)
                {
                    Content = new StringContent(responseBody),
                };
            }
        );

        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://api.resend.com/"),
        };

        return new ResendEmailSender(
            Options.Create(options ?? NotificationTestHelpers.FakeEmailOptions()),
            httpClient,
            PipelinesMock.Object,
            NullLogger<ResendEmailSender>.Instance
        );
    }

    private sealed class FakeHttpMessageHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responder
    ) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        ) => responder(request, cancellationToken);
    }

    public sealed class WhenEmailSentSuccessfully : ResendEmailSenderTests
    {
        [Fact]
        public async Task SendAsync_HappyPath_DoesNotThrow()
        {
            Sut = BuildSut();
            var payload = NotificationTestHelpers.FakeEmailPayload();

            var act = () => Sut.SendAsync(payload, new Bogus.Faker().Internet.Email());
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task SendAsync_SetsCorrectToAddress()
        {
            Sut = BuildSut();
            var toEmail = new Bogus.Faker().Internet.Email();
            await Sut.SendAsync(NotificationTestHelpers.FakeEmailPayload(), toEmail);

            CapturedRequestBody
                .GetProperty("to")
                .EnumerateArray()
                .Should()
                .ContainSingle(t => t.GetString() == toEmail);
        }

        [Fact]
        public async Task SendAsync_SetsFromEmailAndNameFromOptions()
        {
            var opts = NotificationTestHelpers.FakeEmailOptions();
            Sut = BuildSut(opts);
            await Sut.SendAsync(
                NotificationTestHelpers.FakeEmailPayload(),
                new Bogus.Faker().Internet.Email()
            );

            CapturedRequestBody
                .GetProperty("from")
                .GetString()
                .Should()
                .Be($"{opts.FromName} <{opts.FromEmail}>");
        }

        [Fact]
        public async Task SendAsync_TemplateKey_RendersEmbeddedTemplate()
        {
            Sut = BuildSut();
            var payload = new EmailPayload(
                Subject: "Set up your StarterKit account",
                TemplateKey: EmailTemplateKeys.AccountSetup,
                TemplateData: new SetupEmailTemplateData("Ada", "https://example.com/setup", 48)
            );

            await Sut.SendAsync(payload, new Bogus.Faker().Internet.Email());

            var html = CapturedRequestBody.GetProperty("html").GetString();
            html.Should().Contain("Ada").And.Contain("https://example.com/setup").And.Contain("48");
        }

        [Fact]
        public async Task SendAsync_WrapsBodyInSharedLayout()
        {
            Sut = BuildSut();
            var payload = new EmailPayload(
                Subject: "Set up your StarterKit account",
                TemplateKey: EmailTemplateKeys.AccountSetup,
                TemplateData: new SetupEmailTemplateData("Ada", "https://example.com/setup", 48)
            );

            await Sut.SendAsync(payload, new Bogus.Faker().Internet.Email());

            // The content template is just a body fragment; _Layout.html supplies the shared
            // chrome (doctype, brand header, footer). Assert the layout wrapped the body.
            var html = CapturedRequestBody.GetProperty("html").GetString();
            html.Should().StartWith("<!DOCTYPE html>");
            html.Should().Contain("Play. Learn. Grow."); // shared footer
            html.Should().Contain("Set up your account"); // body CTA
        }
    }

    public sealed class WhenFromOverridesProvided : ResendEmailSenderTests
    {
        [Fact]
        public async Task SendAsync_WithFromOverride_UsesOverrideAddress()
        {
            Sut = BuildSut();
            var payload = new EmailPayload(
                Subject: "Test",
                HtmlContent: "<p>Hi</p>",
                FromEmailOverride: "noreply@override.co.za",
                FromNameOverride: "Override Sender"
            );
            await Sut.SendAsync(payload, new Bogus.Faker().Internet.Email());

            CapturedRequestBody
                .GetProperty("from")
                .GetString()
                .Should()
                .Be("Override Sender <noreply@override.co.za>");
        }
    }

    public sealed class WhenResendReturnsError : ResendEmailSenderTests
    {
        [Fact]
        public async Task SendAsync_Returns400_ThrowsInvalidOperationException()
        {
            Sut = BuildSut(
                statusCode: HttpStatusCode.BadRequest,
                responseBody: "{\"message\":\"Bad Request\"}"
            );
            var act = () =>
                Sut.SendAsync(
                    NotificationTestHelpers.FakeEmailPayload(),
                    new Bogus.Faker().Internet.Email()
                );

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*BadRequest*");
        }

        [Fact]
        public async Task SendAsync_Returns401_ThrowsInvalidOperationException()
        {
            // 401 = invalid API key — the most common silent failure in production
            Sut = BuildSut(
                statusCode: HttpStatusCode.Unauthorized,
                responseBody: "{\"message\":\"Unauthorized\"}"
            );
            var act = () =>
                Sut.SendAsync(
                    NotificationTestHelpers.FakeEmailPayload(),
                    new Bogus.Faker().Internet.Email()
                );

            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*Unauthorized*");
        }

        [Fact]
        public async Task SendAsync_Returns500_ThrowsInvalidOperationException()
        {
            Sut = BuildSut(
                statusCode: HttpStatusCode.InternalServerError,
                responseBody: "{\"message\":\"Server Error\"}"
            );
            var act = () =>
                Sut.SendAsync(
                    NotificationTestHelpers.FakeEmailPayload(),
                    new Bogus.Faker().Internet.Email()
                );

            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*InternalServerError*");
        }
    }

    public sealed class WhenResendClientThrows : ResendEmailSenderTests
    {
        [Fact]
        public async Task SendAsync_ClientThrowsHttpRequestException_PropagatesException()
        {
            // Simulates network failure / timeout — should never swallow the exception
            Sut = BuildSut(throwException: new HttpRequestException("Connection refused"));
            var act = () =>
                Sut.SendAsync(
                    NotificationTestHelpers.FakeEmailPayload(),
                    new Bogus.Faker().Internet.Email()
                );

            await act.Should().ThrowAsync<HttpRequestException>();
        }
    }
}
