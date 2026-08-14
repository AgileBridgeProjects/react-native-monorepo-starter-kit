# Migrations

EF Core migration history was removed from this reference copy — it only applies to the StarterKit database.
Generate your own initial migration once your entities exist:

```bash
dotnet ef migrations add InitialCreate --project src/YourApp.Data --startup-project src/YourApp.Migrator
```
