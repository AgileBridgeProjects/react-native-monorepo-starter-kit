using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.Auth.DTOs;
using StarterKit.Core.Auth.Mappers;
using StarterKit.Core.Common;
using StarterKit.Core.Configuration;
using StarterKit.Core.Excel;
using StarterKit.Core.Helpers;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Users;
using StarterKit.Core.Users.DTOs;
using StarterKit.Core.Users.Exceptions;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Services;

public partial class UserService : IUserService
{
    // Per-club locks so the MaxAthletes check-and-create is effectively atomic
    // within a single process. Guards against concurrent sign-ins racing past the cap.
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> _clubLocks = new();

    private readonly IAuthClaimsService _authClaimsService;
    private readonly IAuthUserProvisioningService _authProvisioningService;
    private readonly TimeProvider _clock;
    private readonly ILogger<UserService> _logger;
    private readonly IUserRepository _userRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IClubRepository _clubRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IBlobStorageService _blobStorageService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IUserSetupTokenRepository _setupTokenRepository;
    private readonly ISetupEmailService _setupEmailService;
    private readonly AccountSetupOptions _accountSetupOptions;
    private readonly UserServiceOptions _userServiceOptions;
    private readonly IUserBulkUploadExcelParserService _bulkUploadParser;
    private readonly IUserExportExcelService _exportExcelService;

    public UserService(
        IAuthClaimsService authClaimsService,
        IAuthUserProvisioningService authProvisioningService,
        TimeProvider clock,
        ILogger<UserService> logger,
        IUserRepository userRepository,
        IRoleRepository roleRepository,
        IClubRepository clubRepository,
        ITeamRepository teamRepository,
        IBlobStorageService blobStorageService,
        IHttpClientFactory httpClientFactory,
        IUserSetupTokenRepository setupTokenRepository,
        ISetupEmailService setupEmailService,
        IOptions<AccountSetupOptions> accountSetupOptions,
        IOptions<UserServiceOptions> userServiceOptions,
        IUserBulkUploadExcelParserService bulkUploadParser,
        IUserExportExcelService exportExcelService
    )
    {
        _authClaimsService = authClaimsService;
        _authProvisioningService = authProvisioningService;
        _clock = clock;
        _logger = logger;
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _clubRepository = clubRepository;
        _teamRepository = teamRepository;
        _blobStorageService = blobStorageService;
        _httpClientFactory = httpClientFactory;
        _setupTokenRepository = setupTokenRepository;
        _setupEmailService = setupEmailService;
        _accountSetupOptions = accountSetupOptions.Value;
        _userServiceOptions = userServiceOptions.Value;
        _bulkUploadParser = bulkUploadParser;
        _exportExcelService = exportExcelService;
    }

    /// <summary>
    /// Returns <c>true</c> when the <paramref name="externalAuthId"/> is a real provisioned auth
    /// user id (a Supabase <c>sub</c> UUID). Guards against empty ids and legacy placeholder
    /// prefixes (<c>pending-</c> / <c>ms:</c>) left over from the Firebase/Entra era.
    /// </summary>
    private static bool HasRealAuthUid([NotNullWhen(true)] string? externalAuthId) =>
        !string.IsNullOrEmpty(externalAuthId)
        && !externalAuthId.StartsWith("pending-", StringComparison.Ordinal)
        && !externalAuthId.StartsWith("ms:", StringComparison.Ordinal);

    /// <summary>
    /// Throws <see cref="ConflictException"/> if the <paramref name="email"/> is already
    /// associated with another user. Pass <paramref name="excludeUserId"/> when updating
    /// an existing user so the check ignores the user being edited.
    /// </summary>
    private async Task EnsureEmailAvailableAsync(
        string? email,
        Guid clubId,
        Guid? excludeUserId,
        CancellationToken cancellationToken,
        string? excludeExternalAuthId = null
    )
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var existing = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (existing is null)
            return;
        if (excludeUserId.HasValue && existing.Id == excludeUserId.Value)
            return;

        // When a user is linked across clubs (same Firebase UID, different entities),
        // FindByEmailAsync may return the other-club entity first. Treat it as the same
        // person and skip the conflict — they share the same Firebase identity.
        if (
            !string.IsNullOrEmpty(excludeExternalAuthId)
            && existing.ExternalAuthId == excludeExternalAuthId
        )
            return;

        if (existing.ClubId != clubId)
        {
            if (existing.UserRoles.Any(ur => ur.Role.IsElevated))
                throw new ConflictException(
                    "This user is an administrator in another organisation and cannot be added here.",
                    errorCode: "admin-user-cannot-be-linked"
                );

            throw new ConflictException(
                "A user with this email already exists in another club.",
                errorCode: "user-exists-other-club",
                conflictingEntityId: existing.Id
            );
        }

