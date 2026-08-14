# spec-requirements — Draft Spec Requirements

Generate or update the requirements phase for a spec using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec from the user's message, or use the active/current spec if the workflow tools support that concept.
3. Read `docs/standards/monorepo.md` and `docs/standards/architecture.md` first.
4. Gather only the additional standards files that are relevant to the feature area.
5. Write requirements that are implementation-ready:
   - user goals and scope
   - acceptance criteria
   - edge cases and failure states
   - explicit out-of-scope items where needed
6. Do not generate design or tasks in this command.
7. Reply with:
   - The spec name
   - That requirements were created or updated
   - Any gaps that still need clarification
   - The next expected step: dashboard approval, then `spec-design`
