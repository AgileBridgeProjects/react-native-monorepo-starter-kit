using Azure.Storage.Blobs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StarterKit.Auth.Dev;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Core.Storage;

namespace StarterKit.WebApi.Dev;

/// <summary>
/// Development-only endpoints for bootstrapping a local admin account.
/// NOT active in staging or production — guarded by environment check.
/// </summary>
[ApiController]
[Route("api/dev")]
[Tags("Dev")]
public sealed class DevBootstrapController(
    IDevBootstrapService devBootstrapService,
    BlobServiceClient blobServiceClient,
    IReportSnapshotRefreshService snapshotRefreshService,
    IWebHostEnvironment env
) : ControllerBase
{
    // Prevents concurrent backfill runs from hammering the DB simultaneously.
    private static readonly SemaphoreSlim BackfillLock = new(1, 1);

    /// <summary>
    /// One-time setup: links admin@starterkit.local to the seeded StarterKit club and
    /// assigns SuperAdmin. Fully idempotent — safe to call multiple times.
    ///
    /// Steps:
    /// 1. Create admin@starterkit.local in Firebase Console (dev project), password P@ssword01*$
    /// 2. Get an ID token: POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={WEB_API_KEY}
    /// 3. Call this endpoint with Authorization: Bearer {idToken}
    /// 4. Sign in again to get a fresh token containing the club_id claim
    /// </summary>
    [HttpPost("bootstrap-admin")]
    [AllowAnonymous]
    [DisableRateLimiting]
    [RequiresBearerToken]
    [ProducesResponseType(typeof(BootstrapAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> BootstrapAdminAsync(CancellationToken cancellationToken)
    {
        if (!env.IsDevelopment())
            return Forbid();

        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return BadRequest("Authorization header with Firebase ID token required.");

        var headerValue = authHeader.ToString();
        if (!headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Authorization header must be 'Bearer <firebase-id-token>'.");

        var idToken = headerValue["Bearer ".Length..].Trim();

        try
        {
            var result = await devBootstrapService.BootstrapAdminAsync(idToken, cancellationToken);
            return Ok(
                new BootstrapAdminResponse
                {
                    UserId = result.UserId,
                    ClubId = result.ClubId,
                    Message =
                        "Admin bootstrapped. Sign in again to get a fresh token with the club_id claim.",
                }
            );
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception)
        {
            return BadRequest("Bootstrap failed — check the backend logs for details.");
        }
    }

    /// <summary>
    /// Dev-only: bootstraps any Firebase phone-auth user to the StarterKit dev club.
    /// Call this once after the OTP flow succeeds, then force-refresh the Firebase
    /// token on the client so the club_id claim is embedded in subsequent requests.
    ///
    /// Fully idempotent — safe to call multiple times.
    /// </summary>
    [HttpPost("bootstrap-phone")]
    [AllowAnonymous]
    [DisableRateLimiting]
    [RequiresBearerToken]
    [ProducesResponseType(typeof(BootstrapAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> BootstrapPhoneAsync(CancellationToken cancellationToken)
    {
        if (!env.IsDevelopment())
            return Forbid();

        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return BadRequest("Authorization header with Firebase ID token required.");

        var headerValue = authHeader.ToString();
        if (!headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Authorization header must be 'Bearer <firebase-id-token>'.");

        var idToken = headerValue["Bearer ".Length..].Trim();

        var result = await devBootstrapService.BootstrapPhoneUserAsync(idToken, cancellationToken);
        return Ok(
            new BootstrapAdminResponse
            {
                UserId = result.UserId,
                ClubId = result.ClubId,
                Message =
                    "Phone user bootstrapped. Force-refresh the Firebase token to get the club_id claim.",
            }
        );
    }

    public sealed class BootstrapAdminResponse
    {
        public Guid UserId { get; init; }
        public Guid ClubId { get; init; }
        public string Message { get; init; } = string.Empty;
    }

    /// <summary>
    /// Dev-only: backfills daily snapshot tables for all snapshot types over the given date range.
    /// Useful after importing a dev database that pre-dates the snapshot job.
    /// Idempotent — uses the upsert pattern so re-running is safe.
    /// Cap: 730 days per call to avoid request timeouts on very large ranges.
    /// </summary>
    [HttpPost("backfill-snapshots")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(BackfillSnapshotsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> BackfillSnapshotsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken
    )
    {
        if (!env.IsDevelopment())
            return Forbid();

        if (from > to)
            return BadRequest("'from' must be on or before 'to'.");

        if (to.DayNumber - from.DayNumber > 730)
            return BadRequest("Date range cannot exceed 730 days per call.");

        if (!await BackfillLock.WaitAsync(TimeSpan.Zero, cancellationToken))
            return Conflict("A backfill is already in progress.");

        try
        {
            var days = to.DayNumber - from.DayNumber + 1;
            await snapshotRefreshService.BackfillAsync(from, to, cancellationToken);

            return Ok(
                new BackfillSnapshotsResponse
                {
                    DaysBackfilled = days,
                    From = from,
                    To = to,
                }
            );
        }
        finally
        {
            BackfillLock.Release();
        }
    }

    public sealed class BackfillSnapshotsResponse
    {
        public int DaysBackfilled { get; init; }
        public DateOnly From { get; init; }
        public DateOnly To { get; init; }
    }

    /// <summary>
    /// Creates all required Azure Blob Storage containers in the local Azurite emulator.
    /// Idempotent — safe to call multiple times.
    /// </summary>
    [HttpPost("init-storage")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> InitStorageAsync(CancellationToken cancellationToken)
    {
        if (!env.IsDevelopment())
            return Forbid();

        var containers = new[]
        {
            BlobContainerName.Resources,
            BlobContainerName.ClubLogos,
            BlobContainerName.ReportExports,
        };
        foreach (var name in containers)
        {
            var container = blobServiceClient.GetBlobContainerClient(name);
            await container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
        }

        return Ok(new { created = containers });
    }
}
