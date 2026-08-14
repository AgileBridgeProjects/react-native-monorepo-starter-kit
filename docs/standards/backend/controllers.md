# Backend Controllers — The Law

Load this file when: writing or reviewing a controller action, adding a new endpoint, or working on request/response mapping. For folder structure see `structure.md`. For tests see `testing.md`.

> **MCP parity:** every controller action must also be exposed as an MCP tool in the sibling
> `Mcp/<X>McpTools.cs` class (same policies, same DTOs/mappers) — see `mcp.md` for the rules
> and the exclusion list. A new endpoint is not complete without its tool.

---

## Controller/Service Interface Contract

Every controller must implement a matching `I{Name}Controller` interface. The interface method names must match the corresponding service method names exactly (including the `Async` suffix). This enforces a 1-to-1 mapping — adding a service method without an endpoint, or vice versa, causes a compile error.

```csharp
// IAiJobsController.cs — defines the HTTP contract
public interface IAiJobsController
{
    Task<ActionResult<AiGenerateResponseDto>> GenerateQuizAsync(
        GenerateQuizRequestDto request, CancellationToken cancellationToken);
}

// AiJobsController.cs — must implement every method in the interface
public sealed class AiJobsController : ControllerBase, IAiJobsController
{
    public async Task<ActionResult<AiGenerateResponseDto>> GenerateQuizAsync(...) { ... }
}
```

Note: the request DTO cannot be passed directly to `IAiJobService` — Core must not reference MobileApi types (Clean Architecture dependency rule). The controller is responsible for mapping `{Feature}RequestDto` → `{Feature}Payload` at this boundary.

---

## Controller Conventions

- Controllers are thin — no business logic, no EF Core, no direct repository calls
- One controller per domain entity/feature (e.g. `UsersController`, `GamesController`)
- Controllers call `IService` methods from `StarterKit.Core` only
- For non-trivial endpoint flows, controllers call a single application service method that represents the use case instead of orchestrating multiple lower-level services inline
- Controller actions should be transport adapters only: map HTTP DTOs to Core request DTOs via API-layer mappers, await the application service, and map the result back to HTTP
- Do not put `if` / `switch` / loops / payload-building / serialization / resource-building logic in controller actions when that logic can live in the application service
- Do not catch domain exceptions in controller actions for normal flows; use a global exception handler / middleware / exception filter to translate them into HTTP responses
- API-layer mappers own HTTP request mapping and HTTP response mapping; Core/application services must not return `ActionResult`, `IResult`, or API response DTOs
- Extract the internal `UserId` from claims in a base controller or middleware — never repeat claim parsing in every action
- Return `ActionResult<T>` — never return raw objects from controller actions
- Use `[ProducesResponseType]` attributes on every action so Swagger documents all possible responses
- Apply `[Tags("...")]` at the class level so Orval splits generated files correctly by tag

```csharp
// VIOLATION: business logic in a controller
[HttpPost]
public async Task<IActionResult> CreateUser(CreateUserDto dto)
{
    if (await _context.Users.AnyAsync(u => u.Email == dto.Email)) // ← belongs in Core
        return Conflict();
    ...
}

// VIOLATION: controller referencing DbContext directly
public UsersController(AppDbContext context) // ← controllers never take DbContext

// CORRECT
[Tags("Users")]
[HttpPost]
[ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
[ProducesResponseType(StatusCodes.Status409Conflict)]
public async Task<ActionResult<UserDto>> CreateUser(
    CreateUserDto dto,
    CancellationToken cancellationToken)
{
    var user = await _userService.CreateAsync(dto, cancellationToken);
    return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user.ToDto());
}
```

---

## Controller Orchestration Pattern

For any endpoint with non-trivial flow control, use this split:

1. API controller
2. Core application service
3. API request/result mappers
4. Global exception handler

**Rules:**

