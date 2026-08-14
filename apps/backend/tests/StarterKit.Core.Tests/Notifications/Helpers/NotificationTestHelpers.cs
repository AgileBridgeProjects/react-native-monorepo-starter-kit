using Bogus;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Options;

namespace StarterKit.Core.Tests.Notifications.Helpers;

/// <summary>
/// Shared Bogus-backed factories for Notifications-layer test data.
/// </summary>
internal static class NotificationTestHelpers
{
    private static readonly Faker Faker = new();

    public static NotificationRecipient FakeRecipient(
        bool withEmail = true,
        bool withPhone = true
    ) =>
        new(
            Email: withEmail ? Faker.Internet.Email() : null,
            PhoneNumber: withPhone ? Faker.Phone.PhoneNumber("+27##########") : null
        );

    public static EmailPayload FakeEmailPayload() =>
        new(Subject: Faker.Lorem.Sentence(3), HtmlContent: $"<p>{Faker.Lorem.Sentence()}</p>");

    public static SmsPayload FakeSmsPayload() => new(Faker.Lorem.Sentence(5));

    public static EmailOptions FakeEmailOptions() =>
        new()
        {
            ApiKey = $"re_{Faker.Random.AlphaNumeric(32)}",
            FromEmail = Faker.Internet.Email(),
            FromName = Faker.Company.CompanyName(),
        };

    public static TwilioOptions FakeTwilioOptions(bool useTestCredentials = false) =>
        new()
        {
            AccountSid = $"AC{Faker.Random.AlphaNumeric(32)}",
            AuthToken = Faker.Random.AlphaNumeric(32),
            FromNumber = Faker.Phone.PhoneNumber("+1##########"),
            UseTestCredentials = useTestCredentials,
            TestAccountSid = useTestCredentials ? $"AC{Faker.Random.AlphaNumeric(32)}" : null,
            TestAuthToken = useTestCredentials ? Faker.Random.AlphaNumeric(32) : null,
            TestFromNumber = useTestCredentials ? "+15005550006" : null,
        };
}