        throw new ConflictException(
            "A user with this email already exists in this club.",
            errorCode: "email-conflict"
        );
    }

    /// <summary>
    /// Throws <see cref="ConflictException"/> if the <paramref name="phoneNumber"/> is already
    /// associated with another user. Pass <paramref name="excludeUserId"/> when updating
    /// an existing user so the check ignores the user being edited.
    /// </summary>
    private async Task EnsurePhoneAvailableAsync(
        string? phoneNumber,
        Guid clubId,
        Guid? excludeUserId,
        CancellationToken cancellationToken,
        string? excludeExternalAuthId = null
    )
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return;

        var normalisedPhone = PhoneHelper.NormalisePhone(phoneNumber);
        var existing = await _userRepository.FindByPhoneAsync(normalisedPhone, cancellationToken);
        if (existing is null)
            return;
        if (excludeUserId.HasValue && existing.Id == excludeUserId.Value)
            return;

        // Same linked-user exclusion as EnsureEmailAvailableAsync — see comment there.
        if (
            !string.IsNullOrEmpty(excludeExternalAuthId)
            && existing.ExternalAuthId == excludeExternalAuthId
        )
            return;

        if (existing.ClubId != clubId)
        {
            if (existing.UserRoles.Any(ur => ur.Role.IsElevated))
                throw new ConflictException(
                    "This user is an administrator in another organisation and cannot be added here.",
                    errorCode: "admin-user-cannot-be-linked"
                );

            throw new ConflictException(
                "A user with this phone number already exists in another club.",
                errorCode: "user-exists-other-club",
                conflictingEntityId: existing.Id
            );
        }

        throw new ConflictException(
            "A user with this phone number already exists in this club.",
            errorCode: "phone-conflict"
        );
    }

    /// <summary>
    /// Throws <see cref="ConflictException"/> with error code <c>username-conflict</c>
    /// if the username is already taken (across all clubs — usernames are global).
    /// No-ops when <paramref name="username"/> is null or whitespace.
    /// </summary>
    private async Task EnsureUsernameAvailableAsync(
        string? username,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(username))
            return;

        var existing = await _userRepository.FindByUsernameAsync(username, cancellationToken);
        if (existing is null)
            return;

        throw new ConflictException(
            "A user with this username already exists.",
            errorCode: "username-conflict"
        );
    }

    /// <summary>
    /// Throws <see cref="ConflictException"/> with error code <c>max-users-reached</c>
    /// if the club has a <see cref="Club.MaxAthletes"/> cap and it has been reached.
    /// Must be called inside a per-club lock.
    /// </summary>
    private async Task EnforceMaxUsersAsync(Club club, CancellationToken cancellationToken)
    {
        if (!club.MaxAthletes.HasValue)
            return;

        var activeCount = await _userRepository.CountActiveByClubAsync(club.Id, cancellationToken);
        if (activeCount >= club.MaxAthletes.Value)
            throw new ConflictException(
                "User limit reached for this club.",
                errorCode: "max-users-reached"
            );
    }

    public async Task<User> GetOrCreateAsync(
        string externalAuthId,
        string email,
        string displayName,
        Guid clubId,
        string? photoUrl = null,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _userRepository.FindByExternalAuthIdAndClubAsync(
            externalAuthId,
            clubId,
            cancellationToken
        );

        if (entity is not null)
            return entity.ToModel();

        // Fallback: the ExternalAuthId may have just been updated by
        // RoleClaimsTransformer (first-login email linking). Re-check by email
        // to avoid creating a duplicate user row.
        if (!string.IsNullOrEmpty(email))
        {
            var byEmail = await _userRepository.FindByEmailAsync(email, cancellationToken);
            if (byEmail is not null && byEmail.ClubId == clubId)
            {
                // Ensure the ExternalAuthId is up-to-date on this row.
                if (byEmail.ExternalAuthId != externalAuthId)
                {
                    await _userRepository.UpdateExternalAuthIdAsync(
                        byEmail.Id,
                        externalAuthId,
                        cancellationToken
                    );
                }

                return byEmail.ToModel();
            }
        }

        // Enforce MaxUsers limit before creating the new user record.
        // Use a per-club lock to prevent concurrent sign-ins from racing past the cap.
        var clubLock = _clubLocks.GetOrAdd(clubId, _ => new SemaphoreSlim(1, 1));
        await clubLock.WaitAsync(cancellationToken);
        try
        {
            var club = await _clubRepository.GetAsync(clubId, cancellationToken);
            if (club is not null)
                await EnforceMaxUsersAsync(club, cancellationToken);

            _logger.LogInformation(
                "Creating new user for ExternalAuthId {ExternalAuthId} in club {ClubId}",
                externalAuthId,
                clubId
            );

            var newEntity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = externalAuthId,
                Email = email,
                DisplayName = displayName,
                ClubId = clubId,
                CreatedAt = _clock.Now(),
            };

            await _userRepository.CreateAsync(newEntity, cancellationToken);

            // Seed avatar from OAuth provider photo URL (Google / Microsoft) on first creation.
            // Download the external image and re-upload to blob storage so we own the asset.
            if (!string.IsNullOrWhiteSpace(photoUrl))
            {
                try
                {
                    var httpClient = _httpClientFactory.CreateClient("avatar-seed");
                    using var response = await httpClient.GetAsync(
                        photoUrl,
                        HttpCompletionOption.ResponseHeadersRead,
                        cancellationToken
                    );
                    if (response.IsSuccessStatusCode)
                    {
                        var contentType = response.Content.Headers.ContentType?.MediaType;
                        if (!string.IsNullOrWhiteSpace(contentType))
                        {
                            await using var stream = await response.Content.ReadAsStreamAsync(
                                cancellationToken
                            );
                            var blobName = BlobName.ForEntity(newEntity.Id, "avatar");
                            var storedPath = await _blobStorageService.UploadAsync(
                                BlobContainerName.UserAvatars,
                                blobName,
                                new UploadedFile("avatar", contentType, -1, stream),
                                cancellationToken
                            );
                            newEntity.AvatarUrl = storedPath;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to seed avatar from OAuth provider for user {UserId}",
                        newEntity.Id
                    );
                }
            }

            // Assign default role on creation
            var defaultRole = await _roleRepository.FindDefaultRoleAsync(cancellationToken);

            if (defaultRole is not null)
            {
                await _roleRepository.CreateAssignmentAsync(
                    new UserRoleAssignmentEntity
                    {
                        UserId = newEntity.Id,
                        RoleId = defaultRole.Id,
                        AssignedAt = _clock.Now(),
                    },
                    cancellationToken
                );
            }

            await _userRepository.SaveChangesAsync(cancellationToken);

            // Set the club_id custom claim in Firebase so it is embedded in the
            // user's JWT on their next token refresh — no manual script needed.
            // Skip for Microsoft Entra users (externalAuthId prefixed with "ms:") —
            // they are not Firebase users and have no Firebase UID.
            if (!externalAuthId.StartsWith("ms:", StringComparison.Ordinal))
            {
                await _authClaimsService.SetClubClaimAsync(
                    externalAuthId,
                    clubId,
                    null,
                    cancellationToken
                );
            }

            return newEntity.ToModel();
        }
        finally
        {
            clubLock.Release();
        }
    }

    public async Task<User> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity =
            await _userRepository.FindByIdWithRolesAsync(id, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), id);

        var model = entity.ToModel();
        model.IsSharedAcrossClubs = await _userRepository.IsSharedAcrossClubsAsync(
            id,
            cancellationToken
        );
        // TeamIds comes from the eagerly-loaded UserTeams navigation via ToModel(); only the
        // guardian links still need their own query.
        var dependentUserIds = await _userRepository.ListDependentIdsForGuardianAsync(
            id,
            cancellationToken
        );
        model.DependentUserIds = dependentUserIds is null ? [] : [.. dependentUserIds];
        return model;
    }

    public async Task<User?> GetByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _userRepository.FindByExternalAuthIdAsync(
            externalAuthId,
            cancellationToken
        );

        return entity?.ToModel();
    }

    public async Task<User?> GetByExternalAuthIdAndClubAsync(
        string externalAuthId,
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _userRepository.FindByExternalAuthIdAndClubAsync(
            externalAuthId,
            clubId,
            cancellationToken
        );

        return entity?.ToModel();
    }

    public async Task<IEnumerable<Role>> GetUserRolesAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var roleNames = await _roleRepository.GetRoleNamesForUserAsync(userId, cancellationToken);
        return roleNames.Select(name => new Role { Name = name });
    }

    public async Task<User> AssignRoleAsync(
        Guid userId,
        string roleName,
        CancellationToken cancellationToken = default
    )
    {
        var userExists = await _userRepository.ExistsAsync(userId, cancellationToken);
        if (!userExists)
            throw new EntityNotFoundException(nameof(User), userId);

        var roleEntity =
            await _roleRepository.FindByNameAsync(roleName, cancellationToken)
            ?? throw new ArgumentException(
                $"Role '{roleName}' does not exist in the database.",
                nameof(roleName)
            );

        if (!roleEntity.IsActive)
            throw new ValidationException(
                $"Role '{roleName}' is inactive and cannot be assigned.",
                errorCode: "role-inactive"
            );

        var exists = await _roleRepository.AssignmentExistsAsync(
            userId,
            roleEntity.Id,
            cancellationToken
        );

        if (!exists)
        {
            await _roleRepository.CreateAssignmentAsync(
                new UserRoleAssignmentEntity
                {
                    UserId = userId,
                    RoleId = roleEntity.Id,
                    AssignedAt = _clock.Now(),
                },
                cancellationToken
            );

            await _userRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Assigned role {Role} to user {UserId}", roleName, userId);
        }

        var entity =
            await _userRepository.FindByIdWithRolesAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        return entity.ToModel();
    }

    public async Task<IReadOnlySet<string>> GetUserPermissionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        return await _roleRepository.GetPermissionsForUserAsync(userId, cancellationToken);
    }

    public async Task UpdateLastLoginAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await _userRepository.UpdateLastLoginAsync(userId, cancellationToken);
    }

    public async Task SetActiveAsync(
        Guid userId,
        bool isActive,
        CancellationToken cancellationToken = default
    )
    {
        await _userRepository.SetActiveAsync(userId, isActive, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        // When suspending a user, revoke their Firebase refresh tokens so existing
        // sessions are invalidated immediately rather than lingering until JWT expiry.
        if (!isActive)
        {
            // SetActiveAsync succeeded above, so the user must exist — but guard explicitly
            // rather than silently skipping revocation if something unexpected happens.
            var entity =
                await _userRepository.FindByIdAsync(userId, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(User), userId);

            if (HasRealAuthUid(entity.ExternalAuthId))
            {
                try
                {
                    await _authClaimsService.RevokeRefreshTokensAsync(
                        entity.ExternalAuthId,
                        cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to revoke Firebase refresh tokens for user {UserId} — "
                            + "the user may remain signed in until their current JWT expires",
                        userId
                    );
                }
            }
        }
    }

    public async Task<User> LinkToClubAsync(
        Guid userId,
        Guid clubId,
        string role,
        CancellationToken cancellationToken = default
    )
    {
        // Throws EntityNotFoundException → 404 if club does not exist
        var club = await _clubRepository.GetAsync(clubId, cancellationToken);

        var clubLock = _clubLocks.GetOrAdd(clubId, _ => new SemaphoreSlim(1, 1));
        await clubLock.WaitAsync(cancellationToken);
        try
        {
            await EnforceMaxUsersAsync(club, cancellationToken);

            // userId belongs to a different club than the calling admin (that's why the
            // create flow returned 'user-exists-other-club'). The standard tenant-filtered
            // lookup would 404 — use the explicit cross-tenant accessor.
            var sourceUser =
                await _userRepository.FindByIdWithRolesAcrossTenantsAsync(userId, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(User), userId);

            // Elevated-role users cannot be shared across organisations — block the link entirely.
            if (sourceUser.UserRoles.Any(ur => ur.Role.IsElevated))
                throw new ConflictException(
                    "This user is an administrator in another organisation and cannot be added here.",
                    errorCode: "admin-user-cannot-be-linked"
                );

            // If the user already has a sibling record in the target club, just ensure the
            // role assignment exists. Otherwise create a new (clubId-scoped) record sharing
            // the original ExternalAuthId so one Firebase identity backs both records and the
            // user appears in the target club's grid immediately.
            var targetEntity = await _userRepository.FindByExternalAuthIdAndClubAsync(
                sourceUser.ExternalAuthId,
                clubId,
                cancellationToken
            );

            if (targetEntity is null)
            {
                targetEntity = new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ExternalAuthId = sourceUser.ExternalAuthId,
                    ClubId = clubId,
                    Email = sourceUser.Email,
                    PhoneNumber = sourceUser.PhoneNumber,
                    AuthMethod = sourceUser.AuthMethod,
                    DisplayName = sourceUser.DisplayName,
                    IsActive = true,
                    CreatedAt = _clock.Now(),
                };
                await _userRepository.CreateAsync(targetEntity, cancellationToken);
            }

            var roleEntity =
                await _roleRepository.FindByNameAsync(role, cancellationToken)
                ?? throw new ArgumentException(
                    $"Role '{role}' does not exist in the database.",
                    nameof(role)
                );

            if (!roleEntity.IsActive)
                throw new ValidationException(
                    $"Role '{role}' is inactive and cannot be assigned.",
                    errorCode: "role-inactive"
                );

            // Elevated roles cannot be assigned when linking a user to an additional club —
            // after the link this user will be shared, which violates the elevated-single-org rule.
            if (roleEntity.IsElevated)
                throw new ConflictException(
                    "Admin roles cannot be assigned to users who are shared across multiple organisations.",
                    errorCode: "admin-role-multi-club"
                );

            var roleAssigned = await _roleRepository.AssignmentExistsAsync(
                targetEntity.Id,
                roleEntity.Id,
                cancellationToken
            );

            if (!roleAssigned)
            {
                await _roleRepository.CreateAssignmentAsync(
                    new UserRoleAssignmentEntity
                    {
                        UserId = targetEntity.Id,
                        RoleId = roleEntity.Id,
                        AssignedAt = _clock.Now(),
                    },
                    cancellationToken
                );
            }

            await _userRepository.SaveChangesAsync(cancellationToken);

            if (HasRealAuthUid(targetEntity.ExternalAuthId))
            {
                await _authClaimsService.SetClubClaimAsync(
                    targetEntity.ExternalAuthId,
                    clubId,
                    null,
                    cancellationToken
                );
            }

            var withRoles =
                await _userRepository.FindByIdWithRolesAcrossTenantsAsync(
                    targetEntity.Id,
                    cancellationToken
                ) ?? targetEntity;

            return withRoles.ToModel();
        }
        finally
        {
            clubLock.Release();
        }
    }

    public async Task<User> LinkExternalAuthIdAsync(
        Guid userId,
        string newExternalAuthId,
        CancellationToken cancellationToken = default
    )
    {
        var entity =
            await _userRepository.FindByIdWithRolesAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException($"User {userId} not found.");

        entity.ExternalAuthId = newExternalAuthId;
        await _userRepository.SaveChangesAsync(cancellationToken);

        var club = await _clubRepository.FindByIdAsync(entity.ClubId, cancellationToken);
        await _authClaimsService.SetClubClaimAsync(
            newExternalAuthId,
            entity.ClubId,
            null,
            cancellationToken
        );

        return entity.ToModel();
    }

    public async Task<IPagedResult<User>> ListAsync(
        UserQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var filter = new UserFilter
        {
            ClubId = query.ClubId,
            TeamId = query.TeamId,
            IsActive = query.IsActive,
            AuthMethod = query.AuthMethod,
            RoleName = query.RoleName,
            HasPendingSetup = query.SetupStatus == Enums.SetupStatus.PendingSetup ? true : null,
            HasExpiredSetup = query.SetupStatus == Enums.SetupStatus.SetupExpired ? true : null,
            FilterText = query.FilterText,
            SortBy = query.SortBy,
            SortDescending = query.SortDescending,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };

        var (items, totalCount) = await _userRepository.ListAsync(filter, cancellationToken);

        var userIds = items.Select(e => e.Id).ToList();

        var sharedAuthIds = await _userRepository.GetSharedExternalAuthIdsAsync(
            items.Select(e => e.ExternalAuthId),
            cancellationToken
        );

        // Fetch setup token states in one query for all Credentials users who haven't logged in.
        var credentialUserIds = items
            .Where(e => e.AuthMethod == AuthenticationMethod.Credentials && e.LastLoginAt == null)
            .Select(e => e.Id)
            .ToList();

        var setupStatuses =
            credentialUserIds.Count > 0
                ? await _setupTokenRepository.GetSetupStatusBulkAsync(
                    credentialUserIds,
                    cancellationToken
                )
                : [];

        var models = items
            .Select(e =>
            {
                var u = e.ToModel();
                u.IsSharedAcrossClubs = sharedAuthIds.Contains(e.ExternalAuthId);

                if (setupStatuses.TryGetValue(e.Id, out var isActive))
                    u.SetupStatus = isActive
                        ? Enums.SetupStatus.PendingSetup
                        : Enums.SetupStatus.SetupExpired;

                return u;
            })
            .ToList();

        using var gate = new SemaphoreSlim(_userServiceOptions.MaxAvatarConcurrency);
        await Task.WhenAll(
            models
                .Where(u => u.AvatarUrl is not null)
                .Select(async u =>
                {
                    await gate.WaitAsync(cancellationToken);
                    try
                    {
                        u.AvatarUrl = await _blobStorageService.ResolveStoredPathAsync(
                            u.AvatarUrl,
                            cancellationToken
                        );
                    }
                    finally
                    {
                        gate.Release();
                    }
                })
        );

        return new PagedResult<User>
        {
            Items = models,
            TotalCount = totalCount,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };
    }

    public async Task UpdateDisplayNameAsync(
        Guid userId,
        string displayName,
        CancellationToken cancellationToken = default
    )
    {
        var entity =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        entity.DisplayName = displayName;
        await _userRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<User?> GetByEmailAsync(
        string email,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _userRepository.FindByEmailAsync(email, cancellationToken);

        return entity?.ToModel();
    }

    public async Task UpdateExternalAuthIdAsync(
        Guid userId,
        string externalAuthId,
        CancellationToken cancellationToken = default
    )
    {
        await _userRepository.UpdateExternalAuthIdAsync(userId, externalAuthId, cancellationToken);
    }

    public async Task<IReadOnlyList<Role>> ListRolesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var roles = await _roleRepository.ListAsync(
            excludeSystemRoles: false,
            includeInactive: true,
            cancellationToken
        );
        return roles.Select(r => r.ToModel()).ToList();
    }

    public async Task<(User User, string? SetupLink)> AdminCreateUserAsync(
        AdminCreateUserCommand command,
        CancellationToken cancellationToken = default
    )
    {
        var club =
            await _clubRepository.GetAsync(command.ClubId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Club), command.ClubId);

        var clubLock = _clubLocks.GetOrAdd(command.ClubId, _ => new SemaphoreSlim(1, 1));
        await clubLock.WaitAsync(cancellationToken);
        try
        {
            await EnforceMaxUsersAsync(club, cancellationToken);

            // Check for duplicate by email or phone
            await EnsureEmailAvailableAsync(
                command.Email,
                command.ClubId,
                excludeUserId: null,
                cancellationToken
            );
            await EnsurePhoneAvailableAsync(
                command.PhoneNumber,
                command.ClubId,
                excludeUserId: null,
                cancellationToken
            );
            await EnsureUsernameAvailableAsync(command.Username, cancellationToken);

            var dobError = GetAthleteDateOfBirthValidationError(
                command.RoleName,
                command.DateOfBirth
            );
            if (dobError is not null)
                throw new ValidationException(
                    dobError.Value.Message,
                    errorCode: dobError.Value.ErrorCode
                );

            EnsureJerseyNumberInRange(command.JerseyNumber, nameof(command.JerseyNumber));

            await EnsureLinkedTeamsAndDependentsBelongToClubAsync(
                command.ClubId,
                command.TeamIds,
                command.DependentUserIds,
                cancellationToken
            );

            var displayName = $"{command.FirstName.Trim()} {command.LastName.Trim()}".Trim();

            _logger.LogInformation(
                "AdminCreateUser: AuthMethod={AuthMethod}, Email={Email}, Phone={Phone}, ClubId={ClubId}",
                command.AuthMethod,
                command.Email,
                command.PhoneNumber,
                command.ClubId
            );

            // Provision Firebase user for all auth methods — Firebase manages
            // email/password, Google, Microsoft and phone providers.
            if (
                command.AuthMethod == AuthenticationMethod.CustomAuthentication
                && string.IsNullOrWhiteSpace(command.Username)
            )
                throw new ArgumentException(
                    "Username is required for CustomAuthentication users.",
                    nameof(command)
                );

            string? externalAuthId = null;
            if (
                !string.IsNullOrWhiteSpace(command.Username)
                && command.AuthMethod == AuthenticationMethod.CustomAuthentication
            )
            {
                if (string.IsNullOrWhiteSpace(command.Password))
                    throw new ArgumentException(
                        "Password is required for CustomAuthentication users.",
                        nameof(command)
                    );

                externalAuthId = await _authProvisioningService.CreateUserByUsernameAsync(
                    command.Username,
                    command.Password,
                    displayName,
                    cancellationToken
                );
            }
            else if (!string.IsNullOrWhiteSpace(command.Email))
            {
                externalAuthId = await _authProvisioningService.CreateUserByEmailAsync(
                    command.Email,
                    displayName,
                    command.AuthMethod,
                    cancellationToken
                );
            }
            else if (!string.IsNullOrWhiteSpace(command.PhoneNumber))
            {
                externalAuthId = await _authProvisioningService.CreateUserByPhoneAsync(
                    command.PhoneNumber,
                    displayName,
                    cancellationToken
                );
            }

            _logger.LogInformation(
                "AdminCreateUser: Firebase provisioning result - ExternalAuthId={ExternalAuthId}",
                externalAuthId ?? "(null)"
            );

            var newEntity = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = externalAuthId ?? string.Empty,
                ClubId = command.ClubId,
                Email = command.Email ?? string.Empty,
                PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber)
                    ? null
                    : PhoneHelper.NormalisePhone(command.PhoneNumber),
                Username = string.IsNullOrWhiteSpace(command.Username) ? null : command.Username,
                AuthMethod = command.AuthMethod,
                DisplayName = displayName,
                IsActive = true,
                DateOfBirth = command.DateOfBirth,
                Position = command.Position,
                JerseyNumber = command.JerseyNumber,
                CreatedAt = _clock.Now(),
            };

            await _userRepository.CreateAsync(newEntity, cancellationToken);

            var role =
                await _roleRepository.FindByNameAsync(command.RoleName, cancellationToken)
                ?? throw new EntityNotFoundException(nameof(RoleEntity), command.RoleName);

            if (!role.IsActive)
                throw new ValidationException(
                    $"Role '{command.RoleName}' is inactive and cannot be assigned.",
                    errorCode: "role-inactive"
                );

            await _roleRepository.CreateAssignmentAsync(
                new UserRoleAssignmentEntity
                {
                    UserId = newEntity.Id,
                    RoleId = role.Id,
                    AssignedAt = _clock.Now(),
                },
                cancellationToken
            );

            // Persist to DB. If this fails (e.g. constraint violation) we must roll back the
            // Firebase user that was already provisioned, so both systems stay in sync.
            try
            {
                await _userRepository.SaveChangesAsync(cancellationToken);
            }
            catch (Exception dbEx)
            {
                // Only rollback real Firebase users — pending-ms365 placeholders
                // don't exist in Firebase and would fail deletion.
                if (HasRealAuthUid(externalAuthId))
                {
                    try
                    {
                        await _authProvisioningService.DeleteUserAsync(
                            externalAuthId,
                            cancellationToken
                        );
                        _logger.LogWarning(
                            dbEx,
                            "DB save failed for new user {Identifier}; rolled back Firebase user {Uid}",
                            command.Username ?? command.Email,
                            externalAuthId
                        );
                    }
                    catch (Exception fbEx)
                    {
                        _logger.LogError(
                            fbEx,
                            "DB save failed AND Firebase rollback also failed for UID {Uid}. Manual cleanup required",
                            externalAuthId
                        );
                    }
                }
                throw;
            }

            // the identity split: additive many-to-many links, independent of the core Firebase/DB commit above.
            // Best-effort — the user account already exists at this point (already validated to
            // belong to this club/have the right role above); a link failure here must not turn an
            // otherwise-successful create into a 500, matching the setup-email best-effort pattern below.
            try
            {
                if (command.TeamIds is { Count: > 0 })
                    await _teamRepository.AddUserTeamsAsync(
                        newEntity.Id,
                        command.TeamIds,
                        cancellationToken
                    );

                if (command.DependentUserIds is { Count: > 0 })
                    await _userRepository.AddGuardianLinksAsync(
                        newEntity.Id,
                        command.DependentUserIds,
                        cancellationToken
                    );

                // the identity split: resolve this Athlete's Parent/Guardian by email, mirroring the bulk-upload
                // resolution in ConfirmBulkUploadAsync. Best-effort — an unresolved/invalid guardian
                // email does not fail the athlete's creation, it is logged for the admin to link manually.
                if (
                    string.Equals(command.RoleName, "Athlete", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(command.ParentGuardianEmail)
                )
                {
                    var guardian = await _userRepository.FindByEmailAsync(
                        command.ParentGuardianEmail,
                        cancellationToken
                    );

                    if (guardian is null || guardian.ClubId != command.ClubId)
                    {
                        _logger.LogWarning(
                            "Could not resolve Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} in this club.",
                            command.ParentGuardianEmail,
                            newEntity.Id
                        );
                    }
                    else if (guardian.Id == newEntity.Id)
                    {
                        _logger.LogWarning(
                            "Athlete {AthleteUserId} resolved its own row as its Parent/Guardian via '{GuardianEmail}' — skipped.",
                            newEntity.Id,
                            command.ParentGuardianEmail
                        );
                    }
                    else if (
                        !guardian.UserRoles.Any(ur =>
                            string.Equals(
                                ur.Role.Name,
                                "Parent",
                                StringComparison.OrdinalIgnoreCase
                            )
                        )
                    )
                    {
                        _logger.LogWarning(
                            "Resolved Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} does not have the Parent role — skipped.",
                            command.ParentGuardianEmail,
                            newEntity.Id
                        );
                    }
                    else
                    {
                        await _userRepository.AddGuardianLinkAsync(
                            guardian.Id,
                            newEntity.Id,
                            cancellationToken
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to link teams/dependents for newly created user {UserId}; admin can retry manually.",
                    newEntity.Id
                );
            }

            // Set Firebase club_id custom claim so JWT includes it on next refresh.
            // This is mandatory for Credentials users — failure means they cannot log in.
            // Skip for pending-ms365 placeholders — the Firebase user doesn't exist yet.
            if (HasRealAuthUid(externalAuthId))
            {
                await _authClaimsService.SetClubClaimAsync(
                    externalAuthId,
                    command.ClubId,
                    null,
                    cancellationToken
                );
            }

            // ABC-123: Issue a one-time setup link for Credentials users so the
            // admin never needs to manually share a password.
            // Best-effort: the user is already committed, so email failures must not
            // fail the create operation (a retry would hit duplicate-user conflicts).
            // A null setupLink tells the caller the admin can use the resend flow.
            // CustomAuthentication users skip the setup link — the admin provides the password directly.
            string? setupLink = null;
            if (
                command.AuthMethod == AuthenticationMethod.Credentials
                && !string.IsNullOrWhiteSpace(command.Email)
            )
            {
                try
                {
                    // Onboarding always runs in the mobile app — a role that requires
                    // onboarding (e.g. Director, which is *also* a portal role) still gets the
                    // mobile setup link. See the matching comment in ResendSetupLinkAsync /
                    // RequestPasswordResetAsync.
                    var isPortalUser = !role.RequiresOnboarding && role.IsPortalRole;
                    var portalSubdomain = isPortalUser
                        ? (role.Name == "SuperAdmin" ? "admin" : null)
                        : null;

                    setupLink = await IssueSetupTokenAndSendEmailAsync(
                        newEntity.Id,
                        command.Email,
                        displayName,
                        isPortalUser,
                        cancellationToken,
                        clubSubdomain: portalSubdomain
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Setup email dispatch failed for user {UserId}; admin can resend",
                        newEntity.Id
                    );
                }
            }

            // Reload with roles (and, per the newly-added UserTeams links above) for accurate
            // ToModel mapping.
            var created =
                await _userRepository.FindByIdWithRolesAsync(newEntity.Id, cancellationToken)
                ?? newEntity;

            return (created.ToModel(), setupLink);
        }
        finally
        {
            clubLock.Release();
        }
    }

    public async Task<User> AdminUpdateUserAsync(
        UpdateUserCommand command,
        CancellationToken cancellationToken = default
    )
    {
        var entity =
            await _userRepository.FindByIdWithRolesAsync(command.UserId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), command.UserId);

        // Check for email / phone conflicts (excludeUserId skips the user being edited;
        // excludeExternalAuthId skips cross-club entities that share the same Firebase UID,
        // which can happen when a user is linked to multiple clubs).
        await EnsureEmailAvailableAsync(
            command.Email,
            entity.ClubId,
            excludeUserId: entity.Id,
            cancellationToken,
            excludeExternalAuthId: entity.ExternalAuthId
        );
        await EnsurePhoneAvailableAsync(
            command.PhoneNumber,
            entity.ClubId,
            excludeUserId: entity.Id,
            cancellationToken,
            excludeExternalAuthId: entity.ExternalAuthId
        );

        // the identity split edit-mode parity: same Athlete DOB requirement and team/dependent club-
        // membership validation as create, before any DB/Firebase side effects run.
        var dobError = GetAthleteDateOfBirthValidationError(command.RoleName, command.DateOfBirth);
        if (dobError is not null)
            throw new ValidationException(
                dobError.Value.Message,
                errorCode: dobError.Value.ErrorCode
            );

        EnsureJerseyNumberInRange(command.JerseyNumber, nameof(command.JerseyNumber));

        await EnsureLinkedTeamsAndDependentsBelongToClubAsync(
            entity.ClubId,
            command.TeamIds,
            command.DependentUserIds,
            cancellationToken
        );

        // The WebApi-level CoachTeamLinkRule/ParentLinkRule only reject an *explicit* empty list —
        // null still means "leave unchanged", which lets a user with zero teams/dependents (e.g.
        // one created via the bulk-CSV exemption) be edited indefinitely without ever being forced
        // back into compliance with the "must have ≥1" invariant. Close that here, where we can
        // actually see the user's current linkage: if the field is omitted AND they currently have
        // none, treat it the same as an explicit empty list.
        await EnsureCoachAndParentLinksRemainNonEmptyAsync(
            entity.Id,
            command.RoleName,
            command.TeamIds,
            command.DependentUserIds,
            cancellationToken
        );

        var displayName = $"{command.FirstName.Trim()} {command.LastName.Trim()}";
        entity.DisplayName = displayName;
        entity.Email = command.Email ?? string.Empty;
        entity.PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber)
            ? null
            : PhoneHelper.NormalisePhone(command.PhoneNumber);
        entity.DateOfBirth = command.DateOfBirth;
        entity.Position = command.Position;
        entity.JerseyNumber = command.JerseyNumber;

        // Auth method change — re-provision the Firebase user under the new method.
        //
        // Order matters: we MUST delete the old Firebase user BEFORE creating the new one.
        // If both the old and new methods use email (e.g. Credentials → Google/Microsoft365),
        // Firebase rejects the new user creation with a conflict because the email is already
        // registered. Deleting first avoids that 409.
        //
        // Trade-off: if new-user creation fails after the old user is deleted, the DB still
        // holds the old ExternalAuthId (now gone from Firebase). The user cannot authenticate
        // until an admin intervenes. This is the lesser evil compared to a permanent 409 loop.
        var authMethodChanged =
            command.NewAuthMethod.HasValue && command.NewAuthMethod.Value != entity.AuthMethod;
        var oldExternalAuthId = entity.ExternalAuthId;
        string? newExternalAuthId = null;

        if (authMethodChanged)
        {
            var targetMethod = command.NewAuthMethod!.Value;

            // Validate required contact fields for the incoming auth method
            switch (targetMethod)
            {
                case AuthenticationMethod.CustomAuthentication:
                    if (string.IsNullOrWhiteSpace(command.Username))
                        throw new ArgumentException(
                            "Username is required when changing to CustomAuthentication.",
                            nameof(command)
                        );
                    if (string.IsNullOrWhiteSpace(command.Password))
                        throw new ArgumentException(
                            "Password is required when changing to CustomAuthentication.",
                            nameof(command)
                        );
                    await EnsureUsernameAvailableAsync(command.Username, cancellationToken);
                    break;
                case AuthenticationMethod.PhoneOtp:
                    if (string.IsNullOrWhiteSpace(command.PhoneNumber))
                        throw new ArgumentException(
                            "Phone number is required when changing to PhoneOtp.",
                            nameof(command)
                        );
                    break;
                default:
                    if (string.IsNullOrWhiteSpace(command.Email))
                        throw new ArgumentException(
                            $"Email is required when changing to {targetMethod}.",
                            nameof(command)
                        );
                    break;
            }

            _logger.LogInformation(
                "AdminUpdateUser: AuthMethod change {OldMethod} → {NewMethod} for user {UserId}",
                entity.AuthMethod,
                targetMethod,
                entity.Id
            );

            // Step 1 — Revoke the old session so the user is signed out immediately, then
            // delete the old Firebase user. This must happen before creating the new one so
            // Firebase does not reject the new record due to an email/phone conflict.
            if (HasRealAuthUid(oldExternalAuthId))
            {
                try
                {
                    await _authClaimsService.RevokeRefreshTokensAsync(
                        oldExternalAuthId,
                        cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to revoke Firebase tokens for old UID {Uid} during auth-method change for user {UserId}",
                        oldExternalAuthId,
                        entity.Id
                    );
                }

                try
                {
                    await _authProvisioningService.DeleteUserAsync(
                        oldExternalAuthId,
                        cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    // Swallow — the old user may have already been deleted by a previous failed
                    // attempt. Continuing allows the admin to retry the operation safely.
                    _logger.LogWarning(
                        ex,
                        "Failed to delete old Firebase user {Uid} for user {UserId}; may already be absent. Continuing.",
                        oldExternalAuthId,
                        entity.Id
                    );
                }
            }

            // Step 2 — Provision the new Firebase user.
            // If this fails after the old user was deleted the DB still holds the now-invalid
            // ExternalAuthId. The admin can retry — Step 1's delete is idempotent (swallowed
            // above) and Step 2 will succeed on the next attempt with no email conflict.
            try
            {
                newExternalAuthId = targetMethod switch
                {
                    AuthenticationMethod.CustomAuthentication =>
                        await _authProvisioningService.CreateUserByUsernameAsync(
                            command.Username!,
                            command.Password!,
                            displayName,
                            cancellationToken
                        ),
                    AuthenticationMethod.PhoneOtp =>
                        await _authProvisioningService.CreateUserByPhoneAsync(
                            command.PhoneNumber!,
                            displayName,
                            cancellationToken
                        ),
                    _ => await _authProvisioningService.CreateUserByEmailAsync(
                        command.Email!,
                        displayName,
                        targetMethod,
                        cancellationToken
                    ),
                };
            }
            catch (Exception ex)
            {
                // The old Firebase user is already deleted. The user cannot authenticate until
                // the admin retries this operation (Step 1 delete is now a no-op so retry succeeds).
                _logger.LogCritical(
                    ex,
                    "Auth-method change failed at Firebase provisioning for user {UserId}. "
                        + "Old Firebase user {OldUid} was deleted; new user was not created. "
                        + "The user is temporarily unable to authenticate. "
                        + "Retry the auth-method change to complete the operation.",
                    entity.Id,
                    oldExternalAuthId
                );
                throw;
            }

            // Step 3 — Update auth-related entity fields.
            entity.AuthMethod = targetMethod;
            entity.ExternalAuthId = newExternalAuthId ?? string.Empty;
            entity.Username =
                targetMethod == AuthenticationMethod.CustomAuthentication ? command.Username : null;
        }

        // Handle role change — resolve the target role first so we can check its flags.
        var newRole =
            await _roleRepository.FindByNameAsync(command.RoleName, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(RoleEntity), command.RoleName);

        if (!newRole.IsActive)
            throw new ValidationException(
                $"Role '{command.RoleName}' is inactive and cannot be assigned.",
                errorCode: "role-inactive"
            );

        // Elevated roles cannot be assigned to users whose identity is shared across clubs
        if (newRole.IsElevated)
        {
            var isShared = await _userRepository.IsSharedAcrossClubsAsync(
                entity.Id,
                cancellationToken
            );
            if (isShared)
                throw new ConflictException(
                    "Elevated roles cannot be assigned to users who are shared across multiple organisations.",
                    errorCode: "admin-role-multi-club"
                );
        }

        var alreadyHasTargetRole = await _roleRepository.AssignmentExistsAsync(
            entity.Id,
            newRole.Id,
            cancellationToken
        );

        if (!alreadyHasTargetRole)
        {
            // Role is changing — remove old role(s) before assigning the new one.
            await _roleRepository.RemoveAssignmentsForUserAsync(entity.Id, cancellationToken);
            await _roleRepository.CreateAssignmentAsync(
                new UserRoleAssignmentEntity
                {
                    UserId = entity.Id,
                    RoleId = newRole.Id,
                    AssignedAt = _clock.Now(),
                },
                cancellationToken
            );
        }

        try
        {
            await _userRepository.SaveChangesAsync(cancellationToken);
        }
        catch (Exception dbEx)
        {
            // DB save failed — roll back the newly provisioned Firebase user so we don't
            // leave an orphaned account pointing nowhere.
            if (authMethodChanged && HasRealAuthUid(newExternalAuthId))
            {
                try
                {
                    await _authProvisioningService.DeleteUserAsync(
                        newExternalAuthId,
                        cancellationToken
                    );
                    _logger.LogWarning(
                        dbEx,
                        "DB save failed during auth-method change for user {UserId}; rolled back new Firebase user {Uid}",
                        entity.Id,
                        newExternalAuthId
                    );
                }
                catch (Exception fbEx)
                {
                    _logger.LogError(
                        fbEx,
                        "DB save failed AND Firebase rollback also failed for new UID {Uid} (user {UserId}). Manual cleanup required.",
                        newExternalAuthId,
                        entity.Id
                    );
                }
            }
            throw;
        }

        // the identity split edit-mode parity: additive/replace many-to-many links, independent of the
        // core save above. Best-effort — the entity update already succeeded, so a link failure
        // here must not turn an otherwise-successful save into an error.
        try
        {
            if (command.TeamIds is not null)
            {
                await _teamRepository.ReplaceUserTeamsAsync(
                    entity.Id,
                    command.TeamIds,
                    cancellationToken
                );
            }

            if (command.DependentUserIds is not null)
            {
                await _userRepository.ReplaceGuardianLinksAsync(
                    entity.Id,
                    command.DependentUserIds,
                    cancellationToken
                );
            }

            if (
                string.Equals(command.RoleName, "Athlete", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(command.ParentGuardianEmail)
            )
            {
                var guardian = await _userRepository.FindByEmailAsync(
                    command.ParentGuardianEmail,
                    cancellationToken
                );

                if (guardian is null || guardian.ClubId != entity.ClubId)
                {
                    _logger.LogWarning(
                        "Could not resolve Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} in this club.",
                        command.ParentGuardianEmail,
                        entity.Id
                    );
                }
                else if (guardian.Id == entity.Id)
                {
                    _logger.LogWarning(
                        "Athlete {AthleteUserId} resolved its own row as its Parent/Guardian via '{GuardianEmail}' — skipped.",
                        entity.Id,
                        command.ParentGuardianEmail
                    );
                }
                else if (
                    !guardian.UserRoles.Any(ur =>
                        string.Equals(ur.Role.Name, "Parent", StringComparison.OrdinalIgnoreCase)
                    )
                )
                {
                    _logger.LogWarning(
                        "Resolved Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} does not have the Parent role — skipped.",
                        command.ParentGuardianEmail,
                        entity.Id
                    );
                }
                else
                {
                    await _userRepository.AddGuardianLinkAsync(
                        guardian.Id,
                        entity.Id,
                        cancellationToken
                    );
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to update teams/dependents for user {UserId}; admin can retry manually.",
                entity.Id
            );
        }

        // DB save succeeded — post-provisioning steps for auth method changes
        if (authMethodChanged)
        {
            // Set club claim on the new Firebase user so the JWT carries club_id on next refresh.
            if (HasRealAuthUid(newExternalAuthId))
            {
                await _authClaimsService.SetClubClaimAsync(
                    newExternalAuthId,
                    entity.ClubId,
                    null,
                    cancellationToken
                );
            }

            // If switching to Credentials, issue a setup link so the user can set their password.
            // Best-effort — failure must not roll back the already-committed update.
            if (
                entity.AuthMethod == AuthenticationMethod.Credentials
                && !string.IsNullOrWhiteSpace(entity.Email)
            )
            {
                try
                {
                    // Onboarding always runs in the mobile app — see the matching
                    // comment in AdminCreateUserAsync.
                    await IssueSetupTokenAndSendEmailAsync(
                        entity.Id,
                        entity.Email,
                        displayName,
                        !newRole.RequiresOnboarding && newRole.IsPortalRole,
                        cancellationToken
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Setup email dispatch failed for user {UserId} after auth-method change; admin can resend",
                        entity.Id
                    );
                }
            }
        }

        // Reload with roles (and the just-replaced UserTeams links above) for accurate ToModel
        // mapping.
        var updated =
            await _userRepository.FindByIdWithRolesAsync(entity.Id, cancellationToken) ?? entity;
        var model = updated.ToModel();
        model.IsSharedAcrossClubs = await _userRepository.IsSharedAcrossClubsAsync(
            entity.Id,
            cancellationToken
        );
        return model;
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var entity =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        // Remove role assignments before soft-deleting the user
        await _roleRepository.RemoveAssignmentsForUserAsync(userId, cancellationToken);
        await _userRepository.DeleteAsync(userId, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        // Revoke Firebase tokens and optionally delete the Firebase user
        if (HasRealAuthUid(entity.ExternalAuthId))
        {
            try
            {
                await _authClaimsService.RevokeRefreshTokensAsync(
                    entity.ExternalAuthId,
                    cancellationToken
                );
                await _authProvisioningService.DeleteUserAsync(
                    entity.ExternalAuthId,
                    cancellationToken
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to clean up Firebase user {Uid} for deleted user {UserId}",
                    entity.ExternalAuthId,
                    userId
                );
            }
        }
    }

    public async Task<User> GetProfileAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var entity =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        var model = entity.ToModel();
        model.AvatarUrl = await _blobStorageService.ResolveStoredPathAsync(
            entity.AvatarUrl,
            cancellationToken
        );
        model.FullBodyPhotoUrl = await _blobStorageService.ResolveStoredPathAsync(
            entity.FullBodyPhotoUrl,
            cancellationToken
        );
        model.FacePhotoUrl = await _blobStorageService.ResolveStoredPathAsync(
            entity.FacePhotoUrl,
            cancellationToken
        );

        return model;
    }

    public async Task UpdateProfileAsync(
        UpdateProfileCommand command,
        CancellationToken cancellationToken = default
    )
    {
        if (command.DisplayName is not null)
        {
            var trimmed = command.DisplayName.Trim();
            if (trimmed.Length < 2)
                throw new ArgumentException(
                    "Display name must be at least 2 non-whitespace characters.",
                    nameof(command)
                );
            await _userRepository.UpdateDisplayNameAsync(
                command.UserId,
                trimmed,
                cancellationToken
            );
        }

        if (command.RemoveAvatar)
            await _userRepository.UpdateAvatarUrlAsync(command.UserId, null, cancellationToken);
        else if (command.AvatarBlobPath is not null)
            await _userRepository.UpdateAvatarUrlAsync(
                command.UserId,
                command.AvatarBlobPath,
                cancellationToken
            );

        EnsureJerseyNumberInRange(command.JerseyNumber, nameof(command.JerseyNumber));

        var hasAthleteFieldChanges =
            command.Position is not null
            || command.JerseyNumber is not null
            || command.FullBodyPhotoBlobPath is not null
            || command.RemoveFullBodyPhoto
            || command.FacePhotoBlobPath is not null
            || command.RemoveFacePhoto
            || command.CompleteOnboarding;

        if (hasAthleteFieldChanges)
        {
            await _userRepository.UpdateAthleteOnboardingProfileAsync(
                command.UserId,
                command.Position,
                command.JerseyNumber,
                command.FullBodyPhotoBlobPath,
                command.RemoveFullBodyPhoto,
                command.FacePhotoBlobPath,
                command.RemoveFacePhoto,
                command.CompleteOnboarding,
                cancellationToken
            );
        }
    }

    public async Task<IReadOnlyList<LinkedAthlete>> ListLinkedAthletesAsync(
        Guid guardianUserId,
        CancellationToken cancellationToken = default
    )
    {
        var links = await _userRepository.ListGuardianLinksWithDependentsAsync(
            guardianUserId,
            cancellationToken
        );

        var athletes = new List<LinkedAthlete>(links.Count);
        foreach (var link in links)
        {
            var athlete = link.Dependent;
            // Face photo is the onboarding portrait; the avatar is the fallback for athletes who
            // haven't finished their own onboarding yet. Either may be null — the client renders
            // initials in that case.
            var photoUrl = await _blobStorageService.ResolveStoredPathAsync(
                athlete.FacePhotoUrl ?? athlete.AvatarUrl,
                cancellationToken
            );

            athletes.Add(
                new LinkedAthlete
                {
                    AthleteUserId = athlete.Id,
                    DisplayName = athlete.DisplayName,
                    // A user can belong to more than one team via UserTeams — show the
                    // alphabetically-first linked team name, same convention as
                    // UserRepository.ApplyUserSorting's "team" sort.
                    TeamName = athlete
                        .UserTeams.OrderBy(ut => ut.Team.Name)
                        .Select(ut => ut.Team.Name)
                        .FirstOrDefault(),
                    Position = athlete.Position,
                    JerseyNumber = athlete.JerseyNumber,
                    PhotoUrl = photoUrl,
                    Relationship = link.Relationship,
                }
            );
        }

        return athletes;
    }

    public async Task<IReadOnlyList<LinkedTeam>> ListLinkedTeamsAsync(
        Guid coachUserId,
        CancellationToken cancellationToken = default
    )
    {
        var teams = await _teamRepository.ListTeamsForUserAsync(coachUserId, cancellationToken);

        // Resolve every team's logo URL concurrently rather than one round-trip per team.
        var tasks = teams.Select(async team => new LinkedTeam
        {
            TeamId = team.Id,
            Name = team.Name,
            AgeGroup = team.AgeGroup,
            LogoUrl = await _blobStorageService.ResolveStoredPathAsync(
                team.LogoUrl,
                cancellationToken
            ),
        });

        return await Task.WhenAll(tasks);
    }

    public async Task EnsureCoachLinkedToTeamAsync(
        Guid coachUserId,
        Guid teamId,
        CancellationToken cancellationToken = default
    )
    {
        var isLinked = await _teamRepository.UserTeamExistsAsync(
            coachUserId,
            teamId,
            cancellationToken
        );
        if (!isLinked)
            throw new EntityNotFoundException(nameof(Team), teamId);
    }

    public async Task SetLinkedTeamLogoAsync(
        Guid coachUserId,
        Guid teamId,
        string logoBlobPath,
        CancellationToken cancellationToken = default
    )
    {
        var team =
            await _teamRepository.FindLinkedTeamAsync(coachUserId, teamId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(Team), teamId);

        var previousLogoUrl = team.LogoUrl;
        team.LogoUrl = logoBlobPath;

        try
        {
            await _teamRepository.UpdateAsync(team, cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                $"Team '{teamId}' was updated by someone else. Please try again.",
                errorCode: "team-logo-conflict",
                conflictingEntityId: teamId
            );
        }

        // Best-effort — the logo has already been persisted at this point; a cleanup failure
        // here just leaves an orphaned blob rather than affecting the caller's result.
        if (!string.IsNullOrWhiteSpace(previousLogoUrl) && previousLogoUrl != logoBlobPath)
        {
            try
            {
                await _blobStorageService.DeleteAsync(previousLogoUrl, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to delete the previous logo blob {BlobPath} for team {TeamId}",
                    previousLogoUrl,
                    teamId
                );
            }
        }
    }

    public Task<(string StoredPath, string? Url)> UploadAvatarAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    ) =>
        UploadImageAsync(
            file,
            BlobContainerName.UserAvatars,
            userId,
            "avatar",
            "Avatar",
            _userServiceOptions.AvatarMaxSizeBytes,
            cancellationToken
        );

    public Task<(string StoredPath, string? Url)> UploadFacePhotoAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    ) =>
        UploadImageAsync(
            file,
            BlobContainerName.UserAvatars,
            userId,
            "face-photo",
            "Face photo",
            _userServiceOptions.OnboardingPhotoMaxSizeBytes,
            cancellationToken
        );

    public Task<(string StoredPath, string? Url)> UploadFullBodyPhotoAsync(
        Guid userId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    ) =>
        UploadImageAsync(
            file,
            BlobContainerName.UserAvatars,
            userId,
            "full-body-photo",
            "Full-body photo",
            _userServiceOptions.OnboardingPhotoMaxSizeBytes,
            cancellationToken
        );

    public Task<(string StoredPath, string? Url)> UploadTeamLogoImageAsync(
        Guid teamId,
        UploadedFile file,
        CancellationToken cancellationToken = default
    ) =>
        UploadImageAsync(
            file,
            BlobContainerName.ClubLogos,
            teamId,
            "logo",
            "Team logo",
            _userServiceOptions.TeamLogoMaxSizeBytes,
            cancellationToken
        );

    private async Task<(string StoredPath, string? Url)> UploadImageAsync(
        UploadedFile file,
        string containerName,
        Guid blobEntityId,
        string blobNameSuffix,
        string fieldLabel,
        long maxBytes,
        CancellationToken cancellationToken
    )
    {
        FileUploadValidator.Validate(
            file,
            ImageSignatureValidator.AllowedContentTypes,
            maxBytes,
            paramName: "file"
        );

        if (
            !await ImageSignatureValidator.HasValidSignatureAsync(
                file.Content,
                file.ContentType,
                cancellationToken
            )
        )
        {
            throw new ArgumentException(
                $"{fieldLabel} content does not match its declared image type.",
                nameof(file)
            );
        }

        var blobName = BlobName.ForEntity(blobEntityId, blobNameSuffix);
        var storedPath = await _blobStorageService.UploadAsync(
            containerName,
            blobName,
            file,
            cancellationToken
        );
        var sasUrl = await _blobStorageService.ResolveStoredPathAsync(
            storedPath,
            cancellationToken
        );

        return (storedPath, sasUrl ?? storedPath);
    }

    public async Task SetGuardianRelationshipsAsync(
        SetGuardianRelationshipsCommand command,
        CancellationToken cancellationToken = default
    )
    {
        if (!command.Relationships.Any())
            throw new ArgumentException(
                "At least one athlete relationship must be supplied.",
                nameof(command)
            );

        var athleteIds = command.Relationships.Select(r => r.AthleteUserId).ToList();
        if (athleteIds.Distinct().Count() != athleteIds.Count)
            throw new ArgumentException(
                "Each linked athlete may only appear once.",
                nameof(command)
            );

        // A parent may only describe their own links — anything else is either a stale client or
        // an attempt to write another guardian's row.
        var linkedIds = await _userRepository.ListDependentIdsForGuardianAsync(
            command.GuardianUserId,
            cancellationToken
        );
        var unlinked = athleteIds.Except(linkedIds).ToList();
        if (unlinked.Count > 0)
            throw new ArgumentException(
                $"Athlete(s) {string.Join(", ", unlinked)} are not linked to this user.",
                nameof(command)
            );

        await _userRepository.SetGuardianRelationshipsAsync(
            command.GuardianUserId,
            command.Relationships.ToDictionary(r => r.AthleteUserId, r => r.Relationship),
            cancellationToken
        );
    }

    public async Task RemoveAvatarAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        if (user.AvatarUrl is not null)
        {
            try
            {
                await _blobStorageService.DeleteAsync(user.AvatarUrl, cancellationToken);
            }
            catch (Exception ex)
            {
                // Blob cleanup is best-effort — clear the DB reference regardless so the
                // admin's remove action always takes effect, even if storage is unreachable.
                _logger.LogWarning(
                    ex,
                    "Failed to delete avatar blob for user {UserId}. Clearing DB reference anyway.",
                    userId
                );
            }
        }

        await _userRepository.UpdateAvatarUrlAsync(userId, null, cancellationToken);
    }

    // ── Account-setup flow (ABC-123) ─────────────────────────────────────────

    public async Task<(string Email, SetupTokenPurpose Purpose)> ValidateSetupTokenAsync(
        string token,
        CancellationToken cancellationToken = default
    )
    {
        var hash = AccountSetupHelper.HashToken(token);
        var record = await _setupTokenRepository.FindByHashAsync(hash, cancellationToken);

        if (record is null)
            throw new EntityNotFoundException("SetupToken", token);

        if (record.UsedAt.HasValue)
            throw new ArgumentException("This setup link has already been used.");

        if (record.IsInvalidated)
            throw new ArgumentException(
                "This setup link has been superseded by a newer one. Please use the most recent link."
            );

        if (record.ExpiresAt <= _clock.Now())
        {
            _logger.LogInformation(
                "AccountSetup: setup link accessed but expired for user {UserId} (expired at {ExpiresAt})",
                record.UserId,
                record.ExpiresAt
            );
            throw new ArgumentException(
                "This setup link has expired. Please ask your administrator to resend it."
            );
        }

        if (record.User is null || !record.User.IsActive)
            throw new ArgumentException(
                "This account has been deactivated. Please contact your administrator."
            );

        _logger.LogInformation(
            "AccountSetup: setup link accessed for user {UserId} (purpose: {Purpose})",
            record.UserId,
            record.Purpose
        );

        return (record.User.Email, record.Purpose);
    }

    public async Task CompleteSetupAsync(
        string token,
        string newPassword,
        CancellationToken cancellationToken = default
    )
    {
        if (!AccountSetupHelper.MeetsComplexityRequirements(newPassword))
            throw new ArgumentException(
                "Password must be at least 6 characters and contain uppercase, lowercase, digit, and special character."
            );

        var hash = AccountSetupHelper.HashToken(token);
        var record = await _setupTokenRepository.FindByHashAsync(hash, cancellationToken);

        if (record is null)
            throw new EntityNotFoundException("SetupToken", token);

        if (record.UsedAt.HasValue)
            throw new ArgumentException("This setup link has already been used.");

        if (record.IsInvalidated)
            throw new ArgumentException(
                "This setup link has been superseded by a newer one. Please use the most recent link."
            );

        var utcNow = _clock.Now();
        if (record.ExpiresAt <= utcNow)
            throw new ArgumentException(
                "This setup link has expired. Please ask your administrator to resend it."
            );

        // Reject if the user has been deactivated or deleted since the token was issued.
        if (record.User is null || !record.User.IsActive)
            throw new ArgumentException(
                "This account has been deactivated. Please contact your administrator."
            );

        // AC 6: reject if the new password matches the auto-generated temp password.
        // Skip this check for password-reset tokens — no temp password was generated.
        if (
            record.Purpose == SetupTokenPurpose.AccountSetup
            && BCrypt.Net.BCrypt.Verify(newPassword, record.TempPasswordHash)
        )
            throw new ArgumentException(
                "Your new password cannot match the temporary password. Please choose a different password."
            );

        // Mark token as used BEFORE the Firebase side-effect.
        // If Firebase fails we roll back, so the user can retry.
        record.UsedAt = utcNow;
        await _setupTokenRepository.SaveChangesAsync(cancellationToken);

        try
        {
            await _authProvisioningService.UpdatePasswordAsync(
                record.User.ExternalAuthId,
                newPassword,
                cancellationToken
            );

            // Revoke all Firebase refresh tokens so every active session is forced
            // to re-authenticate with the new password (ABC-123 AC 6a-c).
            await _authClaimsService.RevokeRefreshTokensAsync(
                record.User.ExternalAuthId,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            // Roll back: un-mark the token so the user can retry.
            _logger.LogError(
                ex,
                "AccountSetup: Firebase password update failed for user {UserId} (ExternalAuthId: {Uid}). Rolling back token usage",
                record.UserId,
                record.User.ExternalAuthId
            );
            record.UsedAt = null;
            await _setupTokenRepository.SaveChangesAsync(cancellationToken);

            // Surface a user-friendly message instead of letting a raw 500 propagate.
            throw new InvalidOperationException(
                "Unable to set the password — the authentication provider rejected the request. "
                    + "The administrator may need to recreate this user account.",
                ex
            );
        }

        _logger.LogInformation(
            "AccountSetup: user {UserId} completed {Purpose} and set their password",
            record.UserId,
            record.Purpose
        );
    }

    public async Task<string> ResendSetupLinkAsync(
        Guid userId,
        bool sendEmail = true,
        CancellationToken cancellationToken = default
    )
    {
        var user =
            await _userRepository.FindByIdWithRolesAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        if (user.AuthMethod != AuthenticationMethod.Credentials)
            throw new InvalidOperationException(
                "Setup links can only be sent for Credentials (email/password) users."
            );

        if (user.LastLoginAt is not null)
            throw new InvalidOperationException(
                "This user has already completed setup. Use the password-reset flow instead."
            );

        // Onboarding always runs in the mobile app — a role that requires
        // onboarding (e.g. Director, which is *also* a portal role) still gets the mobile
        // setup link so the account-setup → onboarding-wizard handoff never lands on the
        // web portal's plain password form instead, which has no path into the wizard.
        var isPortalUser =
            !user.UserRoles.Any(r => r.Role.RequiresOnboarding)
            && user.UserRoles.Any(r => r.Role.IsPortalRole);

        string? portalSubdomain = null;
        if (isPortalUser)
        {
            var isSuperAdmin = user.UserRoles.Any(r => r.Role.Name == "SuperAdmin");
            if (isSuperAdmin)
            {
                portalSubdomain = "admin";
            }
            else
            {
                var club = await _clubRepository.GetAsync(user.ClubId, cancellationToken);
                portalSubdomain = null;
            }
        }

        // Invalidate all existing tokens first so only the freshly issued one is active.
        await _setupTokenRepository.InvalidateAllForUserAsync(
            userId,
            SetupTokenPurpose.AccountSetup,
            cancellationToken
        );

        var setupLink = await IssueSetupTokenAndSendEmailAsync(
            userId,
            user.Email,
            user.DisplayName,
            isPortalUser,
            cancellationToken,
            sendEmail: sendEmail,
            clubSubdomain: portalSubdomain
        );

        _logger.LogInformation(
            "AccountSetup: setup link resent for user {UserId} (sendEmail={SendEmail})",
            userId,
            sendEmail
        );

        return setupLink;
    }

    /// <summary>
    /// Generates a CSPRNG setup token + temp password, persists the hashes,
    /// and dispatches the setup email. Called both on initial provisioning and resend.
    /// </summary>
    private async Task<string> IssueSetupTokenAndSendEmailAsync(
        Guid userId,
        string email,
        string displayName,
        bool isPortalUser,
        CancellationToken cancellationToken,
        SetupTokenPurpose purpose = SetupTokenPurpose.AccountSetup,
        bool sendEmail = true,
        string? clubSubdomain = null
    )
    {
        // Password-reset tokens don't need a temp password (no reuse check).
        string tempPasswordHash;
        if (purpose == SetupTokenPurpose.PasswordReset)
        {
            tempPasswordHash = string.Empty;
        }
        else
        {
            var tempPassword = AccountSetupHelper.GenerateTemporaryPassword(displayName, email);
            tempPasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword, workFactor: 12);
        }

        var (plaintext, tokenHash) = AccountSetupHelper.GenerateSetupToken();

        var expiryHours =
            purpose == SetupTokenPurpose.PasswordReset
                ? _accountSetupOptions.PasswordResetExpiryHours
                : _accountSetupOptions.TokenExpiryHours;

        var now = _clock.Now();
        var tokenEntity = new UserSetupTokenEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            TempPasswordHash = tempPasswordHash,
            Purpose = purpose,
            ExpiresAt = now.AddHours(expiryHours),
            CreatedAt = now,
        };

        await _setupTokenRepository.AddAsync(tokenEntity, cancellationToken);
        await _setupTokenRepository.SaveChangesAsync(cancellationToken);

        var baseUrl = isPortalUser
            ? BuildPortalUrl(clubSubdomain)
            : _accountSetupOptions.MobileBaseUrl;
        // Mobile (athlete/coach) links use a distinct path from the portal's own
        // /setup-account page — both currently resolve against the same deployed
        // Admin Portal host in dev/UAT (no separate mobile host exists pre-launch,
        // the identity split), so a shared path would collide. The mobile path is also the
        // Universal Link / App Link path declared in apps/expo's associatedDomains
        // and apps/web's public/.well-known/ files — keep both in sync.
        var path = isPortalUser ? "setup-account" : "mobile-setup-account";
        var purposeParam =
            purpose == SetupTokenPurpose.PasswordReset ? "&purpose=reset" : string.Empty;
        // A custom-scheme mobile base (e.g. "starterkit-mobile-dev://", used for local dev so the
        // link opens the native app directly) already ends in "://" — append the path as-is to
        // preserve it. For an https host (deployed/UAT) normalise any trailing slash so exactly
        // one separates host and path.
        var setupLink = baseUrl.EndsWith("://", StringComparison.Ordinal)
            ? $"{baseUrl}{path}?token={plaintext}{purposeParam}"
            : $"{baseUrl.TrimEnd('/')}/{path}?token={plaintext}{purposeParam}";

        if (sendEmail)
        {
            try
            {
                if (purpose == SetupTokenPurpose.PasswordReset)
                {
                    await _setupEmailService.SendPasswordResetLinkAsync(
                        email,
                        displayName,
                        setupLink,
                        expiryHours,
                        cancellationToken
                    );
                }
                else
                {
                    await _setupEmailService.SendSetupLinkAsync(
                        email,
                        displayName,
                        setupLink,
                        expiryHours,
                        cancellationToken
                    );
                }
            }
            catch
            {
                // The token is already persisted. Mark it invalidated so it can never be redeemed —
                // the user never received the link, and a subsequent resend will issue a fresh token.
                // This ensures the DB and the user's inbox stay in sync: either both exist or neither does.
                tokenEntity.IsInvalidated = true;
                await _setupTokenRepository.SaveChangesAsync(cancellationToken);
                throw;
            }
        }

        _logger.LogInformation(
            "AccountSetup: {Purpose} token issued{EmailNote} for user {UserId}",
            purpose,
            sendEmail ? " and email dispatched" : " (email suppressed)",
            userId
        );

        return setupLink;
    }

    private string BuildPortalUrl(string? clubSubdomain) =>
        BuildPortalUrl(_accountSetupOptions.PortalBaseUrl, clubSubdomain);

    /// <summary>
    /// Constructs the portal base URL, optionally scoped to a club subdomain.
    /// Strips the first host segment (e.g. "admin") and prepends the given subdomain.
    /// Defaults to the "admin" subdomain when <paramref name="clubSubdomain"/> is null or
    /// whitespace — the host itself is never left unscoped.
    /// </summary>
    /// <remarks>
    /// IP-address hosts (e.g. <c>http://192.168.1.5:3000</c>, used to reach the local dev
    /// stack from a phone over LAN) have no concept of a subdomain — treating dotted-quad
    /// octets as domain labels would mangle the address into something unreachable
    /// (e.g. "admin.168.1.5"). Those are returned unchanged instead.
    /// </remarks>
    internal static string BuildPortalUrl(string portalBaseUrl, string? clubSubdomain)
    {
        var uri = new Uri(portalBaseUrl);
        var host = uri.Host;

        if (IPAddress.TryParse(host, out _))
        {
            return portalBaseUrl.TrimEnd('/');
        }

        var subdomain = string.IsNullOrWhiteSpace(clubSubdomain) ? "admin" : clubSubdomain;
        var dotIndex = host.IndexOf('.');
        var baseDomain = dotIndex >= 0 ? host[(dotIndex + 1)..] : host;
        var port = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";

        return $"{uri.Scheme}://{subdomain}.{baseDomain}{port}";
    }

    public async Task<string?> RequestPasswordResetAsync(
        string email,
        bool returnLinkForDev = false,
        CancellationToken cancellationToken = default
    )
    {
        // OWASP: always return null — never reveal whether the email exists or is eligible.
        var user = await _userRepository.FindByEmailAsync(email, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        // OAuth users can't reset via StarterKit — notify them to use their identity provider instead.
        if (user.AuthMethod is AuthenticationMethod.Google or AuthenticationMethod.Microsoft365)
        {
            await _setupEmailService.SendOAuthProviderResetNotificationAsync(
                user.Email,
                user.DisplayName,
                user.AuthMethod,
                cancellationToken
            );
            return null;
        }

        if (user.AuthMethod != AuthenticationMethod.Credentials)
        {
            return null;
        }

        // Password reset is only allowed after initial account setup is completed.
        // Users who have never logged in must complete the setup flow first.
        if (user.LastLoginAt is null)
        {
            return null;
        }

        // Onboarding always runs in the mobile app — a role that requires
        // onboarding (e.g. Director, which is *also* a portal role) still gets the mobile
        // setup link so the account-setup → onboarding-wizard handoff never lands on the
        // web portal's plain password form instead, which has no path into the wizard.
        var isPortalUser =
            !user.UserRoles.Any(r => r.Role.RequiresOnboarding)
            && user.UserRoles.Any(r => r.Role.IsPortalRole);

        string? portalSubdomain = null;
        if (isPortalUser)
        {
            var isSuperAdmin = user.UserRoles.Any(r => r.Role.Name == "SuperAdmin");
            if (isSuperAdmin)
            {
                portalSubdomain = "admin";
            }
            else
            {
                var club = await _clubRepository.GetAsync(user.ClubId, cancellationToken);
                portalSubdomain = null;
            }
        }

        // Invalidate all existing tokens first so only the freshly issued one is active.
        await _setupTokenRepository.InvalidateAllForUserAsync(
            user.Id,
            SetupTokenPurpose.PasswordReset,
            cancellationToken
        );

        var resetLink = await IssueSetupTokenAndSendEmailAsync(
            user.Id,
            user.Email,
            user.DisplayName,
            isPortalUser,
            cancellationToken,
            purpose: SetupTokenPurpose.PasswordReset,
            clubSubdomain: portalSubdomain
        );

        _logger.LogInformation("PasswordReset: reset token issued for user {UserId}", user.Id);

        return returnLinkForDev ? resetLink : null;
    }

    public async Task ProcessExpiredSetupTokensAsync(CancellationToken cancellationToken = default)
    {
        var expired = await _setupTokenRepository.FindExpiredUnprocessedAsync(cancellationToken);

        if (expired.Count == 0)
            return;

        foreach (var token in expired)
        {
            _logger.LogInformation(
                "AccountSetup: setup link expired without use for user {UserId} (tokenId: {TokenId}, expired at {ExpiresAt})",
                token.UserId,
                token.Id,
                token.ExpiresAt
            );

            token.IsInvalidated = true;
        }

        await _setupTokenRepository.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "SetupTokenExpiryService: processed {Count} expired token(s)",
            expired.Count
        );
    }

    public async Task CleanupSetupTokensAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = _clock.Now();
        var cutoff = utcNow.AddDays(-_accountSetupOptions.TokenRetentionDays);

        var deleted = await _setupTokenRepository.DeleteOlderThanAsync(cutoff, cancellationToken);

        _logger.LogInformation(
            "SetupTokenCleanupService: deleted {Count} token(s) older than {RetentionDays} day(s)",
            deleted,
            _accountSetupOptions.TokenRetentionDays
        );
    }

    /// <inheritdoc />
    public async Task AdminChangePasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(newPassword))
            throw new ArgumentException("New password must not be empty.", nameof(newPassword));

        if (!AccountSetupHelper.MeetsComplexityRequirements(newPassword))
            throw new ArgumentException(
                "Password must be at least 6 characters and contain uppercase, lowercase, digit, and special character."
            );

        var user =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        if (
            user.AuthMethod != AuthenticationMethod.CustomAuthentication
            && user.AuthMethod != AuthenticationMethod.Credentials
        )
            throw new ConflictException(
                "Password changes are only supported for username/password accounts."
            );

        if (!HasRealAuthUid(user.ExternalAuthId))
            throw new ConflictException(
                $"User {userId} does not have a valid Firebase UID — cannot update password."
            );

        await _authProvisioningService.UpdatePasswordAsync(
            user.ExternalAuthId,
            newPassword,
            cancellationToken
        );

        _logger.LogInformation(
            "Admin changed password for user {UserId} ({DisplayName})",
            userId,
            user.DisplayName
        );
    }

    /// <inheritdoc />
    public async Task ChangePasswordAsync(
        Guid userId,
        string newPassword,
        CancellationToken cancellationToken = default
    )
    {
        if (!AccountSetupHelper.MeetsComplexityRequirements(newPassword))
            throw new ArgumentException(
                "Password must be at least 6 characters and contain uppercase, lowercase, digit, and special character."
            );

        var user =
            await _userRepository.FindByIdAsync(userId, cancellationToken)
            ?? throw new EntityNotFoundException(nameof(User), userId);

        if (
            user.AuthMethod != AuthenticationMethod.CustomAuthentication
            && user.AuthMethod != AuthenticationMethod.Credentials
        )
            throw new ConflictException(
                "Password changes are only supported for username/password and email/password accounts."
            );

        if (!HasRealAuthUid(user.ExternalAuthId))
            throw new ConflictException(
                $"User {userId} does not have a valid Firebase UID — cannot update password."
            );

        await _authProvisioningService.UpdatePasswordAsync(
            user.ExternalAuthId,
            newPassword,
            cancellationToken
        );

        _logger.LogInformation(
            "User {UserId} ({DisplayName}) changed their own password",
            userId,
            user.DisplayName
        );
    }

    public async Task<IReadOnlyList<LinkedOrganisation>> GetLinkedOrganisationsAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default
    )
    {
        var users = await _userRepository.FindAllByExternalAuthIdAsync(
            firebaseUid,
            cancellationToken
        );

        // Cap concurrent SAS-URL resolutions so a user linked to many orgs cannot fan out
        // dozens of parallel calls against blob storage. Result order mirrors `users`
        // so the picker UI renders deterministically across refreshes.
        using var gate = new SemaphoreSlim(_userServiceOptions.MaxOrgLogoConcurrency);

        var tasks = users.Select(async u =>
        {
            await gate.WaitAsync(cancellationToken);
            try
            {
                var resolvedLogo = u.Club?.LogoUrl is not null
                    ? await _blobStorageService.ResolveStoredPathAsync(
                        u.Club.LogoUrl,
                        cancellationToken
                    )
                    : null;

                return new LinkedOrganisation(u.ClubId, u.Club?.Name ?? string.Empty, resolvedLogo);
            }
            finally
            {
                gate.Release();
            }
        });

        return await Task.WhenAll(tasks);
    }

    // ── Bulk upload ──────────────────────────────────────────────────────────

    public async Task<byte[]> GetBulkUploadTemplateAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        if (clubId == Guid.Empty)
            throw new ArgumentException("Club ID is required.", nameof(clubId));

        // Roles: system-wide roles (ClubId == null) + roles created specifically for this club.
        var roleNames = await _roleRepository.ListNamesForClubAsync(clubId, cancellationToken);

        // Teams: all for the club — project only names, no paging needed.
        var teams = await _teamRepository.ListNamesAsync(clubId, cancellationToken);
        var teamNames = teams.Select(d => d.Name).ToList();

        return _bulkUploadParser.GenerateTemplate(roleNames, teamNames);
    }

    public async Task<BulkUploadPreviewDto> PreviewBulkUploadAsync(
        Guid clubId,
        Guid? teamId,
        Stream fileStream,
        CancellationToken cancellationToken = default
    )
    {
        if (clubId == Guid.Empty)
            throw new ArgumentException("Club ID is required.", nameof(clubId));

        ExcelParseResult<BulkUploadParsedRow> parseResult;
        try
        {
            parseResult = _bulkUploadParser.Parse(fileStream);
        }
        catch (Exception ex) when (ex is InvalidDataException or InvalidOperationException)
        {
            throw new BulkUploadValidationException(
                "The uploaded file is not a valid Excel (.xlsx) file. "
                    + "Please download and use the provided template."
            );
        }

        var rows = parseResult switch
        {
            ExcelParseResult<BulkUploadParsedRow>.MissingColumns missing =>
                throw new BulkUploadValidationException(
                    $"The uploaded file is missing required columns: {string.Join(", ", missing.Columns)}. "
                        + "Please download and use the provided template."
                ),
            ExcelParseResult<BulkUploadParsedRow>.Success success => success.Rows,
            _ => throw new BulkUploadValidationException("The uploaded file could not be parsed."),
        };

        if (rows.Count == 0)
            throw new BulkUploadValidationException(
                "The uploaded file contains no data rows. Please fill in the template and try again."
            );

        // Cap the number of rows to avoid N×2 DB round-trips and serial creation timeouts.
        const int MaxRows = 1_000;
        if (rows.Count > MaxRows)
            throw new BulkUploadValidationException(
                $"The uploaded file contains {rows.Count} rows, which exceeds the maximum of {MaxRows} per upload. "
                    + "Please split the file into smaller batches and upload each separately."
            );

        // Prefetch all roles and teams once to avoid N+1 queries inside the row loop.
        var rolesByName = (
            await _roleRepository.ListNamesForClubAsync(clubId, cancellationToken)
        ).ToDictionary(name => name, name => name, StringComparer.OrdinalIgnoreCase);

        var allDepts = await _teamRepository.ListNamesAsync(clubId, cancellationToken);
        var deptsByName = allDepts.ToDictionary(
            d => d.Name,
            d => d.Id,
            StringComparer.OrdinalIgnoreCase
        );

        // Fetch existing emails, phones, and usernames for the club to detect duplicates.
        var existingEmails = await _userRepository.ListActiveEmailsByClubOrTeamAsync(
            [clubId],
            [],
            cancellationToken
        );
        var existingPhones = await _userRepository.ListActivePhonesByClubOrTeamAsync(
            [clubId],
            [],
            cancellationToken
        );
        var existingUsernamesList = await _userRepository.ListActiveUsernamesByClubOrTeamAsync(
            [clubId],
            [],
            cancellationToken
        );
        var emailSet = new HashSet<string>(existingEmails, StringComparer.OrdinalIgnoreCase);
        // Normalise phones from the DB so that format variants (e.g. "0821234567" vs "+27821234567")
        // are compared in the same canonical form as incoming row phones.
        var phoneSet = new HashSet<string>(
            existingPhones
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(PhoneHelper.NormalisePhone),
            StringComparer.Ordinal
        );
        var usernameSet = new HashSet<string>(
            existingUsernamesList,
            StringComparer.OrdinalIgnoreCase
        );

        // Also track identifiers within the file itself to catch intra-batch duplicates.
        var fileEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var filePhones = new HashSet<string>(StringComparer.Ordinal);
        var fileUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var readyToAdd = new List<BulkUploadValidUserDto>();
        var validationErrors = new List<BulkUploadInvalidRowDto>();
        var duplicates = new List<BulkUploadInvalidRowDto>();
        var unprocessable = new List<BulkUploadInvalidRowDto>();

        foreach (var row in rows)
        {
            // Skip completely empty rows.
            if (
                string.IsNullOrWhiteSpace(row.FirstName)
                && string.IsNullOrWhiteSpace(row.LastName)
                && row.Email == null
                && row.PhoneNumber == null
                && row.AuthMethod == null
                && row.RoleName == null
            )
            {
                unprocessable.Add(
                    new BulkUploadInvalidRowDto(
                        row.RowNumber,
                        null,
                        null,
                        null,
                        null,
                        ["Row is empty."]
                    )
                );
                continue;
            }

            // Parser-detected format errors take priority.
            if (row.Errors.Count > 0)
            {
                validationErrors.Add(
                    new BulkUploadInvalidRowDto(
                        row.RowNumber,
                        row.FirstName,
                        row.LastName,
                        row.Email,
                        row.PhoneNumber,
                        row.Errors
                    )
                );
                continue;
            }

            // Business validation: role must exist (resolved from pre-fetched cache; only active roles are included).
            var businessErrors = new List<string>();
            if (row.RoleName != null && !rolesByName.ContainsKey(row.RoleName))
                businessErrors.Add($"Role '{row.RoleName}' does not exist or is not active.");

            // Team name → ID resolution (resolved from pre-fetched cache).
            Guid? resolvedDeptId = teamId;
            if (!string.IsNullOrEmpty(row.TeamName))
            {
                if (!deptsByName.TryGetValue(row.TeamName, out var deptId))
                    businessErrors.Add($"Team '{row.TeamName}' was not found in this club.");
                else
                    resolvedDeptId = deptId;
            }

            if (businessErrors.Count > 0)
            {
                validationErrors.Add(
                    new BulkUploadInvalidRowDto(
                        row.RowNumber,
                        row.FirstName,
                        row.LastName,
                        row.Email,
                        row.PhoneNumber,
                        businessErrors
                    )
                );
                continue;
            }

            // Duplicate detection (existing users + intra-batch).
            var dupErrors = new List<string>();
            var normalizedPhone = row.PhoneNumber is { Length: > 0 }
                ? PhoneHelper.NormalisePhone(row.PhoneNumber)
                : null;
            if (
                row.Email != null
                && (emailSet.Contains(row.Email) || fileEmails.Contains(row.Email))
            )
                dupErrors.Add("A user with this email already exists.");
            if (
                normalizedPhone != null
                && (phoneSet.Contains(normalizedPhone) || filePhones.Contains(normalizedPhone))
            )
                dupErrors.Add("A user with this phone number already exists.");
            if (
                row.Username != null
                && (usernameSet.Contains(row.Username) || fileUsernames.Contains(row.Username))
            )
                dupErrors.Add("A user with this username already exists.");

            if (dupErrors.Count > 0)
            {
                duplicates.Add(
                    new BulkUploadInvalidRowDto(
                        row.RowNumber,
                        row.FirstName,
                        row.LastName,
                        row.Email,
                        row.PhoneNumber,
                        dupErrors
                    )
                );
                continue;
            }

            // Register within-file identifiers to prevent intra-batch collisions.
            if (row.Email != null)
                fileEmails.Add(row.Email);
            if (normalizedPhone != null)
                filePhones.Add(normalizedPhone);
            if (row.Username != null)
                fileUsernames.Add(row.Username);

            var authMethod = row.AuthMethod!.Value;
            readyToAdd.Add(
                new BulkUploadValidUserDto(
                    RowNumber: row.RowNumber,
                    FirstName: row.FirstName,
                    LastName: row.LastName,
                    Email: row.Email,
                    PhoneNumber: row.PhoneNumber,
                    CountryCode: row.CountryCode,
                    AuthMethod: authMethod,
                    RoleName: row.RoleName!,
                    TeamName: row.TeamName,
                    TeamId: resolvedDeptId,
                    Username: row.Username,
                    DateOfBirth: row.DateOfBirth,
                    Position: row.Position,
                    JerseyNumber: row.JerseyNumber,
                    ParentGuardianEmail: row.ParentGuardianEmail
                )
            );
        }

        return new BulkUploadPreviewDto(
            ReadyToAdd: readyToAdd,
            ValidationErrors: validationErrors,
            Duplicates: duplicates,
            Unprocessable: unprocessable,
            TotalRows: rows.Count
        );
    }

    public async Task<BulkUploadConfirmDto> ConfirmBulkUploadAsync(
        Guid clubId,
        Guid? teamId,
        IReadOnlyList<BulkUploadValidUserDto> validRows,
        string? defaultPassword,
        CancellationToken cancellationToken = default
    )
    {
        if (
            string.IsNullOrWhiteSpace(defaultPassword)
            && validRows.Any(r => r.AuthMethod == AuthenticationMethod.CustomAuthentication)
        )
            _logger.LogWarning(
                "Bulk upload confirm: 'users-default-password' secret is not configured. "
                    + "CustomAuthentication rows will fail with a missing-password error."
            );

        var failures = new List<BulkUploadInvalidRowDto>();
        var createdCount = 0;
        var payloadEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var payloadPhones = new HashSet<string>(StringComparer.Ordinal);
        var payloadUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // the identity split: track created users by email (case-insensitive) so Athlete rows can resolve
        // a Parent/Guardian created earlier in the same batch, plus every pending Athlete→Guardian
        // link to resolve once the whole batch has been created (the guardian row may appear
        // later in the file than the athlete row).
        var createdUserIdsByEmail = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
        // Role of each created user by email, so an in-batch guardian resolution can verify the
        // resolved user is actually a Parent before linking.
        var createdUserRolesByEmail = new Dictionary<string, string>(
            StringComparer.OrdinalIgnoreCase
        );
        var pendingGuardianLinks = new List<(Guid AthleteUserId, string GuardianEmail)>();

        foreach (var row in validRows)
        {
            try
            {
                var rowErrors = ValidateBulkUploadAuthFields(row);
                if (
                    row.AuthMethod == AuthenticationMethod.CustomAuthentication
                    && string.IsNullOrWhiteSpace(defaultPassword)
                )
                    rowErrors.Add(
                        "Default password is not configured for CustomAuthentication users."
                    );

                if (row.Email is { Length: > 0 } && !payloadEmails.Add(row.Email))
                    rowErrors.Add("A user with this email already exists in this upload.");

                var normalizedPhone = row.PhoneNumber is { Length: > 0 }
                    ? PhoneHelper.NormalisePhone(row.PhoneNumber)
                    : null;
                if (normalizedPhone != null && !payloadPhones.Add(normalizedPhone))
                    rowErrors.Add("A user with this phone number already exists in this upload.");

                if (row.Username is { Length: > 0 } && !payloadUsernames.Add(row.Username))
                    rowErrors.Add("A user with this username already exists in this upload.");

                await AppendExistingUserConflictErrorsAsync(
                    clubId,
                    row,
                    rowErrors,
                    cancellationToken
                );

                if (rowErrors.Count > 0)
                {
                    failures.Add(
                        new BulkUploadInvalidRowDto(
                            RowNumber: row.RowNumber,
                            FirstName: row.FirstName,
                            LastName: row.LastName,
                            Email: row.Email,
                            PhoneNumber: row.PhoneNumber,
                            Errors: rowErrors
                        )
                    );
                    continue;
                }

                var command = new AdminCreateUserCommand(
                    ClubId: clubId,
                    RoleName: row.RoleName,
                    FirstName: row.FirstName,
                    LastName: row.LastName,
                    AuthMethod: row.AuthMethod,
                    Email: row.Email,
                    PhoneNumber: row.PhoneNumber,
                    Username: row.Username,
                    // CustomAuthentication requires a password; use the club default.
                    Password: row.AuthMethod == AuthenticationMethod.CustomAuthentication
                        ? defaultPassword
                        : null,
                    DateOfBirth: row.DateOfBirth,
                    Position: row.Position,
                    JerseyNumber: row.JerseyNumber
                );
                var (created, _) = await AdminCreateUserAsync(command, cancellationToken);
                createdCount++;

                // the identity split: link the row's team via the UserTeams join — the sole source of
                // truth for team membership.
                var resolvedTeamId = row.TeamId ?? teamId;
                if (resolvedTeamId.HasValue)
                    await _teamRepository.AddUserTeamAsync(
                        created.Id,
                        resolvedTeamId.Value,
                        cancellationToken
                    );

                if (row.Email is { Length: > 0 })
                {
                    createdUserIdsByEmail[row.Email] = created.Id;
                    createdUserRolesByEmail[row.Email] = row.RoleName;
                }

                if (row.ParentGuardianEmail is { Length: > 0 })
                    pendingGuardianLinks.Add((created.Id, row.ParentGuardianEmail));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Bulk upload: failed to create user at row {RowNumber}.",
                    row.RowNumber
                );
                var message = ex is InvalidOperationException or ArgumentException
                    ? ex.Message
                    : "Failed to create user.";
                failures.Add(
                    new BulkUploadInvalidRowDto(
                        RowNumber: row.RowNumber,
                        FirstName: row.FirstName,
                        LastName: row.LastName,
                        Email: row.Email,
                        PhoneNumber: row.PhoneNumber,
                        Errors: [message]
                    )
                );
            }
        }

        // the identity split: resolve Athlete→Guardian links now that every row in the batch has been
        // created. Best-effort — an unresolved guardian email does not fail the athlete's
        // creation, it is logged for the admin to link manually. Validation happens per-row
        // here, but the resolved links are collected and written in a single bulk insert
        // below rather than one DB round-trip per row.
        var resolvedGuardianLinks = new List<(Guid GuardianId, Guid AthleteUserId)>();
        foreach (var (athleteUserId, guardianEmail) in pendingGuardianLinks)
        {
            Guid? guardianId = null;
            var guardianIsParent = false;

            if (
                createdUserIdsByEmail.TryGetValue(guardianEmail, out var batchGuardianId)
                && createdUserRolesByEmail.TryGetValue(guardianEmail, out var batchGuardianRole)
            )
            {
                guardianId = batchGuardianId;
                guardianIsParent = string.Equals(
                    batchGuardianRole,
                    "Parent",
                    StringComparison.OrdinalIgnoreCase
                );
            }

            if (guardianId is null)
            {
                var existingGuardian = await _userRepository.FindByEmailAsync(
                    guardianEmail,
                    cancellationToken
                );
                if (existingGuardian is { } g && g.ClubId == clubId)
                {
                    guardianId = g.Id;
                    guardianIsParent = g.UserRoles.Any(ur =>
                        string.Equals(ur.Role.Name, "Parent", StringComparison.OrdinalIgnoreCase)
                    );
                }
            }

            if (guardianId is null)
            {
                _logger.LogWarning(
                    "Bulk upload: could not resolve Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} in this club.",
                    guardianEmail,
                    athleteUserId
                );
                continue;
            }

            if (guardianId.Value == athleteUserId)
            {
                _logger.LogWarning(
                    "Bulk upload: athlete {AthleteUserId} resolved its own row as its Parent/Guardian via '{GuardianEmail}' — skipped.",
                    athleteUserId,
                    guardianEmail
                );
                continue;
            }

            if (!guardianIsParent)
            {
                _logger.LogWarning(
                    "Bulk upload: resolved Parent/Guardian '{GuardianEmail}' for athlete {AthleteUserId} does not have the Parent role — skipped.",
                    guardianEmail,
                    athleteUserId
                );
                continue;
            }

            resolvedGuardianLinks.Add((guardianId.Value, athleteUserId));
        }

        await _userRepository.BulkAddGuardianLinksAsync(resolvedGuardianLinks, cancellationToken);

        return new BulkUploadConfirmDto(
            CreatedCount: createdCount,
            FailedCount: failures.Count,
            Failures: failures
        );
    }

    /// <summary>Trims optional free-text fields; blank values are stored as null.</summary>
    private static string? NormaliseOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>
    /// True when <paramref name="jerseyNumber"/> is outside <see cref="JerseyNumberConstraints.Min"/>–<see cref="JerseyNumberConstraints.Max"/>.
    /// </summary>
    private static bool IsJerseyNumberOutOfRange(int? jerseyNumber) =>
        jerseyNumber is { } value
        && (value < JerseyNumberConstraints.Min || value > JerseyNumberConstraints.Max);

    /// <summary>
    /// Guards every create/update/profile entry point against an out-of-range jersey number.
    /// The API DTOs' <c>[Range]</c> attribute only runs through controller model validation, so
    /// MCP tool calls (<c>UsersMcpTools</c> in both APIs) reach this service directly and need
    /// the same check.
    /// </summary>
    private static void EnsureJerseyNumberInRange(int? jerseyNumber, string paramName)
    {
        if (IsJerseyNumberOutOfRange(jerseyNumber))
            throw new ArgumentException(
                $"Jersey number must be between {JerseyNumberConstraints.Min} and {JerseyNumberConstraints.Max}.",
                paramName
            );
    }

    /// <summary>
    /// Returns the Athlete Date of Birth validation error (message + error code) for
    /// <paramref name="roleName"/>/<paramref name="dateOfBirth"/>, or <c>null</c> if valid or not
    /// applicable to this role. Shared by create, update, and bulk-upload validation.
    /// </summary>
    private (string Message, string ErrorCode)? GetAthleteDateOfBirthValidationError(
        string? roleName,
        DateOnly? dateOfBirth
    )
    {
        if (!string.Equals(roleName, "Athlete", StringComparison.OrdinalIgnoreCase))
            return null;

        if (dateOfBirth is null)
            return ("Date of birth is required for Athlete users.", "date-of-birth-required");

        if (dateOfBirth > DateOnly.FromDateTime(_clock.Now()))
            return ("Date of birth cannot be in the future.", "date-of-birth-invalid");

        return null;
    }

    /// <summary>
    /// Validates that every id in <paramref name="teamIds"/> belongs to <paramref name="clubId"/>
    /// and every id in <paramref name="dependentUserIds"/> is an Athlete in <paramref name="clubId"/>,
    /// before any Firebase/DB side effects run. Also caps list sizes to avoid unbounded
    /// SQL `IN (...)` clauses. Shared by create and update.
    /// </summary>
    private async Task EnsureLinkedTeamsAndDependentsBelongToClubAsync(
        Guid clubId,
        IReadOnlyList<Guid>? teamIds,
        IReadOnlyList<Guid>? dependentUserIds,
        CancellationToken cancellationToken
    )
    {
        if (teamIds is { Count: > 0 })
        {
            if (teamIds.Count > _userServiceOptions.MaxLinkedEntityIds)
                throw new ValidationException(
                    $"Cannot link more than {_userServiceOptions.MaxLinkedEntityIds} teams at once.",
                    errorCode: "team-ids-too-many"
                );

            var distinctTeamIds = teamIds.Distinct().ToList();
            var matching = await _teamRepository.CountTeamsInClubAsync(
                distinctTeamIds,
                clubId,
                cancellationToken
            );
            if (matching != distinctTeamIds.Count)
                throw new ValidationException(
                    "One or more teams do not belong to this club.",
                    errorCode: "team-not-in-club"
                );
        }

        if (dependentUserIds is { Count: > 0 })
        {
            if (dependentUserIds.Count > _userServiceOptions.MaxLinkedEntityIds)
                throw new ValidationException(
                    $"Cannot link more than {_userServiceOptions.MaxLinkedEntityIds} dependents at once.",
                    errorCode: "dependent-ids-too-many"
                );

            var distinctDependentIds = dependentUserIds.Distinct().ToList();
            var matching = await _userRepository.CountUsersInClubWithRoleAsync(
                distinctDependentIds,
                clubId,
                "Athlete",
                cancellationToken
            );
            if (matching != distinctDependentIds.Count)
                throw new ValidationException(
                    "One or more linked athletes are not valid Athlete users in this club.",
                    errorCode: "dependent-invalid"
                );
        }
    }

    /// <summary>
    /// Edit-mode companion to the WebApi's <c>CoachTeamLinkRule</c>/<c>ParentLinkRule</c>: those
    /// only reject an explicit empty list, treating an omitted field as "leave unchanged" — which
    /// has no way to see whether "unchanged" is already zero. This closes that gap using the
    /// user's actual current linkage, so a Coach/Parent can't be edited indefinitely while stuck
    /// at zero teams/dependents just by never supplying the field.
    /// </summary>
    private async Task EnsureCoachAndParentLinksRemainNonEmptyAsync(
        Guid userId,
        string roleName,
        IReadOnlyList<Guid>? teamIds,
        IReadOnlyList<Guid>? dependentUserIds,
        CancellationToken cancellationToken
    )
    {
        if (teamIds is null && string.Equals(roleName, "Coach", StringComparison.OrdinalIgnoreCase))
        {
            var existingTeamIds = await _teamRepository.ListTeamIdsForUserAsync(
                userId,
                cancellationToken
            );
            if (existingTeamIds.Count == 0)
                throw new ValidationException(
                    "A coach must be linked to at least one team.",
                    errorCode: "team-ids-required"
                );
        }

        if (
            dependentUserIds is null
            && string.Equals(roleName, "Parent", StringComparison.OrdinalIgnoreCase)
        )
        {
            var existingDependentIds = await _userRepository.ListDependentIdsForGuardianAsync(
                userId,
                cancellationToken
            );
            if (existingDependentIds.Count == 0)
                throw new ValidationException(
                    "A parent must be linked to at least one athlete.",
                    errorCode: "dependent-ids-required"
                );
        }
    }

    private List<string> ValidateBulkUploadAuthFields(BulkUploadValidUserDto row)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(row.FirstName))
            errors.Add("First name is required.");
        else if (!ValidationHelper.IsValidName(row.FirstName))
            errors.Add("First name may only contain letters, spaces, hyphens, and apostrophes.");

        if (string.IsNullOrWhiteSpace(row.LastName))
            errors.Add("Last name is required.");
        else if (!ValidationHelper.IsValidName(row.LastName))
            errors.Add("Last name may only contain letters, spaces, hyphens, and apostrophes.");

        if (!string.IsNullOrWhiteSpace(row.Email) && !ValidationHelper.IsValidEmail(row.Email))
            errors.Add("Please enter a valid email address.");

        if (IsJerseyNumberOutOfRange(row.JerseyNumber))
            errors.Add(
                $"Jersey number must be between {JerseyNumberConstraints.Min} and {JerseyNumberConstraints.Max}."
            );

        var bulkDobError = GetAthleteDateOfBirthValidationError(row.RoleName, row.DateOfBirth);
        if (bulkDobError is not null)
            errors.Add(bulkDobError.Value.Message);

        if (
            row.ParentGuardianEmail is { Length: > 0 }
            && !ValidationHelper.IsValidEmail(row.ParentGuardianEmail)
        )
            errors.Add("Please enter a valid Parent/Guardian email address.");

        if (!string.IsNullOrWhiteSpace(row.PhoneNumber))
        {
            var region = row.CountryCode ?? "ZA";
            if (!PhoneHelper.TryNormaliseInternationalPhone(row.PhoneNumber, region, out _))
                errors.Add(
                    $"Please enter a valid mobile number for the selected country ({region})."
                );
        }

        switch (row.AuthMethod)
        {
            case AuthenticationMethod.Credentials:
                if (string.IsNullOrWhiteSpace(row.Email))
                    errors.Add("Email is required for Credentials sign-in.");
                break;
            case AuthenticationMethod.CustomAuthentication:
                if (string.IsNullOrWhiteSpace(row.Username))
                    errors.Add("Username is required for Custom Authentication sign-in.");
                break;
            case AuthenticationMethod.PhoneOtp:
                if (string.IsNullOrWhiteSpace(row.PhoneNumber))
                    errors.Add("Phone number is required for Phone OTP sign-in.");
                break;
            case AuthenticationMethod.Google:
            case AuthenticationMethod.Microsoft365:
                if (string.IsNullOrWhiteSpace(row.Email))
                    errors.Add("Email is required for SSO sign-in.");
                break;
        }

        return errors;
    }

    private async Task AppendExistingUserConflictErrorsAsync(
        Guid clubId,
        BulkUploadValidUserDto row,
        List<string> errors,
        CancellationToken cancellationToken
    )
    {
        if (!string.IsNullOrWhiteSpace(row.Email))
        {
            try
            {
                await EnsureEmailAvailableAsync(
                    row.Email,
                    clubId,
                    excludeUserId: null,
                    cancellationToken
                );
            }
            catch (ConflictException ex)
                when (ex.ErrorCode is "email-conflict" or "user-exists-other-club")
            {
                errors.Add("A user with this email already exists.");
            }
        }

        if (!string.IsNullOrWhiteSpace(row.PhoneNumber))
        {
            try
            {
                await EnsurePhoneAvailableAsync(
                    row.PhoneNumber,
                    clubId,
                    excludeUserId: null,
                    cancellationToken
                );
            }
            catch (ConflictException ex)
                when (ex.ErrorCode is "phone-conflict" or "user-exists-other-club")
            {
                errors.Add("A user with this phone number already exists.");
            }
        }

        if (!string.IsNullOrWhiteSpace(row.Username))
        {
            try
            {
                await EnsureUsernameAvailableAsync(row.Username, cancellationToken);
            }
            catch (ConflictException ex) when (ex.ErrorCode == "username-conflict")
            {
                errors.Add("A user with this username already exists.");
            }
        }
    }

    public async Task<byte[]> ExportUsersAsync(
        Guid clubId,
        Guid? teamId,
        CancellationToken cancellationToken = default
    )
    {
        if (clubId == Guid.Empty)
            throw new ArgumentException("Club ID is required.", nameof(clubId));

        var filter = new UserFilter
        {
            ClubId = clubId,
            TeamId = teamId,
            SortBy = "DisplayName",
        };
        var users = await _userRepository.ListForExportAsync(filter, cancellationToken);

        // Build a team ID → name lookup for the club.
        var teams = await _teamRepository.ListNamesAsync(clubId, cancellationToken);
        var deptNames = teams.ToDictionary(d => d.Id, d => d.Name);

        return _exportExcelService.Generate(users, deptNames);
    }
}
