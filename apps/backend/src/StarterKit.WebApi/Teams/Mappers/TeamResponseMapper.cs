using Riok.Mapperly.Abstractions;
using StarterKit.Data.Teams.Models;
using StarterKit.WebApi.Teams.DTOs;

namespace StarterKit.WebApi.Teams.Mappers;

[Mapper]
public static partial class TeamResponseMapper
{
    [MapperIgnoreTarget(nameof(TeamResponse.UserCount))]
    public static partial TeamResponse ToResponse(this Team team);

    public static TeamResponse ToResponse(this TeamListItem item) =>
        item.Team.ToResponse() with
        {
            UserCount = item.UserCount,
        };
}
