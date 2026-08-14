using Bogus;
using FluentAssertions;
using Hangfire;
using Hangfire.States;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Services;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Interfaces.Repositories;
using StarterKit.Data.Notifications.Models;

namespace StarterKit.Core.Tests.Notifications.Services;

public abstract class NotificationMessageServiceTests
{
    private readonly Mock<INotificationMessageRepository> _repositoryMock = new();
    private readonly Mock<IBackgroundJobClient> _backgroundJobClientMock = new();
    private readonly Mock<IBlobStorageService> _blobStorageServiceMock = new();
    protected readonly INotificationMessageService Sut;
    protected static readonly Faker Faker = new();

    protected NotificationMessageServiceTests()
    {
        Sut = new NotificationMessageService(
            _repositoryMock.Object,
            _backgroundJobClientMock.Object,
            _blobStorageServiceMock.Object,
            Options.Create(new MediaUploadOptions()),
            TimeProvider.System
        );
    }

    protected Mock<INotificationMessageRepository> RepositoryMock => _repositoryMock;
    protected Mock<IBackgroundJobClient> BackgroundJobClientMock => _backgroundJobClientMock;
    protected Mock<IBlobStorageService> BlobStorageServiceMock => _blobStorageServiceMock;

    protected static NotificationMessage BuildDraftMessage(
        Guid? clubId = null,
        Guid? teamId = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            Subject = Faker.Lorem.Sentence(3),
            Message = Faker.Lorem.Paragraph(),
            Channel = MessageChannel.Email,
            ClubId = clubId ?? Guid.NewGuid(),
            TeamId = teamId,
            Status = NotificationStatus.Draft,
            Attachments = [],
            CreatedAt = DateTime.UtcNow,
        };

    // ── CreateAsync ──────────────────────────────────────────────────────────

    public sealed class CreateAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task CreateAsync_WithNoAttachments_AddsDraftToRepository()
        {
            var clubId = Guid.NewGuid();
            NotificationMessage? captured = null;

            RepositoryMock
                .Setup(r =>
                    r.AddAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>())
                )
                .Callback<NotificationMessage, CancellationToken>((msg, _) => captured = msg)
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(
                "Test Subject",
                "<p>Hello</p>",
                MessageChannel.Email,
                clubId,
                null
            );

