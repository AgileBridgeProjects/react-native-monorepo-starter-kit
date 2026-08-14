using Riok.Mapperly.Abstractions;
using StarterKit.Data.Resources.Models;
using StarterKit.WebApi.Resources.DTOs;

namespace StarterKit.WebApi.Resources.Mappers;

[Mapper]
public static partial class ResourceResponseMapper
{
    public static partial ResourceResponse ToResponse(this Resource resource);
}
