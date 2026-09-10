# Entity Relationship Diagram

> **Template.** Replace the diagram below with your own entities. Keep the file: three
> instruction files route database work here, and `npm run check:standards` requires it.

The single source of truth for the database schema. Read it before any work that touches
data models, migrations or relationships, and **update it in the same PR** whenever a
migration adds, removes or renames a table or column. A stale ERD is worse than no ERD:
it is read as current.

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : has
    ORGANISATION ||--o{ MEMBERSHIP : has
    ROLE ||--o{ MEMBERSHIP : grants

    USER {
        uuid id PK
        string email UK
        string display_name
        timestamptz created_at
        timestamptz updated_at
        boolean is_deleted
    }

    ORGANISATION {
        uuid id PK
        string name
        timestamptz created_at
        timestamptz updated_at
        boolean is_deleted
    }

    ROLE {
        uuid id PK
        string name UK
    }

    MEMBERSHIP {
        uuid id PK
        uuid user_id FK
        uuid organisation_id FK
        uuid role_id FK
        timestamptz created_at
    }
```

## Conventions these entities follow

Every table carries the audit and soft-delete columns the backend standards require
(`docs/standards/backend/auditing.md`). Tenant-scoped tables carry the organisation
foreign key that the global query filter reads
(`docs/standards/backend/multitenancy.md`).
