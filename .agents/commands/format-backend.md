# Format Backend (CSharpier)

Run CSharpier on all C# files in `apps/backend/` so they pass the pre-commit lint-staged hook.
Also ensures the backend is running — the Husky pre-commit hook requires it to regenerate the
OpenAPI proxy whenever `.cs` files are staged.

## Instructions

### Step 1 — Check if the backend is running

```bash
curl -s --max-time 2 http://localhost:5001/healthz
```

- If it responds → backend is up, proceed to Step 2.
- If it does not respond → start the backend in the background:

```bash
cd apps/backend && docker-compose up --build -d
```

Then wait a few seconds and poll until `http://localhost:5001/healthz` returns a response before continuing. Let the user know you started it.

> If Docker is not available or the user prefers to run without Docker:
> ```bash
> cd apps/backend && dotnet run --project src/StarterKit.MobileApi &
> ```

### Step 2 — Format all C# files with CSharpier

```bash
cd apps/backend && dotnet csharpier .
```

Report how many files were formatted (CSharpier prints a summary line like `Formatted N files in Xms`).

If CSharpier exits with an error because it is not installed:

```bash
dotnet tool install csharpier --global
```

Then re-run the format command.

### Step 3 — Confirm

Tell the user the backend status and how many files were formatted.

Remind them that CSharpier is enforced at three points:
- **Build time** — `CSharpier.MsBuild` in `Directory.Build.props` fails `dotnet build` on unformatted files
- **Commit time** — Husky `pre-commit` → `lint-staged` formats staged `.cs` files
- **Commit time (proxy)** — the same pre-commit hook requires the backend to be running so it can regenerate the OpenAPI schema and proxy if any `.cs` files are staged
