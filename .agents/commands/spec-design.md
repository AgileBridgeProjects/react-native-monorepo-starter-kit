# spec-design — Generate Technical Design

Generate or update the design phase for a spec using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec from the user's message, or use the active/current spec if supported.
3. Verify the requirements phase exists and is ready for design work.
4. Read `docs/standards/monorepo.md` and `docs/standards/architecture.md` first, then any task-specific standards files.
5. If the work spans multiple feature modules or introduces a new entity relationship, read `graphify-out/CHEAT_SHEET.md` before drafting the design.
6. Produce a design that covers:
   - affected modules and layers
   - data flow and API boundaries
   - persistence and migration implications
   - testing strategy
   - risks, constraints, and rollout notes
7. Do not create tasks or implementation code in this command.
8. Reply with:
   - The spec name
   - That design was created or updated
   - The main technical decisions
   - The next expected step: dashboard approval, then `spec-tasks`
