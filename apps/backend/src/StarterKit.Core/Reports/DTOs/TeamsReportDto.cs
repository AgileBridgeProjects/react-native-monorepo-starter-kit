using StarterKit.Core.Common;

namespace StarterKit.Core.Reports.DTOs;

public sealed class TeamsReportDto
{
    public PagedResult<TeamReportItemDto> Teams { get; init; } =
        new()
        {
            Items = [],
            TotalCount = 0,
            Page = 1,
            PageSize = 20,
        };
    public decimal WeightedAverageParticipationRate { get; init; }
    public decimal UnweightedAverageParticipationRate { get; init; }
}
