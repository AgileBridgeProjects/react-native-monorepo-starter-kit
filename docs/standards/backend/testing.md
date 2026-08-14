# Backend Testing — The Law

Load this file when: writing any test, reviewing test coverage, or scaffolding a new feature. Every new file with logic gets a test file before the PR is merged — no exceptions.

---

## Every Endpoint MUST Have Tests

**A controller action is not complete until all three of the following exist:**

1. **Integration test** in `StarterKit.MobileApi.Tests` or `StarterKit.WebApi.Tests` — fires a real HTTP request via `WebApplicationFactory`, asserts the response status code and body shape
2. **Unit test** in `StarterKit.Core.Tests` — tests the service method called by the endpoint in isolation using `Moq`, with no database or HTTP dependency
3. **Repository test** in `StarterKit.Data.Tests` — tests any new repository method using EF Core InMemory or Testcontainers

---

## Test Structure — Mandatory Conventions

- All test files use **file-scoped namespaces** (`namespace X.Y.Z;`) — never block-scoped
- The field holding the system under test is always named **`Sut`** — never `_sut`, `sut`, or the type name
- Group tests by scenario using **nested `public sealed class`** inner classes — never put all facts flat in one class
- The outer test class is `public abstract` when it hosts a shared `DefaultPayload` or base setup; `public` when it is the only class
- **Never copy-paste the same `[Fact]` across multiple test classes** — extract to a generic abstract base class instead
- Stub/fake types needed for isolation are defined as **`private sealed class`** inner types inside the test class that needs them — never in a separate file
- Do **not** test what the compiler already guarantees (e.g., a non-nullable return type is never null)

```csharp
// VIOLATION: file-scoped namespace missing
namespace StarterKit.Core.Tests.AI.Prompts
{
    public class QuizPromptBuilderTests { }
}

// VIOLATION: wrong Sut naming
private readonly QuizPromptBuilder _sut = new();

// VIOLATION: all facts flat in one class
public class QuizPromptBuilderTests
{
    [Fact] public void ReturnsNonEmptySystemPrompt() { ... }
    [Fact] public void Build_WhenDifficultyProvided_UserMessageIncludesDifficulty() { ... }
}

// CORRECT: nested sealed classes + Sut + file-scoped namespace
namespace StarterKit.Core.Tests.AI.Prompts;

public abstract class QuizPromptBuilderTests
    : PromptBuilderTests<QuizPromptBuilder, QuizPayload>
{
    protected override QuizPayload DefaultPayload =>
        new() { QuestionCount = 5, Resources = PromptTestResources.Default };

    public sealed class Build_WithRequiredFieldsOnly : QuizPromptBuilderTests
    {
        [Fact]
        public void Build_WithRequiredFieldsOnly_UserMessageContainsQuestionCount()
        {
            Sut.Build(DefaultPayload).UserMessage.Should().Contain("5");
        }
    }
}
```

---

## StarterKit.Core.Tests — Unit Tests

- Use `Moq` to mock all dependencies injected into the service under test
- Use `Bogus` (`Faker`) to generate realistic test data — never hardcode `"test@test.com"` or `Guid.Empty`
- Use `FluentAssertions` for all assertions — never use bare `Assert.Equal`
- Every service method must have tests for: happy path, not-found case, and any validation/conflict case
- Never test EF Core or SQL in this project — mock `IRepository<T>` at the boundary

### Shared Test Factories / Helpers

All reusable test-data builders for a sub-module live in a `Helpers/` folder next to the test classes. Reference: `StarterKit.Core.Tests/AI/Helpers/AiTestHelpers.cs` — a single `internal static class` with Bogus-backed factory methods.

```text
tests/StarterKit.Core.Tests/
  AI/
    Helpers/
      AiTestHelpers.cs     ← FakeRequest(), FakeAzureOptions(), FakeConfiguration(), …
    Providers/
      AzureOpenAIProviderTests.cs
```

```csharp
// VIOLATION: hardcoded test data
var user = new User { Email = "test@test.com", Id = Guid.Empty };

// VIOLATION: bare Assert
Assert.Equal("test@test.com", result.Email);

// CORRECT
var request = AiTestHelpers.FakeRequest();
result.Content.Should().Be("Azure response");
```

### `FakeHttpMessageHandler` Rule

Any `HttpMessageHandler` stub must be a `private sealed class` nested inside the test class — never `internal` and never in a separate file.

### `ZeroStream` Rule

Tests that exercise file-size limits must **not** pre-allocate the full byte array (`new byte[11 * 1024 * 1024]`). Use a `ZeroStream` — a custom `Stream` subclass defined as a `private sealed class` inside the test class.

```csharp
// VIOLATION: allocates 11 MB in the test process
var oversizedContent = new ByteArrayContent(new byte[11 * 1024 * 1024]);

// CORRECT: streams 11 MB of zeros without pre-allocating
var oversizedContent = new StreamContent(new ZeroStream(11L * 1024 * 1024));
```

