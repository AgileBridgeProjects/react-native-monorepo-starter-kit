# Backend MCP Tools — The Law

Load this file when: adding or changing any controller action, adding a new module, or working
on the MCP server infrastructure (`StarterKit.Mcp`). Every API endpoint is also exposed as an MCP
(Model Context Protocol) tool so AI agents can operate the platform with the caller's own
identity and permissions.

---

## Architecture

Both API projects host an MCP server (official `ModelContextProtocol.AspNetCore` SDK) at the
path configured in the `Mcp` appsettings section (`/mcp`). Shared wiring lives in
`src/StarterKit.Mcp/`:

- `AddStarterKitMcp(typeof(Program).Assembly)` — registers the server: stateless Streamable HTTP
  transport, `[Authorize]` filter support, domain-exception → tool-error mapping, and discovers
  every `[McpServerToolType]` class in the API assembly. Tools register automatically — there is
  no per-module registration step.
- `MapStarterKitMcp(RateLimitPolicies.ApiDefault)` — maps the endpoint with `RequireAuthorization()`
  and the default rate-limit policy. No-op when `Mcp:Enabled` is false.

Stateless mode means every tool call is an ordinary authenticated HTTP request sharing the
request's DI scope: `ICurrentSession`, EF Core tenant query filters, auditing, and rate limiting
all behave exactly as they do inside controllers. **Never** build separate session or tenant
plumbing for MCP.

Clients connect with the same Supabase (GoTrue) bearer token the REST API uses:
`Authorization: Bearer <jwt>` against `https://<api-host>/mcp` (Streamable HTTP).

---

## The Parity Rule — every controller has a sibling MCP tool class

**A controller action is not complete until its MCP tool exists.** Each controller gets exactly
one tool class:

```text
StarterKit.<Api>/<Module>/
    <X>Controller.cs
    Mcp/<X>McpTools.cs      ← sibling MCP tool class, 1:1 with the controller's actions
```

The tool class mirrors the controller 1:1: same injected Core service(s), same Mapperly mappers,
same request/response DTOs, and one tool method per controller action — except the exclusions
below. `npm run check:architecture` (rule `mcp-tool-parity`) fails when a controller has no
sibling `Mcp/<X>McpTools.cs`.

### Excluded from MCP (do not create tools for these)

| Category | Why | Examples |
|---|---|---|
| Dev-only controllers | local bootstrap helpers, not product surface | `DevBootstrapController` |
| Anonymous token-flow endpoints | secured by one-time links, not bearer auth — no agent use case | `UsersSetupController` (setup validate/complete, password reset) |
| Binary upload/download actions | multipart/file streams don't map to MCP tool JSON | avatar/image/resource upload, bulk-upload preview/confirm, CSV/XLSX export |

Excluded **controllers** are listed in the `MCP_EXEMPT_CONTROLLERS` set in
`scripts/check-architecture.mjs`; excluded **actions** are simply omitted from the tool class
with a `// Not MCP-exposed: <reason>` comment above the class or a note in its XML doc.

---

## Tool Class Conventions

```csharp
// StarterKit.MobileApi/CheckIns/Mcp/CheckInsMcpTools.cs — canonical reference
[McpServerToolType]
public sealed class CheckInsMcpTools(ICheckInService checkInService)
{
    [McpServerTool(Name = "check_ins_submit")]
    [Authorize]
    [Description("Submits a daily emotion check-in for the current user.")]
    public async Task<CheckInResponse> SubmitAsync(
        CreateCheckInRequest request,
        CancellationToken cancellationToken
    )
    {
        var dto = await checkInService.SubmitAsync(request.ToDto(), cancellationToken);
        return dto.ToResponse();
    }
}
```

**Rules:**

- Class name `<X>McpTools`, `sealed`, primary constructor injecting the **same Core services**
  the controller injects — tools are thin transport adapters, identical altitude to controllers.
  No business logic, no repositories, no `DbContext`.
- Tool names are `snake_case`, prefixed with the module: `users_list`, `check_ins_submit`,
  `notifications_send_email`. Always set `Name` explicitly — never rely on derived names.
- `[Description]` on **every tool method and every non-obvious parameter** — this is the tool's
  API documentation for the model. Write what it does and for whom, not how.
- Set `ReadOnly = true` on query tools, `Destructive = true` on delete tools, and
  `Idempotent = true` where re-running is safe. These hints let clients gate confirmation.
