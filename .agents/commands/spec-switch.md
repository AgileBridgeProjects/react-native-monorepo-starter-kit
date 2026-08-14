# spec-switch — Switch Active Spec

Switch the workflow context to a different spec using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec from the user's message.
3. Switch the active/current spec if the workflow tools support it.
4. Reply with:
   - The spec that is now active
   - Its current phase
   - The next expected command
