# Backend Patterns — The Law

Load this file when: implementing the Options pattern, writing object-to-object mappers (Mapperly), adding service validation, working with AI providers, or using Azure Blob Storage.

---

## Options Pattern (Mandatory for All Configuration)

Every setting **must** live in `appsettings.json` and be accessed via the Options pattern. Never use C# property defaults as a substitute for appsettings values, and never read `IConfiguration` directly in services or extension methods.

**Rules:**

- All config values (including defaults like model name, timeouts, token limits) go in `appsettings.json` — not as C# property defaults
- Create a `sealed class` named `{Section}Options` in `StarterKit.Core/<Module>/Options/`
  - **Exception:** cross-cutting options (e.g. `KeyVaultOptions`, `RetryOptions`) live in `StarterKit.Core/Configuration/`. Options belonging exclusively to the data layer (e.g. `SqlResilienceOptions`) live in `StarterKit.Data/Options/`
- Add a `public const string SectionName = "<Section>"` property
- Annotate all properties with `[Required(AllowEmptyStrings = false)]` (strings) or `[Range(...)]` (numerics) — no silent fallbacks
- Register with `.AddOptions<T>().BindConfiguration(T.SectionName).ValidateDataAnnotations().ValidateOnStart()`
- Inject `IOptions<T>` (or `IOptionsMonitor<T>` for hot-reload) — never `IConfiguration`
- Extension methods that register services take no `IConfiguration` parameter — options bind internally

```csharp
// VIOLATION: C# default used instead of appsettings value
public string Model { get; init; } = "claude-haiku-4-5"; // ← put this in appsettings.json

// VIOLATION: reading IConfiguration directly
public class MyService(IConfiguration config)
{
    var key = config["MySection:MyKey"]; // ← use IOptions<MyOptions> instead
}

// CORRECT: all values declared in appsettings.json, no C# defaults
// appsettings.json:
// "Anthropic": { "ApiKey": "#", "Model": "claude-haiku-4-5", "MaxTokens": 8192 }

public sealed class AnthropicOptions
{
    public const string SectionName = "Anthropic";

    [Required(AllowEmptyStrings = false)]
    public required string ApiKey { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string Model { get; init; }

    [Range(1, 100_000)]
    public int MaxTokens { get; init; }
}

// CORRECT: registration (no IConfiguration parameter)
public static IServiceCollection AddAiServices(this IServiceCollection services)
{
    services
        .AddOptions<AnthropicOptions>()
        .BindConfiguration(AnthropicOptions.SectionName)
        .ValidateDataAnnotations()
        .ValidateOnStart();
    ...
}

// CORRECT: consumption
public class AnthropicProvider(IOptions<AnthropicOptions> options)
{
    private readonly AnthropicOptions _options = options.Value;
}
```

---

## Mapperly — Object-to-Object Mapping

Use **Mapperly** (`Riok.Mapperly`) for all object-to-object mapping — never write ad-hoc `private static MapToDto()` methods or inline object initialisers that copy properties manually.

**Rules:**

- Mapper classes live in a `Mappers/` folder within the module (e.g. `StarterKit.Core/AI/Mappers/`, `StarterKit.MobileApi/AI/Mappers/`)
- Mapper classes are `public static partial` and annotated with `[Mapper]`
- Mapping methods are `public static partial` extension methods (e.g. `ToDto`, `ToResponse`, `ToPayload`)
- Helper mappings used only internally are `private static partial`
- When a source property has no matching target, exclude it explicitly with `[MapperIgnoreSource]`
- Add `Riok.Mapperly` to each project that needs it — it is a compile-time source generator with no runtime dependency
- Prefer Mapperly for API request mappers as well as response mappers

**Boundary rule:** The controller layer is responsible for mapping HTTP request DTOs → Core payloads. Place those mappers in the API project's `Mappers/` folder.

**Controller/request mapper rule:** When a controller action would otherwise construct a Core request DTO inline, extract that construction into an API-layer mapper extension method (e.g. `request.ToQuizRequest(...)`).

