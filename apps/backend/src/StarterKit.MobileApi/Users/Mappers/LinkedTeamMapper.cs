using Riok.Mapperly.Abstractions;
using StarterKit.Core.Models;
using StarterKit.MobileApi.Users.DTOs;

namespace StarterKit.MobileApi.Users.Mappers;

/// <summary>
/// Maps the coach onboarding linked-team shapes across the HTTP boundary. Shared by
/// <see cref="UsersController"/> and its MCP tool class so both expose an identical wire shape.
/// </summary>
[Mapper]
public static partial class LinkedTeamMapper
{
    public static partial LinkedTeamResponse ToResponse(this LinkedTeam model);

    public static partial IReadOnlyList<LinkedTeamResponse> ToResponseList(
        this IReadOnlyList<LinkedTeam> models
    );
}