### EF Core `AddAsync` Mock Callback Rule

When mocking `IRepository.AddAsync` in a unit test, use a Moq `Callback` to assign a real `Guid.NewGuid()` to the entity's `Id`:

```csharp
// VIOLATION: Id stays Guid.Empty
_jobRepoMock
    .Setup(x => x.AddAsync(It.IsAny<AiJob>(), It.IsAny<CancellationToken>()))
    .Returns(Task.CompletedTask);

// CORRECT
_jobRepoMock
    .Setup(x => x.AddAsync(It.IsAny<AiJob>(), It.IsAny<CancellationToken>()))
    .Callback<AiJob, CancellationToken>((job, _) => job.Id = Guid.NewGuid())
    .Returns(Task.CompletedTask);
```

---

## StarterKit.Data.Tests — Repository / EF Core Tests

- Use EF Core InMemory for fast CRUD and query tests
- Use `Testcontainers.PostgreSql` for tests that require real SQL behaviour (constraints, indexes, raw SQL)
- Each test class gets its own InMemory database instance (use `Guid.NewGuid().ToString()` as the DB name) — never share state between tests
- Test `AddAsync`, `FindByIdAsync`, `UpdateAsync`, `DeleteAsync`, and any custom query methods
- Use `IDisposable` to dispose the `DbContext` after each test class

```csharp
// VIOLATION: shared database across tests
.UseInMemoryDatabase("SharedDb")

// CORRECT: isolated per test class
.UseInMemoryDatabase(Guid.NewGuid().ToString())
```

---

## StarterKit.MobileApi.Tests / StarterKit.WebApi.Tests — Integration Tests

- Every controller action gets at least one integration test asserting the HTTP status code
- Authenticated endpoints must be tested with the `TestAuthHandler` fake user — never skip auth
- Use `WebApplicationFactory` with InMemory database — never point integration tests at a real database
- Test both the happy path (200/201) and the auth failure path (401) for every protected endpoint

### Integration Test Base Class (Mandatory)

**Every integration test class in `StarterKit.MobileApi.Tests` MUST extend `MobileApiIntegrationTestBase`.**

Do not redeclare `WebApplicationFactory`, `JsonOptions`, `Faker`, `TestCompanyId`, or the auth scheme setup — they are all in the base class.

```csharp
// VIOLATION: redeclaring base class members
public abstract class FooControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    protected static readonly JsonSerializerOptions JsonOptions = ...;
    // ← ALL of the above already exist in MobileApiIntegrationTestBase
}

// CORRECT
public abstract class FooControllerTests : MobileApiIntegrationTestBase
{
    protected FooControllerTests(WebApplicationFactory<Program> factory) : base(factory) { }

    protected HttpClient CreateClient(Mock<IFooService> serviceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IFooService>(_ => serviceMock.Object);
        });
    }
}
```

```csharp
// VIOLATION: asserting only status code
response.StatusCode.Should().Be(HttpStatusCode.OK);

// CORRECT: also assert the response body shape
response.StatusCode.Should().Be(HttpStatusCode.OK);
var body = await response.Content.ReadFromJsonAsync<UserDto>();
body.Should().NotBeNull();
body!.Email.Should().NotBeNullOrEmpty();
```

---

## E2E Tests — Mandatory When a New Endpoint Completes a User-Facing Flow

**A new endpoint requires E2E coverage when:**

1. A frontend screen calls it as part of a user-visible action
2. The result is observable in the UI (data rendered, redirect, toast, error message)

See `docs/standards/e2e-testing.md` for full E2E rules and test structure.

---

## What Triggers a Test Requirement

Every one of these automatically requires tests before the task is considered complete:

- New controller action → integration test (API project) + unit test (Core.Tests)
- New service method → unit test in Core.Tests
- New repository method → repository test in Data.Tests
- New EF Core entity or migration → Data.Tests covering the new schema
- **Empty migrations are forbidden** — if a migration has no SQL in `Up()`/`Down()`, delete it with `dotnet ef migrations remove` and resolve the underlying cause before committing
- Modified service method → update existing tests, add cases for new behaviour
- Bug fix → add a regression test that would have caught the bug

---

## Test File Locations

```text
tests/
  StarterKit.Core.Tests/
    Services/
      UserServiceTests.cs        ← mirrors src/StarterKit.Core/Services/UserService.cs
  StarterKit.Data.Tests/
    Repositories/
      UserRepositoryTests.cs     ← mirrors src/StarterKit.Data/Repositories/UserRepository.cs
  StarterKit.MobileApi.Tests/
    Controllers/
      UsersControllerTests.cs    ← mirrors src/StarterKit.MobileApi/Controllers/UsersController.cs
  StarterKit.WebApi.Tests/
    Controllers/
      UsersControllerTests.cs    ← mirrors src/StarterKit.WebApi/Controllers/UsersController.cs
```
