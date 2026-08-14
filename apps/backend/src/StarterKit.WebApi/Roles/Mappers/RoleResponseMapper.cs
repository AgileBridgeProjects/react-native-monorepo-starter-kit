using Riok.Mapperly.Abstractions;
using StarterKit.Core.Models;
using StarterKit.WebApi.Roles.DTOs;

namespace StarterKit.WebApi.Roles.Mappers;

[Mapper]
public static partial class RoleResponseMapper
{
    public static partial RoleResponse ToResponse(this Role role);
}
