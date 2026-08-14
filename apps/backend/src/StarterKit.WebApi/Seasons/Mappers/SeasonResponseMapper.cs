using Riok.Mapperly.Abstractions;
using StarterKit.Data.Seasons.Models;
using StarterKit.WebApi.Seasons.DTOs;

namespace StarterKit.WebApi.Seasons.Mappers;

[Mapper]
public static partial class SeasonResponseMapper
{
    [MapperIgnoreTarget(nameof(SeasonResponse.DisplayLabel))]
    public static partial SeasonResponse ToResponse(this Season season);
}
