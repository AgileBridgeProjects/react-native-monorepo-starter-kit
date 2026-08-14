using Riok.Mapperly.Abstractions;
using StarterKit.Core.Users.DTOs;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Users.Mappers;

[Mapper]
public static partial class BulkUploadMapper
{
    public static partial BulkUploadValidRowRequest ToValidRowRequest(
        this BulkUploadValidUserDto dto
    );

    public static partial BulkUploadValidUserDto ToValidUserDto(
        this BulkUploadValidRowRequest request
    );

    public static partial BulkUploadInvalidRowResponse ToInvalidRowResponse(
        this BulkUploadInvalidRowDto dto
    );
}
