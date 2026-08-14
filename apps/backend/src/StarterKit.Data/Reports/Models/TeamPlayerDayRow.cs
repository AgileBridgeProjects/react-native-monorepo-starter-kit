namespace StarterKit.Data.Reports.Models;

public sealed record TeamPlayerDayRow(Guid UserId, Guid TeamId, DateOnly Date);
