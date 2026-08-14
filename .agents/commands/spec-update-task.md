# spec-update-task — Update a Spec Task

Update the status or details of a task in the spec workflow using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec, task, and desired update from the user's message.
3. Apply the task update in the workflow store.
4. Reply with:
   - The spec name
   - The task that was updated
   - The new status or details
