# Add Secret

Use this command when asked to add a new environment variable or secret to the project.

## Instructions

Load and follow the `add-env-secret` skill:

```
.agents/skills/add-env-secret/SKILL.md
```

Gather the following before executing:

| Input | How to get it |
|---|---|
| **Variable name** | From the user (e.g. `NEXT_PUBLIC_MY_KEY`) |
| **Value** | From the user — never guess or fabricate secrets |
| **App(s)** | From the variable prefix or user: `NEXT_PUBLIC_*` → web, `EXPO_PUBLIC_*` → expo, anything else → ask |
| **Environment** | Default to `dev` unless user specifies otherwise |

If the value is not provided, ask for it before proceeding. Never run `az keyvault secret set` with a placeholder value.

After adding, confirm:
- Secret is in Key Vault with correct tags
- `.env.example` updated for the relevant app(s)
- Any additional steps from the skill noted to the user
