namespace StarterKit.WebApi.Session;

public sealed class SessionTimeoutOptions
{
    public const string Section = "Session";

    public int IdleTimeoutMinutes { get; init; } = 30;
    public int AbsoluteTimeoutHours { get; init; } = 8;
    public int WarningMinutes { get; init; } = 5;

    public TimeSpan IdleTimeout => TimeSpan.FromMinutes(IdleTimeoutMinutes);
    public TimeSpan AbsoluteTimeout => TimeSpan.FromHours(AbsoluteTimeoutHours);
    public TimeSpan WarningPeriod => TimeSpan.FromMinutes(WarningMinutes);
}
