# backfill-snapshots — Backfill Daily Snapshot Tables

Populates `DailyCompanySnapshots`, `DailyPlayerSnapshots`, `DailyGameSnapshots`, and
`DailyDepartmentSnapshots` for historical dates using the same aggregation logic as the nightly
Hangfire job. Safe to re-run — uses the upsert pattern so no duplicate rows are created.

> **When to use:** To fill in snapshot data for dates that existed before the
> snapshot job was introduced, or after a long dev-DB gap.
>
> **Time:** ~1–3 seconds per day of data per company. A 1-year range with a few companies typically
> takes 5–10 minutes.

---

## Prerequisites

- Docker is running and `starterkit-webapi` container is healthy.
- The webapi is exposed on `localhost:5002`.

Verify:
```bash
curl -s http://localhost:5002/
```
Expected: `{"service":"StarterKit.WebApi","status":"ok"}`

---

## Instructions

Run each step in order.

---

### Step 0 — Read the database password from the env file

The PostgreSQL password differs per developer. Read it from `infra/supabase/.env`
(`POSTGRES_PASSWORD=...`) and substitute it for `$DB_PASSWORD` in every command below:

```bash
grep '^POSTGRES_PASSWORD=' infra/supabase/.env
```

---

### Step 1 — Find the earliest game session date

```bash
docker exec -e PGPASSWORD="$DB_PASSWORD" starterkit-postgres \
  psql -U postgres -d starterkit -t -A \
  -c "SELECT to_char(MIN(\"StartedAt\"::date), 'YYYY-MM-DD') AS earliest_date FROM \"GameSessions\" WHERE \"IsDeleted\" = false;"
```

Note the returned date (format `YYYY-MM-DD`). If the result is empty there are no sessions — stop here.

---

### Step 2 — Check how many snapshot rows already exist

```bash
docker exec -e PGPASSWORD="$DB_PASSWORD" starterkit-postgres \
  psql -U postgres -d starterkit \
  -c "SELECT 'Company' AS type, COUNT(*) AS rows FROM \"DailyCompanySnapshots\" WHERE \"IsDeleted\" = false
       UNION ALL
       SELECT 'Player', COUNT(*) FROM \"DailyPlayerSnapshots\" WHERE \"IsDeleted\" = false
       UNION ALL
       SELECT 'Game', COUNT(*) FROM \"DailyGameSnapshots\" WHERE \"IsDeleted\" = false
       UNION ALL
       SELECT 'Department', COUNT(*) FROM \"DailyDepartmentSnapshots\" WHERE \"IsDeleted\" = false;"
```

Report these counts before and after — they confirm the backfill ran.

---

### Step 3 — Backfill in 90-day chunks

Use `FROM_DATE` = earliest date from Step 1 and `TO_DATE` = yesterday.

The endpoint caps each call at 730 days. For large ranges, split into chunks. Call with a
long timeout (`--max-time 900` = 15 minutes per chunk):

```bash
curl -s --max-time 900 -X POST \
  "http://localhost:5002/api/dev/backfill-snapshots?from=FROM_DATE&to=TO_DATE" \
  -H "Content-Type: application/json"
```

Replace `FROM_DATE` and `TO_DATE` with actual dates (e.g. `2024-01-01` and `2024-12-31`).

If the range exceeds 730 days, issue multiple calls with non-overlapping ranges, each up to 730
days. Wait for each call to complete (200 OK) before starting the next.

Expected response:
```json
{ "daysBackfilled": 365, "from": "2024-01-01", "to": "2024-12-31" }
```

---

### Step 4 — Verify snapshot counts increased

Re-run the query from Step 2 and confirm the row counts are higher.

Also spot-check a specific date:

```bash
docker exec -e PGPASSWORD="$DB_PASSWORD" starterkit-postgres \
  psql -U postgres -d starterkit \
  -c "SELECT \"CompanyId\", \"Date\", \"TotalSessions\", \"TotalActivePlayers\"
       FROM \"DailyCompanySnapshots\"
       WHERE \"IsDeleted\" = false
       ORDER BY \"Date\" DESC
       LIMIT 5;"
```

---

### Step 5 — Summary

Report to the user:

| Step | Result |
|------|--------|
| Earliest session date | YYYY-MM-DD |
| Snapshot rows before | Company: N, Player: N, Game: N, Dept: N |
| Chunks called | N (each with from/to range) |
| Snapshot rows after | Company: N, Player: N, Game: N, Dept: N |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `curl: (7) Failed to connect` | WebApi container not running — `docker compose up -d` in `apps/backend/` |
| `403 Forbidden` | Container is not running in Development mode — check `ASPNETCORE_ENVIRONMENT=Development` in docker-compose |
| `400 Date range cannot exceed 730 days` | Split into smaller chunks and call sequentially |
| `curl: (28) Operation timed out` | Range too large for one call — reduce chunk size (e.g. 90 days) |
| Row counts unchanged after call | Check `docker compose logs webapi` for errors from `ReportSnapshotRefreshJob` |