**Result mapper rule:** When an application service can return multiple successful outcomes (e.g. `202 Accepted` vs `200 OK`), represent that in a Core result DTO and map it to HTTP in an API-layer result mapper.

```csharp
// VIOLATION: ad-hoc private mapping method in a service
private static AiJobDto MapToDto(AiJob job) =>
    new() { Id = job.Id, Status = job.Status, Result = job.Result };

// VIOLATION: inline object initialiser in a controller
return Ok(new AiJobResponse { Id = job.Id, Status = job.Status });

// CORRECT: Mapperly mapper in StarterKit.Core/AI/Mappers/AiJobMapper.cs
[Mapper]
public static partial class AiJobMapper
{
    public static partial AiJobDto ToDto(this AiJob job);
}

// CORRECT: Mapperly mapper in StarterKit.MobileApi/AI/Mappers/AiJobsMapper.cs
[Mapper]
public static partial class AiJobsMapper
{
    public static partial AiJobResponse ToResponse(this AiJobDto dto);

    [MapperIgnoreSource(nameof(GenerateQuizRequestDto.AiConfigModelId))]
    public static partial QuizPayload ToPayload(this GenerateQuizRequestDto dto);

    private static partial AiResourceContext ToResourceContext(this ResourceDto dto);
}

// CORRECT: usage at call sites
return job.ToDto();
return Ok(job.ToResponse());
var payload = request.ToPayload();
```

---

## Service-Layer Input Validation

**All domain constraint guards belong in `StarterKit.Core` services, not in controllers or repositories.**

The global `ArgumentExceptionHandler` maps any uncaught `ArgumentException` to HTTP 400 (`ProblemDetails`), so throwing from a service method is all that is needed — no try/catch in the controller.

**Rules:**

- Validate empty/null inputs with `string.IsNullOrWhiteSpace` and throw `ArgumentException` with `paramName` matching `nameof(parameter)`
- Check emptiness of a collection with `.Any()` / `!collection.Any()`, not `.Count == 0` / `.Count > 0` — reads as an existence check rather than a numeric comparison
- Validate domain constraints (count caps, range limits, cross-field rules) in a **private static helper** on the service class
- For JSON-encoded definitions, parse with `JsonDocument.Parse` inside the helper and catch `JsonException` — malformed JSON is caught by the deserialiser downstream; skip domain guards in that case
- The helper should only throw on a *definitive* violation; if the property is absent, skip the check silently
- For bulk operations, apply the same guard inside the `.Select(…)` projection without a `paramName`

```csharp
// CORRECT: null/empty guard
if (string.IsNullOrWhiteSpace(definition))
    throw new ArgumentException("Definition cannot be empty.", nameof(definition));

// VIOLATION: numeric comparison for an existence check
if (relationships.Count == 0)
    throw new ArgumentException("At least one relationship must be supplied.", nameof(relationships));

// CORRECT: .Any() reads as "is it empty", not "is the count zero"
if (!relationships.Any())
    throw new ArgumentException("At least one relationship must be supplied.", nameof(relationships));

// CORRECT: domain constraint guard — delegate to a private static helper
if (questionType == QuestionType.Quiz)
    ValidateQuizOptionCount(definition, nameof(definition));

// CORRECT: private static helper
private static void ValidateQuizOptionCount(string definition, string? paramName = null)
{
    try
    {
        using var doc = JsonDocument.Parse(definition);
        if (doc.RootElement.TryGetProperty("options", out var options)
            && options.ValueKind == JsonValueKind.Array
            && options.GetArrayLength() > 4)
        {
            throw new ArgumentException(
                "A quiz question cannot have more than 4 options.",
                paramName);
        }
    }
    catch (JsonException)
    {
        // Malformed JSON is caught by the deserialiser downstream; skip option-count check.
    }
}

// CORRECT: cross-field guard
private static void ValidateSchedule(DateTime? start, DateTime? end)
{
    if (start.HasValue != end.HasValue)
        throw new ArgumentException(
            "Both dates must be provided together, or neither.",
            start.HasValue ? nameof(start) : nameof(end));
    if (start.HasValue && end.HasValue && start.Value >= end.Value)
        throw new ArgumentException("Start must be earlier than End.", nameof(start));
}

// VIOLATION: domain constraint guard in the controller
[HttpPost]
public async Task<IActionResult> CreateQuestion(CreateQuestionDto dto)
{
    if (dto.Options.Count > 4) // ← belongs in QuestionService, not here
        return BadRequest("Too many options.");
}
```

