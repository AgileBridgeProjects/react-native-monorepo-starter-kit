using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Core.Users.Interfaces.Services;

public interface IUserExportExcelService
{
    /// <summary>
    /// Renders the supplied user list as an XLSX byte array.
    /// </summary>
    /// <param name="users">Pre-fetched user entities (including UserRoles navigation).</param>
    /// <param name="teamNames">Map of team ID → team name for the club.</param>
    byte[] Generate(IReadOnlyList<UserEntity> users, IReadOnlyDictionary<Guid, string> teamNames);
}
