# spec-tasks — Generate Implementation Tasks

Generate or update the tasks phase for a spec using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec from the user's message, or use the active/current spec if supported.
3. Verify the design phase exists and is ready for task breakdown.
4. Convert the approved design into ordered implementation tasks that are small enough to execute and verify.
5. Each task should make ownership and verification obvious:
   - concrete files or modules likely affected
   - required tests
   - sequencing or dependency notes
6. Do not implement code in this command.
7. Reply with:
   - The spec name
   - That tasks were created or updated
   - Any sequencing risks
   - The next expected step: dashboard approval, then `spec-implement`