- Reuse the module's HTTP request/response DTOs and Mapperly mappers — the MCP wire shape must
  match the REST wire shape. Never define MCP-only DTOs unless the REST shape physically cannot
  be used (document why).
- Return the response DTO directly (or a list of them) — never `ActionResult`, never manual
  JSON. Errors are handled by the shared filter, not in the tool.

### Authorization — mirror the controller exactly

Every tool method carries the **same authorization attributes as its controller action**:

```csharp
// Controller action:
[HttpPost] [Authorize(Policy = StarterKitPermissions.Users.Manage)]

// Its tool — identical policy:
[McpServerTool(Name = "users_create")]
[Authorize(Policy = StarterKitPermissions.Users.Manage)]
```

`AddAuthorizationFilters()` enforces these per tool and hides unauthorized tools from
`tools/list`. A tool with a weaker policy than its controller action is a security defect.
Controller-level `[Authorize]` (no policy) → plain `[Authorize]` on every tool method of that
class.

**The one intended divergence — `[AllowAnonymous]`:** the MCP endpoint itself is mapped with
`RequireAuthorization()`, so *every* MCP call is authenticated and an anonymous REST action
cannot be mirrored 1:1. Mirroring is therefore "never weaker than the controller", not
"identical": an `[AllowAnonymous]` action that is still useful to an agent (e.g. the Clubs
upload-constraints lookup) gets a plain `[Authorize]` on its tool plus a comment noting the
endpoint-level requirement. Anonymous actions whose whole purpose is pre-authentication —
one-time setup-token and password-reset flows — are excluded from MCP entirely (see the
exclusion table above), never re-exposed behind auth.

**Impersonation caveat:** `X-Impersonate-*` headers are ignored on the MCP endpoint (the
`[AllowImpersonation]` opt-in is per REST controller, and the single MCP endpoint does not carry
it). SuperAdmin MCP callers operate cross-tenant per their real claims. Do not add
`AllowImpersonation` metadata to the MCP endpoint without a deliberate security review.

### Error handling

Do **not** try/catch in tool methods. The shared `AddCallToolFilter` in
`StarterKit.Mcp/Extensions/ServiceCollectionExtensions.cs` maps `EntityNotFoundException`,
`ConflictException`, `ValidationException`, and `ArgumentException` to descriptive tool errors —
the MCP counterpart of the API projects' `IExceptionHandler`s. Anything else surfaces as the
SDK's generic error so internals never leak.

```csharp
// VIOLATION: catching domain exceptions inside a tool
try { ... } catch (EntityNotFoundException) { return null; }  // ← the filter owns this

// VIOLATION: MCP-only response shape when the REST DTO works
public sealed record UserMcpResponse { ... }  // ← reuse UserResponse + existing mapper
```

---

## Configuration

`Mcp` appsettings section per API project (Options pattern, `McpOptions` in `StarterKit.Mcp`):

```json
"Mcp": { "Enabled": true, "Path": "/mcp", "ServerName": "starterkit-mobile" }
```

`ServerName` is `starterkit-mobile` (MobileApi) / `starterkit-admin` (WebApi). `Enabled: false` is the
ops kill-switch — the endpoint is simply not mapped.

---

## Testing

MCP tests live in each API test project under `Mcp/` and extend the existing integration test
base. Use the real MCP client from the SDK over `WebApplicationFactory`'s HttpClient:

1. **Auth test** — unauthenticated requests to `/mcp` return 401.
2. **Parity test** — `tools/list` returns exactly the expected tool names for a fully-permitted
   user. Adding/removing a tool must break this test so parity stays deliberate.
3. **Behaviour tests** — at least one `tools/call` per tool class against mocked Core services,
   asserting the round-trip result (the MCP analog of controller integration tests).

Unit-test coverage of the underlying service methods stays where it already is (Core.Tests) —
tools add no logic, so no separate Core-level tests are required for delegation alone.

---

## New Endpoint Checklist (goes with `controllers.md`)

1. Scaffold (`npm run scaffold:backend`) — generates `Mcp/<X>McpTools.cs` alongside the controller.
2. One tool method per new controller action, same policy attributes, `snake_case` name.
3. `[Description]` on the tool and parameters; `ReadOnly`/`Destructive`/`Idempotent` hints set.
4. Update the API project's MCP parity test with the new tool names.
5. `npm run check:architecture` passes (`mcp-tool-parity`).
