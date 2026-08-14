using Riok.Mapperly.Abstractions;
using StarterKit.Core.Models;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Users.Mappers;

[Mapper]
public static partial class UserResponseMapper
{
    [MapperIgnoreTarget(nameof(UserResponse.SetupLink))]
    public static partial UserResponse ToResponse(this User user);

    public static UserResponse ToResponse(this User user, string? setupLink)
    {
        var response = user.ToResponse();
        response.SetupLink = setupLink;
        return response;
    }
}