Testing validation: one `[Fact]` per guard path using `FluentAssertions`:

```csharp
await act.Should().ThrowAsync<ArgumentException>().WithParameterName("definition");
```

---

## Enum Conventions

Two storage strategies depending on the role of the enum:

### Job type enums — store as strings

Enums that identify the kind of work being done (e.g. `GameJobType`, `ContentJobType`) are stored as `varchar(50)` strings. No explicit integer values — order is irrelevant.

```csharp
// CORRECT: job type enum — no integer values, stored as string
public enum GameJobType { QuizGenerate, CrosswordGenerate, FillInTheBlanksGenerate }

// CORRECT: EF config
builder.Property(x => x.JobType).IsRequired().HasConversion<string>().HasMaxLength(50);
```

### Status / flag enums — store as integers

Enums that represent state machines or operational flags are stored as `int`. Must have **explicit integer values** to prevent subtle bugs if a value is inserted or reordered.

```csharp
// VIOLATION: implicit values — fragile if order ever changes
public enum AiJobStatus { Queued, Running, Completed, Failed }

// CORRECT: explicit values — stable in SQL
public enum AiJobStatus
{
    Queued    = 0,
    Running   = 1,
    Completed = 2,
    Failed    = 3,
    Cancelled = 4,
}

// CORRECT: EF config — no HasConversion, no HasMaxLength
builder.Property(x => x.Status).IsRequired().HasDefaultValue(AiJobStatus.Queued);
```

Never mix strategies within the same enum.

---

## AI Provider Conventions

### Adding a New Provider

Adding a new AI provider requires **zero changes** to `AiProviderFactory`. The factory discovers providers via `IEnumerable<IAiProviderCreator>` — just add a new creator and register it in `ServiceCollectionExtensions`.

**Checklist:**

1. Create the provider class in `StarterKit.Core/AI/Providers/` implementing `IAiProvider`
2. Declare `public const string Name = "<ProviderName>"` on the provider class
3. Create a `{ProviderName}ProviderCreator` in `StarterKit.Core/AI/Factories/` implementing `IAiProviderCreator`
4. Register the creator in `ServiceCollectionExtensions.AddAiServices()`:

   ```csharp
   services.AddSingleton<IAiProviderCreator, MyNewProviderCreator>();
   ```

5. Add named `HttpClient` registration if the provider uses `IHttpClientFactory`:

   ```csharp
   services.AddHttpClient(MyNewProvider.Name);
   ```

**Never add an `if`/`else if` block to `AiProviderFactory`** — it must stay open-closed:

```csharp
// VIOLATION: adding a branch per provider
if (config.Provider == "AzureOpenAI") return new AzureOpenAIProvider(...);
if (config.Provider == "OpenAI") return new OpenAIProvider(...); // ← add a creator instead
```

### Provider Logging and Error Handling

Every `IAiProvider.CompleteAsync` implementation **must**:

- Accept `ILogger<T>` via constructor injection
- Wrap the entire body in `try/catch (Exception ex)` — log then re-throw (never swallow)
- Use structured logging with the model name in the message template

```csharp
// CORRECT
public async Task<AiResponse> CompleteAsync(AiRequest request, CancellationToken ct = default)
{
    var model = request.Model ?? _options.Model;
    try
    {
        // ... call the API ...
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "MyProvider completion failed for model {Model}.", model);
        throw;
    }
}
```

### Choices / Single Completion

All providers request **one completion** (`n=1` default). Check that the choices/content list is non-empty before indexing:

