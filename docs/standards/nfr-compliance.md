# POPIA & GDPR Compliance Implementation Guide

Companion to `docs/standards/non-functional-requirements.md` — Compliance section.

> South African POPIA (Protection of Personal Information Act) is the primary compliance
> obligation. GDPR alignment is required for any EU user data. These are not optional.

---

## Data Classification

Before building any feature that stores user data, classify each field:

| Category | Examples | Obligations |
|---|---|---|
| **PII** | name, email, phone number, username, IP address, device ID | Consent required; subject to access/erasure |
| **Sensitive PII** | national ID, health info, financial details, biometrics | Higher consent bar; additional encryption at rest |
| **Non-PII** | game scores, anonymous analytics, aggregated metrics | Standard retention; no special handling |

**Rule for AI tools:** when adding a new database column, state its data classification in the PR
description. Any PII column requires a consent reference, erasure cascade, and log-redaction update.

---

## Consent Flow

### Mobile — first-launch consent

Display a consent screen during onboarding before any personal data is collected:

```tsx
// src/features/onboarding/presentation/screens/consent-screen.tsx
export function ConsentScreen() {
  const { mutate: recordConsent } = useRecordConsent();

  return (
    <ScrollView>
      <Typography variant="h2">Your privacy</Typography>
      <Typography variant="body">
        StarterKit collects your name and email to manage your account.
        See our Privacy Notice for full details.
      </Typography>
      <Button
        variant="primary"
        onPress={() => recordConsent({ consentVersion: CURRENT_CONSENT_VERSION })}
      >
        I agree
      </Button>
    </ScrollView>
  );
}
```

### Consent record in the database

```csharp
// StarterKit.Data/Users/Models/UserConsent.cs
public sealed class UserConsent
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string ConsentVersion { get; init; } = string.Empty; // e.g. "2024-01-v1"
    public DateTime ConsentGivenAt { get; init; }               // use TimeProvider.Now()
    public string IpAddress { get; init; } = string.Empty;      // hashed before storage
}
```

Store `ConsentVersion` as a constant (`CURRENT_CONSENT_VERSION`) so that re-consent can be
triggered by bumping the version when data-collection scope changes.

---

## Data Access Endpoint (Right of Access)

```csharp
// StarterKit.MobileApi/Users/UsersController.cs
[HttpGet("me/data")]
[Authorize]
[ProducesResponseType(typeof(UserDataExportDto), StatusCodes.Status200OK)]
public async Task<ActionResult<UserDataExportDto>> ExportMyDataAsync(
    CancellationToken cancellationToken)
{
    var userId = GetCurrentUserId();
    var export = await _userService.ExportUserDataAsync(userId, cancellationToken);
    return Ok(export);
}
```

`UserDataExportDto` must include every PII field stored for the user: profile, consent records,
game history (where linked to the user), and any AI job inputs/outputs.

---

## Erasure Endpoint (Right to Be Forgotten)

```csharp
// StarterKit.MobileApi/Users/UsersController.cs
[HttpDelete("me")]
[Authorize]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<ActionResult> DeleteMyAccountAsync(
    CancellationToken cancellationToken)
{
    var userId = GetCurrentUserId();
    await _userService.EraseUserAsync(userId, cancellationToken);
    return NoContent();
}
```

### Erasure implementation rules

1. **Hard delete PII fields** from the primary user record, or replace with anonymised values.
2. **Cascade** to all related tables that reference `UserId` (game history, consents, AI jobs).
3. **Anonymise audit logs** — replace user-identifying values with `[DELETED-{sha256(userId)}]`
   so that audit trails remain intact without containing personal data.
4. **Revoke auth tokens** — call Firebase Auth `DeleteUser` / Azure B2C account removal.
5. **Do not use soft-delete for erasure requests** — soft-deleted records still hold PII.

