# AI Prompt System — The Law

This file governs all code in `StarterKit.Core/AI/Prompts/`. Follow these rules when adding a
new prompt builder, payload, resource type, or content extractor.

## Adding a new prompt builder

Every job type gets exactly one `IPromptBuilder<TPayload>` implementation in `Builders/`.

**Checklist:**

1. Create `{JobType}Payload` in `Payloads/` — inherit `ResourceAwarePayload` if the job needs resources
2. Create `{JobType}PromptBuilder` in `Builders/` implementing `IPromptBuilder<{JobType}Payload>`
3. Declare `Role`, `Rules`, and `Schema` as `private const`/`private static readonly` — never inline strings in `Build()`
4. Call only `PromptComposer.BuildSystemPrompt` and `PromptComposer.BuildUserMessage` — never build raw prompt strings manually
   > **Note:** `PromptComposer.SharedContext` already instructs the model to return raw JSON only and never wrap responses in markdown code fences. Do not duplicate this instruction in task-specific `Rules` constants.
5. Use `cleanContent` from the extractor in `FormatResources` — never pass `resource.Content` directly
6. Add a unit test in `StarterKit.Core.Tests/AI/Prompts/Builders/`

```csharp
// VIOLATION: raw string building inside Build()
public AiRequest Build(MyPayload payload)
{
    var prompt = $"You are a... Generate {payload.Count}..."; // ← belongs in Role/Rules constants
    ...
}

// VIOLATION: payload not using record
public class MyPayload { ... } // ← must be a sealed record

// CORRECT
public sealed class MyPromptBuilder : IPromptBuilder<MyPayload>
{
    private const string Role = "You are an expert...";

    private const string Rules = """
        - Rule one
        - Rule two
        """;

    private static readonly IOutputSchema Schema = OutputSchemaBuilder.WithTemplate("""
        { "result": "..." }
        """);

    public AiRequest Build(MyPayload payload)
    {
        var userMessage = PromptComposer.BuildUserMessage(
            taskInstruction: $"Do the thing with {payload.Count} items.",
            resources: payload.Resources,
            shouldDiscoverWebResources: payload.ShouldDiscoverWebResources,
            discoveryQuery: payload.DiscoveryQuery
        );

        return new AiRequest
        {
            SystemPrompt = PromptComposer.BuildSystemPrompt(Role, Rules, Schema),
            UserMessage = userMessage,
            Temperature = 0.7f,
        };
    }
}
```

## Payload conventions

| Rule | Detail |
|---|---|
| Always a `sealed record` | Immutable, value-equality by default |
| Extend `ResourceAwarePayload` | If the job consumes user-supplied resources |
| Required fields use `required` | Optional fields are nullable (`string?`, `int?`) |
| XML doc on every property | Describe the field's purpose and constraints |

```csharp
// VIOLATION: class instead of record, missing required keyword
public class QuizPayload : ResourceAwarePayload
{
    public int QuestionCount { get; set; } // ← mutable setter
}

// CORRECT
public sealed record QuizPayload : ResourceAwarePayload
{
    /// <summary>How many questions to generate.</summary>
    public required int QuestionCount { get; init; }

    /// <summary>Optional difficulty level (e.g. "Easy", "Medium", "Hard").</summary>
    public string? Difficulty { get; init; }
}
```

## Resource content extractors

Every `AiResourceType` value must have a corresponding `IResourceContentExtractor` registered
in `ResourceContentExtractorFactory`. The factory falls back to `OtherResourceContentExtractor`
for unknown types.

**Rules:**

- Extractors live in `Resources/Extractors/` and are `internal sealed partial class`
- Each extractor must implement `IResourceContentExtractor` (instance method `Extract`, not static)
- Extractors return **only clean text** — no HTML tags, no markdown syntax, no PDF metadata, no page numbers
- Normalize line endings to `\n` at the start of extraction — never rely on `\r\n` in regex patterns
- Use `[GeneratedRegex]` source-generated regexes — never `new Regex(...)` at call site
- A new `AiResourceType` value requires: a new extractor class + registration in the factory + tests

```csharp
// VIOLATION: static Extract method (won't satisfy IResourceContentExtractor)
private static string Extract(string rawContent) { ... }

// VIOLATION: \r\n not handled before applying blank-line regex
content = BlankLinesRegex().Replace(content, "\n\n"); // ← normalize first

// VIOLATION: new Regex at call site
var clean = Regex.Replace(content, @"<[^>]+>", ""); // ← use [GeneratedRegex]

// CORRECT
internal sealed partial class WebResourceContentExtractor : IResourceContentExtractor
{
    public AiResourceType ResourceType => AiResourceType.Web;

    public string Extract(string rawContent)
    {
        var content = rawContent.Replace("\r\n", "\n").Replace("\r", "\n");
        content = ScriptStyleRegex().Replace(content, string.Empty);
        content = HtmlTagRegex().Replace(content, " ");
        content = ExcessiveWhitespaceRegex().Replace(content, " ");
        return content.Trim();
    }

    [GeneratedRegex(@"<(script|style)[\s\S]*?</\1>", RegexOptions.IgnoreCase)]
    private static partial Regex ScriptStyleRegex();
    ...
}
```

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Prompt builders | `PascalCase` + `PromptBuilder` suffix | `QuizPromptBuilder` |
| Payloads | `PascalCase` + `Payload` suffix | `QuizPayload` |
| Extractors | `PascalCase` + `ResourceContentExtractor` suffix | `WebResourceContentExtractor` |
| Builder test classes | mirrors builder + `Tests` suffix | `QuizPromptBuilderTests` |

## What triggers a test requirement

- New `IPromptBuilder<T>` added → unit test in `Core.Tests/AI/Prompts/Builders/`
- New `IResourceContentExtractor` added → unit tests covering: happy path, empty input, edge cases for that type (e.g. Windows newlines for text/PDF, image + link interaction for markdown)
- New `AiResourceType` value → extractor tests + factory resolution test
- Modified `PromptComposer` method → update affected builder tests
