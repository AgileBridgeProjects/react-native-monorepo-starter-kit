# spec-approve — Prepare for Dashboard Approval

Use this command to verify a spec phase is ready for approval and direct the user to the dashboard.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec and current phase.
3. Check the workflow status and confirm the current artifact exists.
4. Summarise what is ready to approve and note any blockers still visible.
5. Do not simulate or replace approval in chat. This repo requires approval through `npm run spec:dashboard`.
6. Reply with:
   - The spec name and current phase
   - Whether it appears ready for approval
   - Any blockers
   - A reminder to approve it in the dashboard