- The controller owns HTTP only: attributes, model binding, request mapping, awaiting the application service, and response mapping
- The application service owns orchestration: sync vs async branching, payload preparation, calls to lower-level services, and use-case result construction
- The application service returns Core DTOs or Core result models only — never HTTP types
- API-layer mappers convert: HTTP request DTOs → Core request DTOs, Core result DTOs → API response DTOs / `ActionResult`
- Domain exceptions are translated to HTTP in one place via `IExceptionHandler`, middleware, or exception filters — not inside controller actions

```csharp
// VIOLATION: controller orchestrates the use case itself
public async Task<ActionResult> GenerateQuizJobAsync(GenerateQuizRequestDto request, bool sync)
{
    var prepared = await _aiJobPreparationService.PrepareQuizJobAsync(...);
    if (!sync)
        return Accepted(await _aiJobService.QueueJobAsync(...));
    return Ok(await _aiJobService.RunAsync(...));
}

// CORRECT: controller delegates orchestration to one application service
public async Task<ActionResult> GenerateQuizJobAsync(
    [FromForm] GenerateQuizRequestDto request,
    [FromQuery] bool sync = false,
    CancellationToken cancellationToken = default)
{
    return (
        await _aiJobsApplicationService.GenerateQuizJobAsync(
            request.ToQuizRequest(sync, _options.SyncTimeout),
            cancellationToken)
    ).ToActionResult();
}
```

---

## Sync/Async Endpoint Pattern (`?sync=`)

When an endpoint can run a job synchronously or asynchronously, use a single action with a `[FromQuery] bool sync = false` parameter — never two separate routes.

- `sync=false` (default): queue and return `202 Accepted` + `{ jobId }`
- `sync=true`: run inline, return `200 OK` + full result body; on timeout return `504` + `{ jobId }`

The `[ProducesResponseType]` for 504 must include the body type so Swagger/Orval documents it:

```csharp
// VIOLATION: two routes for the same job
[HttpPost("quiz/generate")]       // async
[HttpPost("quiz/generate/run")]   // sync — never do this

// CORRECT
[ProducesResponseType(typeof(QueueJobResponseDto), StatusCodes.Status202Accepted)]
[ProducesResponseType(typeof(AiJobResponse), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(QueueJobResponseDto), StatusCodes.Status504GatewayTimeout)]
public async Task<ActionResult> GenerateQuizJobAsync(
    [FromForm] GenerateQuizRequestDto request,
    [FromQuery] bool sync = false,
    CancellationToken cancellationToken = default)
{ ... }
```

---

## Domain Exceptions — Carry Structured Data

Domain-specific exceptions live in `StarterKit.Core/<Module>/Exceptions/` and extend `Exception` directly. They carry structured data that callers need — not just a message string.

```csharp
// StarterKit.Core/AI/Exceptions/AiJobTimeoutException.cs
public sealed class AiJobTimeoutException : Exception
{
    public Guid JobId { get; }
    public AiJobTimeoutException(Guid jobId, TimeSpan timeout)
        : base($"AI job {jobId} did not reach a terminal state within {timeout.TotalSeconds}s.")
    {
        JobId = jobId;
    }
}
```

**Rules:**

- Throw `AiJobTimeoutException` (not `TimeoutException`) — the plain `TimeoutException` carries no structured data
- Catch `AiJobTimeoutException` specifically in the controller — not the base `TimeoutException`
- Return `StatusCode(504, new QueueJobResponseDto { JobId = ex.JobId })` so the client can still poll

```csharp
// VIOLATION: throws plain TimeoutException — caller loses the job ID
throw new TimeoutException($"AI job {jobId} timed out.");

// CORRECT
throw new AiJobTimeoutException(jobId, timeout);
```

---

## Controller Error Logging

Controllers **must** inject `ILogger<T>` and use it to log exceptions before returning error responses. Never expose `ex.Message` verbatim to callers — it can leak internal details.

```csharp
// VIOLATION: ex.Message returned to caller
catch (Exception ex)
{
    return BadRequest($"Failed to process '{file.FileName}': {ex.Message}"); // leaks internals
}

// CORRECT: log the full exception server-side; return a generic message to the caller
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to process uploaded file '{FileName}' ({ContentType}).",
        file.FileName, file.ContentType);
    return BadRequest($"'{file.FileName}' could not be processed. Please check the file and try again.");
}
```

