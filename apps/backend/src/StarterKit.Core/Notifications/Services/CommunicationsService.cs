using Hangfire;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.Notifications.AdminComms;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;
using StarterKit.Core.Notifications.Exceptions;
using StarterKit.Core.Notifications.Helpers;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Notifications.Services;

public sealed class CommunicationsService(
    IUserRepository userRepository,
    INotificationDispatcher dispatcher,
    IBackgroundJobClient backgroundJobClient,
    IOptions<CommunicationsOptions> options,
    ILogger<CommunicationsService> logger
) : ICommunicationsService
{
    public async Task<DispatchResult> SendEmailAsync(
        SendEmailCommand command,
        CancellationToken cancellationToken = default
    )
    {
        ValidateRecipients(command.ClubIds, command.TeamIds);
        ValidateMessage(command.Message);

        var recipients = await userRepository.ListActiveEmailsByClubOrTeamAsync(
            command.ClubIds,
            command.TeamIds,
            cancellationToken
        );

        if (recipients.Count == 0)
            throw new NoEligibleRecipientsException(NotificationChannel.Email);

        var notification = new AdminCommunicationEmail
        {
            Subject = command.Subject,
            Message = command.Message,
            Attachments = command.Attachments,
        };

        return await DispatchAsync(
            recipients,
            notification,
            channel: NotificationChannel.Email,
            buildRecipient: email => new NotificationRecipient(email, null),
            maskForLog: PiiMasker.MaskEmail,
            cancellationToken
        );
    }

    public async Task<DispatchResult> SendSmsAsync(
        SendSmsCommand command,
        CancellationToken cancellationToken = default
    )
    {
        ValidateRecipients(command.ClubIds, command.TeamIds);
        ValidateMessage(command.Message);

        if (command.Message.Length > SmsLimits.MaxMessageLength)
            throw new SmsMessageTooLongException(command.Message.Length);

        var recipients = await userRepository.ListActivePhonesByClubOrTeamAsync(
            command.ClubIds,
            command.TeamIds,
            cancellationToken
        );

        if (recipients.Count == 0)
            throw new NoEligibleRecipientsException(NotificationChannel.Sms);

        var notification = new AdminCommunicationSms { Message = command.Message };

        return await DispatchAsync(
            recipients,
            notification,
            channel: NotificationChannel.Sms,
            buildRecipient: phone => new NotificationRecipient(null, phone),
            maskForLog: PiiMasker.MaskPhone,
            cancellationToken
        );
    }

    public async Task<DispatchResult> SendInAppAsync(
        SendInAppCommand command,
        CancellationToken cancellationToken = default
    )
    {
        ValidateRecipients(command.ClubIds, command.TeamIds);
        ValidateMessage(command.Message);

        var userIds = await userRepository.ListActiveUserIdsByClubOrTeamAsync(
            command.ClubIds,
            command.TeamIds,
            cancellationToken
        );

        if (userIds.Count == 0)
            throw new NoEligibleRecipientsException(NotificationChannel.InApp);

        backgroundJobClient.Enqueue<IContentAssignedDispatchJob>(j =>
            j.ExecuteAsync(
                PushNotificationType.AdminMessage,
                command.Subject,
                command.Message,
                userIds,
                0,
                command.MediaUrl,
                JobCancellationToken.Null
            )
        );

        logger.LogInformation("In-app communication queued for {Total} user(s)", userIds.Count);

        return new DispatchResult(userIds.Count, userIds.Count, 0);
    }

    private static void ValidateRecipients(IReadOnlyList<Guid> clubIds, IReadOnlyList<Guid> teamIds)
    {
        if (clubIds.Count == 0 && teamIds.Count == 0)
            throw new InvalidRecipientsException();
    }

    private static void ValidateMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            throw new EmptyMessageException();
    }

    private async Task<DispatchResult> DispatchAsync(
        IReadOnlyList<string> recipients,
        Notification notification,
        NotificationChannel channel,
        Func<string, NotificationRecipient> buildRecipient,
        Func<string, string> maskForLog,
        CancellationToken cancellationToken
    )
    {
        int delivered = 0;
        int failed = 0;

        await Parallel.ForEachAsync(
            recipients,
            new ParallelOptions
            {
                MaxDegreeOfParallelism = options.Value.MaxDegreeOfParallelism,
                CancellationToken = cancellationToken,
            },
            async (recipient, ct) =>
            {
                try
                {
                    await dispatcher.SendAsync(
                        notification,
                        buildRecipient(recipient),
                        cancellationToken: ct
                    );
                    Interlocked.Increment(ref delivered);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to dispatch {Channel} to {Recipient}",
                        channel,
                        maskForLog(recipient)
                    );
                    Interlocked.Increment(ref failed);
                }
            }
        );

        logger.LogInformation(
            "{Channel} communication sent — Total: {Total}, Delivered: {Delivered}, Failed: {Failed}",
            channel,
            recipients.Count,
            delivered,
            failed
        );

        return new DispatchResult(recipients.Count, delivered, failed);
    }
}