```csharp
// VIOLATION: no guard
return new AiResponse { Content = parsed.Choices[0].Message.Content };

// CORRECT
if (parsed.Choices.Count == 0)
    throw new InvalidOperationException("Azure OpenAI response contained no choices.");

// n=1 (default): exactly one completion is requested, so Choices[0] is always the single result.
return new AiResponse { Content = parsed.Choices[0].Message.Content, ... };
```

### Provider Response — Strip Markdown Fences

Every provider **must** strip markdown code fences before returning `AiResponse.Content` by calling `AiResponseHelper.StripMarkdownFences` in `StarterKit.Core/AI/Helpers/`. Never copy `StripMarkdownFences` inline:

```csharp
// VIOLATION: inline copy of the helper
private static string StripMarkdownFences(string content) { ... } // ← duplicate — delete

// CORRECT
using StarterKit.Core.AI.Helpers;
return new AiResponse { Content = AiResponseHelper.StripMarkdownFences(string.Concat(textBlocks)), ... };
```

---

## AI Job Result Type

The `Result` field on `AiJobDto` (Core) and `AiJobResponse` (MobileApi) is `JsonElement?`, not `string?`. This allows the client to receive a fully typed JSON object rather than a raw string.

```csharp
// VIOLATION: Result typed as string
public string? Result { get; init; }

// CORRECT
public JsonElement? Result { get; init; }
```

The Mapperly mapper in `StarterKit.MobileApi/AI/Mappers/AiJobsMapper.cs` handles the `string? → JsonElement?` conversion via `JsonElementHelper.Parse` in `StarterKit.MobileApi/Helpers/JsonElementHelper.cs`.

---

## Azure Blob Storage Conventions

### Inject `IBlobStorageService`, Not `BlobServiceClient`

Never inject `BlobServiceClient` directly in services. Use **`IBlobStorageService`** from `StarterKit.Core.Storage.Interfaces`.

### Container Names — Always Use `BlobContainerName`

Never pass raw container name strings. All container names are defined as constants in `StarterKit.Core/Storage/BlobContainerName.cs`.

### Uploading a File

**Prefer the auto-naming overload** (`containerName` + `file`) for new uploads:

```csharp
// ✅ CORRECT — auto-named upload (preferred)
var result = await _blobStorageService.UploadAsync(
    BlobContainerName.CompanyLogos,
    file,
    cancellationToken);
// result.Id        → the generated Guid
// result.StoredPath → stable "{container}/{id}/{fileName}" path to persist in the DB

// ✅ CORRECT — explicit blob name (re-upload under an existing entity ID)
var blobName = BlobName.ForEntity(existingId, file.FileName);
var storedPath = await _blobStorageService.UploadAsync(
    BlobContainerName.Resources, blobName, file, cancellationToken);

// ❌ VIOLATION: generating Guid + BlobName outside the service
var id = Guid.NewGuid();
var blobName = BlobName.ForEntity(id, file.FileName);
await _blobStorageService.UploadAsync(container, blobName, file, ct);
// ← use the auto-naming overload instead
```

### File Upload Validation — Always Use `FileUploadValidator`

Every service method that accepts an `UploadedFile` **must** call `FileUploadValidator.Validate(...)` before uploading. Never inline size/type checks.

```csharp
// ✅ CORRECT
FileUploadValidator.Validate(file, _imageOptions.AllowedContentTypes, _imageOptions.MaxFileSizeBytes);

// ❌ VIOLATION: inline validation logic
if (file.ContentLength > 5 * 1024 * 1024)
    throw new ArgumentException("File too large.");
```

### Resolving Stored Paths to SAS URLs

```csharp
var sasUrl = await _blobStorageService.ResolveStoredPathAsync(entity.LogoPath, cancellationToken);
```

### Violations

```csharp
// VIOLATION: raw container name string
var container = blobServiceClient.GetBlobContainerClient("resources");

// VIOLATION: injecting IOptions<AzureStorageOptions> in a service to get the container name
var containerName = _options.Value.ResourcesContainerName;
// ← container names are code constants, not config values
```
