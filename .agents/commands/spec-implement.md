# spec-implement — Start Implementation from an Approved Spec

Begin implementation only after the spec has passed the required approvals.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec from the user's message, or use the active/current spec if supported.
3. Check the workflow status and confirm that requirements, design, and tasks are approved.
4. If the spec is not fully approved, stop and say which approval is still missing.
5. If the spec is approved, summarise the implementation scope and then proceed with the normal repo development workflow:
   - if the work maps to an issue tracker ticket, follow `.agents/commands/spec-tasks.md`
   - otherwise implement directly while following the approved tasks and relevant standards docs
6. Do not silently skip the approval gate.