            RepositoryMock.Verify(
                r => r.AddAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>()),
                Times.Once
            );

            result.Should().NotBeNull();
            result.Subject.Should().Be("Test Subject");
            result.Message.Should().Be("<p>Hello</p>");
            result.Channel.Should().Be(MessageChannel.Email);
            result.ClubId.Should().Be(clubId);
            result.TeamId.Should().BeNull();
            result.Status.Should().Be(NotificationStatus.Draft);
            result.Attachments.Should().BeEmpty();
        }

        [Fact]
        public async Task CreateAsync_WithAttachments_UploadsToBlob()
        {
            var clubId = Guid.NewGuid();
            var attachments = new List<AttachmentInput>
            {
                new(
                    "report.pdf",
                    "application/pdf",
                    Convert.ToBase64String("test-content"u8.ToArray())
                ),
            };

            BlobStorageServiceMock
                .Setup(b =>
                    b.UploadAsync(
                        BlobContainerName.CommunicationAttachments,
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new BlobUploadResult(Guid.NewGuid(), "communication-attachments/report.pdf")
                );

            RepositoryMock
                .Setup(r =>
                    r.AddAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(
                "Report",
                "See attached",
                MessageChannel.Email,
                clubId,
                null,
                attachments
            );

            BlobStorageServiceMock.Verify(
                b =>
                    b.UploadAsync(
                        BlobContainerName.CommunicationAttachments,
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );

            result.Attachments.Should().HaveCount(1);
            result.Attachments[0].FileName.Should().Be("report.pdf");
        }

        [Fact]
        public async Task CreateAsync_WithTeamId_StoresTeamId()
        {
            var clubId = Guid.NewGuid();
            var teamId = Guid.NewGuid();

            RepositoryMock
                .Setup(r =>
                    r.AddAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(
                "Subject",
                "Message",
                MessageChannel.Sms,
                clubId,
                teamId
            );

            result.TeamId.Should().Be(teamId);
            result.Channel.Should().Be(MessageChannel.Sms);
        }
    }

    // ── GetAsync ─────────────────────────────────────────────────────────────

    public sealed class GetAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task GetAsync_ReturnsEntityFromRepository()
        {
            var expected = BuildDraftMessage();

            RepositoryMock
                .Setup(r => r.GetAsync(expected.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expected);

            var result = await Sut.GetAsync(expected.Id);

            result.Should().BeSameAs(expected);
        }
    }

    // ── ListAsync ────────────────────────────────────────────────────────────

    public sealed class ListAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task ListAsync_ReturnsPagedResult()
        {
            var clubId = Guid.NewGuid();
            var messages = new[] { BuildDraftMessage(clubId), BuildDraftMessage(clubId) };

            RepositoryMock
                .Setup(r =>
                    r.ListAsync(
                        clubId,
                        1,
                        10,
                        null,
                        null,
                        null,
                        null,
                        false,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(((IReadOnlyList<NotificationMessage>)messages, 2));

            var result = await Sut.ListAsync(clubId, 1, 10);

            result.Items.Should().HaveCount(2);
            result.TotalCount.Should().Be(2);
            result.Page.Should().Be(1);
            result.PageSize.Should().Be(10);
        }
    }

    // ── UpdateAsync ──────────────────────────────────────────────────────────

    public sealed class UpdateAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task UpdateAsync_DraftMessage_UpdatesFields()
        {
            var entity = BuildDraftMessage();

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r =>
                    r.UpdateAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var result = await Sut.UpdateAsync(
                entity.Id,
                "Updated Subject",
                "Updated Body",
                MessageChannel.Sms,
                entity.ClubId,
                null
            );

            result.Subject.Should().Be("Updated Subject");
            result.Message.Should().Be("Updated Body");
            result.Channel.Should().Be(MessageChannel.Sms);
        }

        [Fact]
        public async Task UpdateAsync_SentMessage_ThrowsInvalidOperationException()
        {
            var entity = BuildDraftMessage();
            entity.Status = NotificationStatus.Sent;

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var act = () =>
                Sut.UpdateAsync(
                    entity.Id,
                    "New Subject",
                    "New Body",
                    MessageChannel.Email,
                    entity.ClubId,
                    null
                );

            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*already been sent*");
        }
    }

    // ── DeleteAsync ──────────────────────────────────────────────────────────

    public sealed class DeleteAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task DeleteAsync_CallsRepository()
        {
            var id = Guid.NewGuid();

            RepositoryMock
                .Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.DeleteAsync(id);

            RepositoryMock.Verify(
                r => r.DeleteAsync(id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    // ── SendAsync ────────────────────────────────────────────────────────────

    public sealed class SendAsync : NotificationMessageServiceTests
    {
        [Fact]
        public async Task SendAsync_DraftMessage_EnqueuesBackgroundJobAndSetsSending()
        {
            var entity = BuildDraftMessage();

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);
            RepositoryMock
                .Setup(r =>
                    r.UpdateAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            BackgroundJobClientMock
                .Setup(c => c.Create(It.IsAny<Hangfire.Common.Job>(), It.IsAny<IState>()))
                .Returns("job-123");

            var result = await Sut.SendAsync(entity.Id);

            result.Status.Should().Be(NotificationStatus.Sending);
            result.BackgroundJobId.Should().Be("job-123");

            RepositoryMock.Verify(
                r => r.UpdateAsync(It.IsAny<NotificationMessage>(), It.IsAny<CancellationToken>()),
                Times.AtLeast(1)
            );
        }

        [Fact]
        public async Task SendAsync_AlreadySent_ThrowsInvalidOperationException()
        {
            var entity = BuildDraftMessage();
            entity.Status = NotificationStatus.Sent;

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var act = () => Sut.SendAsync(entity.Id);

            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*already sending or has been sent*");
        }

        [Fact]
        public async Task SendAsync_AlreadySending_ThrowsInvalidOperationException()
        {
            var entity = BuildDraftMessage();
            entity.Status = NotificationStatus.Sending;

            RepositoryMock
                .Setup(r => r.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var act = () => Sut.SendAsync(entity.Id);

            await act.Should()
                .ThrowAsync<InvalidOperationException>()
                .WithMessage("*already sending or has been sent*");
        }
    }
}