---

## Server-Side URL Fetching — SSRF Guard

Any controller action that fetches a user-supplied URL server-side **must** include an SSRF guard. A scheme check alone is not sufficient — an attacker can supply `http://169.254.169.254` (AWS/Azure metadata), `http://localhost`, or any private subnet IP.

**Mandatory steps before fetching:**

1. Validate the scheme is `http` or `https`
2. Resolve the hostname via `Dns.GetHostAddressesAsync`
3. Block if any resolved address is loopback, link-local, or in a private range
4. Use `_httpClientFactory.CreateClient(Options.DefaultName)` — never the parameterless extension method

```csharp
// VIOLATION: scheme check only — SSRF possible via metadata IPs
if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https")
    return null;
var html = await httpClient.GetStringAsync(uri, ct); // ← hits 169.254.169.254 freely

// CORRECT
if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
    || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
{
    ModelState.AddModelError("url", $"'{url}' is not a valid HTTP or HTTPS URL.");
    return null;
}

var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, cancellationToken);
if (addresses.Length == 0 || addresses.Any(IsPrivateOrLoopback))
{
    ModelState.AddModelError("url", $"'{url}' resolves to a disallowed address.");
    return null;
}

var httpClient = _httpClientFactory.CreateClient(Options.DefaultName);
var html = await httpClient.GetStringAsync(uri, cancellationToken);
```

The `IsPrivateOrLoopback` helper blocks: loopback (`127.x`, `::1`), link-local / IMDS (`169.254.x`, `fe80::`), private ranges (`10.x`, `172.16–31.x`, `192.168.x`), CG-NAT (`100.64–127.x`), and IPv6 unique-local (`fc00::/7`). See `AiJobsController` for the reference implementation.

---

## Validation — Collect All Errors Before Returning

When validating a list of inputs, **collect all errors before returning** so the caller sees every problem in one response.

```csharp
// VIOLATION: returns on first bad file
foreach (var file in files)
{
    if (unsupported) { ModelState.AddModelError(...); return null; } // ← stops here
}

// CORRECT: accumulate, then fail once
var fileErrors = new List<string>();
foreach (var file in files)
{
    if (tooBig)      { fileErrors.Add($"'{file.FileName}' exceeds the 10 MB limit."); continue; }
    if (unsupported) { fileErrors.Add($"'{file.FileName}' has unsupported type."); continue; }
    resources.Add(resource);
}
if (fileErrors.Count > 0)
{
    foreach (var error in fileErrors)
        ModelState.AddModelError(nameof(SomeRequestDto.Files), error);
    return null;
}
```

---

## `[NonEmptyGuid]` — Validating Guid Properties on Request DTOs

`NonEmptyGuidAttribute` lives in `StarterKit.Core.Validation` and rejects `Guid.Empty` with a standard model-validation error.

Apply `[NonEmptyGuid]` to any `Guid` (or `Guid?`) property on an HTTP request DTO where `Guid.Empty` is not a valid value:

```csharp
using StarterKit.Core.Validation;

public sealed record GenerateQuizRequestDto
{
    [NonEmptyGuid]
    public required Guid AiConfigModelId { get; init; }

    [NonEmptyGuid]
    public required Guid TopicId { get; init; }
}
```

**Rules:**

- Always add `[NonEmptyGuid]` to every `Guid` property where the caller must supply a real ID
- Do **not** create a local copy — the canonical version is in `StarterKit.Core.Validation`

---

## Async / Await Conventions

Never `await` inside an `if` condition — always assign the result to a named variable first.

```csharp
// VIOLATION
if (!await ledgerService.HasSufficientCreditsAsync(organisationId, cost, ct))
    throw new InsufficientCreditsException(organisationId, cost);

// CORRECT
var hasSufficientCredits = await ledgerService.HasSufficientCreditsAsync(organisationId, cost, ct);
if (!hasSufficientCredits)
    throw new InsufficientCreditsException(organisationId, cost);
```

---

## ICurrentSession — Claims Access

