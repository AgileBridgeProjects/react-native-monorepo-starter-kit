# spec-new — Create a New Spec

Create a new spec using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Extract the feature or problem statement from the user's message.
3. Read `docs/standards/monorepo.md` and `docs/standards/architecture.md` before creating the spec.
4. Create the spec in the repo's shared `.spec-workflow/specs/` store using the MCP tools.
5. Do not write implementation code as part of this command.
6. Reply with:
   - The created spec name or identifier
   - Where it lives in `.spec-workflow/specs/`
   - The next expected step: `spec-requirements`