```csharp
// StarterKit.Core/Users/Services/UserService.cs
public async Task EraseUserAsync(Guid userId, CancellationToken ct)
{
    var user = await _userRepository.GetAsync(userId, ct);

    // Anonymise rather than delete to preserve referential integrity in audit tables
    var anonymisedHandle = $"[DELETED-{ComputeHash(userId)}]";
    user.Anonymise(anonymisedHandle, _clock);

    await _userRepository.UpdateAsync(user, ct); // persist anonymisation

    // Hard delete related PII tables
    await _consentRepository.DeleteAllForUserAsync(userId, ct);
    await _sessionRepository.DeleteAllForUserAsync(userId, ct);

    // Revoke Firebase / B2C auth account
    await _authProvider.DeleteUserAsync(user.ExternalAuthId, ct);
}
```

---

## PII Redaction in Logs

### Serilog destructuring policy

Add to `Program.cs` before `Log.Logger` is used:

```csharp
Log.Logger = new LoggerConfiguration()
    .Destructure.ByTransforming<User>(u => new
    {
        u.Id,          // safe — internal GUID
        Email = "[Redacted]",
        Name  = "[Redacted]",
    })
    .WriteTo.ApplicationInsights(TelemetryConfiguration.Active, TelemetryConverter.Traces)
    .CreateLogger();
```

### Rules for structured log messages

```csharp
// VIOLATION: PII in log template
_logger.LogInformation("User {Email} logged in.", user.Email);

// VIOLATION: PII via object destructuring
_logger.LogInformation("Processing request for {@User}.", user); // logs all properties

// CORRECT: log only safe identifiers
_logger.LogInformation("User {UserId} logged in.", user.Id);

// CORRECT: explicit redaction when the object must be logged
_logger.LogInformation("Processing request for user {UserId} ({Email}).",
    user.Id, "[Redacted]");
```

---

## Data Retention Policy

Define retention windows per data class and enforce via a Hangfire scheduled job:

| Data class | Retention window | Action on expiry |
|---|---|---|
| User accounts (inactive) | 3 years after last login | Anonymise + notify |
| Game session data | 5 years | Anonymise |
| AI job inputs/outputs | 90 days | Hard delete |
| Audit logs | 7 years | Archive (no delete) |
| Consent records | Duration of account + 3 years | Archive |

```csharp
// StarterKit.Core/Users/Services/RetentionPurgeService.cs
[AutomaticRetry(Attempts = 3)]
public async Task PurgeExpiredAiJobDataAsync(IJobCancellationToken cancellationToken)
{
    var cutoff = _clock.Now().AddDays(-90);
    await _aiJobRepository.DeleteInputsOlderThanAsync(cutoff, cancellationToken.ShutdownToken);
}
```

Register the purge job on a nightly schedule in `Program.cs`:

```csharp
RecurringJob.AddOrUpdate<RetentionPurgeService>(
    "purge-expired-ai-jobs",
    service => service.PurgeExpiredAiJobDataAsync(JobCancellationToken.Null),
    Cron.Daily);
```

---

## Data Breach Response Runbook

When a suspected data breach is detected:

1. **Detect** — alert fires in Application Insights / Sentry; on-call engineer is paged
2. **Contain** — isolate the affected service; revoke compromised credentials immediately
3. **Assess** — determine which data was accessed, for how many users, over what period
4. **Notify** — POPIA requires notification to the Information Regulator within **72 hours**;
   affected users must be notified "as soon as reasonably possible"
5. **Remediate** — patch the vulnerability; rotate all secrets; re-run security scan
6. **Document** — write an incident post-mortem; update runbook with lessons learned

The Information Regulator contact: [www.justice.gov.za/inforeg/](https://www.justice.gov.za/inforeg/)

---

## New-Feature Compliance Checklist

When adding any feature that collects or processes personal data, include in the PR description:

```text
POPIA/GDPR checklist:
- [ ] Data classification documented (PII / Sensitive PII / Non-PII)
- [ ] Consent mechanism exists or is referenced
- [ ] Erasure cascade added to UserService.EraseUserAsync
- [ ] Data included in UserDataExportDto for access export
- [ ] No PII fields in log messages (redaction applied)
- [ ] Retention period defined and purge job updated
- [ ] Privacy notice updated if new data category is introduced
```
