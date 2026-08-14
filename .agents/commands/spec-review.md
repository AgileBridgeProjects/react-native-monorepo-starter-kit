# spec-review — Review Current Spec Phase

Review a spec phase before approval using the `spec-workflow` MCP tools.

## Instructions

1. If the `spec-workflow` MCP tools are unavailable, stop and say that this repo workflow is blocked because the MCP server is not configured.
2. Resolve the target spec and current phase from the user's message or the workflow state.
3. Read the phase artifact plus the minimum relevant standards docs for the area it touches.
4. Review with a code-review mindset:
   - missing acceptance criteria
   - unclear ownership or boundaries
   - unhandled edge cases
   - testing gaps
   - contradictions with repo standards
5. Present findings first, ordered by severity.
6. Do not approve on the user's behalf. Approvals must still happen in the spec dashboard.
7. Reply with:
   - Findings, if any
   - Open questions or assumptions
   - Whether the phase looks ready for dashboard approval
