using Riok.Mapperly.Abstractions;
using StarterKit.Core.Auth.DTOs;
using StarterKit.MobileApi.Auth.DTOs;

namespace StarterKit.MobileApi.Auth.Mappers;

[Mapper]
public static partial class LinkedOrganisationMapper
{
    [MapProperty(nameof(LinkedOrganisation.LogoUrl), nameof(LinkedOrganisationDto.ClubLogoUrl))]
    public static partial LinkedOrganisationDto ToDto(this LinkedOrganisation model);

    public static partial IReadOnlyList<LinkedOrganisationDto> ToDtoList(
        this IReadOnlyList<LinkedOrganisation> models
    );
}
