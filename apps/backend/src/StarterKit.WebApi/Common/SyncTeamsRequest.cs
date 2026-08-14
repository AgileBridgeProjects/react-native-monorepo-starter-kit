namespace StarterKit.WebApi.Common;

public sealed class SyncTeamsRequest
{
    public IReadOnlyList<Guid> TeamIds { get; init; } = [];
}