Inject `ICurrentSession` (defined in `StarterKit.Core/Interfaces/`) into any service or controller that needs the current user's identity. **Never** read claims via `IHttpContextAccessor` or `ClaimsPrincipal` extension methods directly.

| Property | When to use | Throws if unauthenticated? |
|---|---|---|
| `UserId` | Inside `[Authorize]`-guarded endpoints | ✅ `InvalidOperationException` |
| `CompanyId` | Inside `[Authorize]`-guarded endpoints | ✅ `InvalidOperationException` |
| `UserIdOrDefault` | Code paths shared by auth + anonymous | ❌ returns `null` |
| `CompanyIdOrDefault` | Code paths shared by auth + anonymous | ❌ returns `null` |
| `IsAuthenticated` | Guards / conditional flows | ❌ — safe anywhere |

```csharp
// VIOLATION: reading claims manually in a controller
var userId = User.FindFirstValue("internal_user_id");
// ← use ICurrentSession.UserId instead

// CORRECT
public sealed class MyService(ICurrentSession session)
{
    var companyId = session.CompanyId;   // safe — endpoint is [Authorize]
}
```

`ICurrentSession` is registered as **Scoped** by `AddStarterKitAuth()`. For background jobs (Hangfire) there is no `HttpContext` — always use `CompanyIdOrDefault` / `UserIdOrDefault` in background processors.

---

## Exception Handling Conventions

Domain exceptions must be translated to HTTP responses in the API pipeline, not inline in controller actions.

**Rules:**

- Prefer `IExceptionHandler` for API-wide exception-to-response translation
- Register exception handlers in `Program.cs` and call `app.UseExceptionHandler()`
- Controller actions should not contain `try/catch` for expected domain exceptions in normal flows
- Use `HttpValidationProblemDetails` for validation-style failures
- Use typed API DTOs for non-validation failures that still need structured bodies

### EntityNotFoundException — standard not-found handling

`DbSetExtensions.GetAsync` throws `StarterKit.Data.Exceptions.EntityNotFoundException` whenever a required entity is missing. The global `EntityNotFoundExceptionHandler` catches it and returns a `ProblemDetails` HTTP 404. No controller should catch this exception inline.

**Preferred pattern for Get-by-ID endpoints:**

```csharp
// CORRECT — null check; not-found produces 404
var company = await companyService.FindByIdAsync(id, cancellationToken);
if (company is null) return NotFound();
return Ok(ToResponse(company));

// CORRECT — mutating endpoints: let EntityNotFoundException bubble to the global handler
await companyService.UpdateAsync(id, request.Name, cancellationToken);
return Ok(ToResponse(company));

// VIOLATION — never catch InvalidOperationException inline
try { ... }
catch (InvalidOperationException) { return NotFound(); } // ← too broad; swallows real errors
```

### Created() URL Format

Always include a leading `/` in the `Created()` location URL:

```csharp
// CORRECT
return Created($"/api/companies/{company.Id}", ToResponse(company));

// VIOLATION
return Created($"api/companies/{company.Id}", ToResponse(company)); // ← missing leading /
```

---

## OpenAPI and Enum Serialisation

### Global `JsonStringEnumConverter`

Both APIs register `JsonStringEnumConverter` globally in `AddJsonOptions()`. All enums serialise as **strings** over the wire — no per-enum `[JsonConverter]` attributes are needed or allowed.

```csharp
// VIOLATION: per-enum JsonConverter attribute (redundant and inconsistent)
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum QuestionDifficulty { Easy, Medium, Hard }

// CORRECT: plain enum, relies on global converter
public enum QuestionDifficulty { Easy, Medium, Hard }
```

### Controller Tags

Every controller must have a `[Tags("...")]` attribute so that Orval splits generated files correctly:

```csharp
// VIOLATION: controller without Tag attribute
[Route("api/ai")]
[ApiController]
public sealed class AiJobsController : ControllerBase { }

// CORRECT
[Tags("AiJobs")]
[Route("api/ai")]
[ApiController]
public sealed class AiJobsController : ControllerBase { }
```
