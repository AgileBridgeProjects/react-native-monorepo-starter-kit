# Time Zone Testing for SA-Based Developers

StarterKit targets US end users, but the dev team works from South Africa (SAST, UTC+2). This doc
covers how to reliably exercise US-timezone-dependent behavior — starting with check-ins — from
a local SA dev machine, without waiting for real time to align or working odd hours.

---

## The architecture (read this first)

Timezone-dependent backend logic is **data-driven, not host-clock-driven**. `Club.Timezone`
stores an IANA zone id (e.g. `"America/Denver"`) per club, and
[`CheckInSlotResolver`](../../apps/backend/src/StarterKit.Core/CheckIns/CheckInSlotResolver.cs)
converts UTC → that zone via `TimeZoneInfo` before mapping to a reminder slot or a local calendar
day. `TimeProvider` always returns UTC (see `TimeProviderExtensions.Now()`). This means **your
dev machine's OS timezone is irrelevant** — correctness depends only on the club's `Timezone`
field, never on where the developer is sitting.

This is good, but it is not sufficient on its own. See the next section.

## Why seeding a US timezone alone doesn't let you test all three slots

Setting the local dev club's `Timezone` to `"America/Denver"` (done for you — see
[Seed data](#seed-data-already-in-place) below) only fixes *how* UTC is converted. It does
nothing about *what* "now" is — the backend clock still reflects the real current instant.

SA is UTC+2; Denver is UTC-6 (MDT) or UTC-7 (MST). A normal SA working day (08:00–17:00 SAST)
lands at roughly 00:00–09:00 in Denver — mostly `Morning`, with `Afternoon`/`Evening` only
reachable by working odd hours or waiting for real time to pass. **Seed data alone is not
enough to test all three slots on demand.** The dev clock override below is what actually solves
that.

## Dev clock override (the actual fix)

`DevClockTimeProvider` ([`StarterKit.Core/Dev/`](../../apps/backend/src/StarterKit.Core/Dev/)) freezes
`TimeProvider.GetUtcNow()` to a value you choose, via `appsettings.json`:

```json
"DevClock": {
  "OverrideUtc": "2026-07-29T19:00:00Z"
}
```

Set `OverrideUtc` to an ISO-8601 UTC instant and every request sees that frozen "now" —
regardless of the real time in SA or anywhere else. Set it back to `null` (or delete the value)
to return to real time. It's read via `IOptionsMonitor`, which in principle hot-reloads without a
restart — but see the Docker caveat immediately below before you rely on that.

**Running via `docker-compose up` (the normal path) — restart after every edit.**
`appsettings.json` is bind-mounted into the `mobileapi`/`webapi` containers (not baked into the
image), specifically so this works without `docker-compose up --build`. In practice, though,
`IOptionsMonitor`'s file-watcher does **not** reliably fire on a bind-mounted file under Docker
Desktop — confirmed by testing: editing `OverrideUtc` from a Morning to an Afternoon value with
the container left running had **no effect** on `GET /api/check-ins/status` at all (it kept
returning the Morning-derived result), and only changed the instant the container was restarted.
Treat a restart as required, not a fallback:

```bash
docker restart starterkit-mobileapi   # ~2-3s, no rebuild — just re-reads appsettings.json from disk
```

(`docker compose restart mobileapi` also works if you're in `apps/backend/` with the full merged
stack — e.g. via `npm run dev:backend` — resolvable as one compose project; if compose commands
fail with an "undefined service" error because you're only referencing `apps/backend/docker-compose.yml`
in isolation, `docker restart <container-name>` always works regardless of which compose files are
involved.)

### Worked example — walking through all three check-in slots

The seeded dev club is `America/Denver`. In July, Denver is on MDT (UTC-6). Reminder slots default
to Morning 05:00–11:59, Afternoon 12:00–16:59, Evening 17:00–21:59 (local) —
[`CheckInReminderSlotOptions`](../../apps/backend/src/StarterKit.Core/CheckIns/Options/CheckInReminderSlotOptions.cs).
Pick a Denver-local time you want to test, add 6 hours to get UTC, and set `OverrideUtc`:

| Want to test | Denver local time | `OverrideUtc` |
|---|---|---|
| Morning | 08:00 | `"2026-07-29T14:00:00Z"` |
| Afternoon | 13:00 | `"2026-07-29T19:00:00Z"` |
| Evening | 19:00 | `"2026-07-30T01:00:00Z"` (note: rolls to the next UTC day) |

Change the value, hit `GET /api/check-ins/status` (or run through the check-in flow in the app
pointed at your local backend), see the expected slot, then move to the next row — no waiting,
no odd hours. Remember Denver is UTC-7 (MST) outside DST (roughly Nov–Mar) — adjust by 7 hours
instead of 6 in that window.

**Heads up:** while `OverrideUtc` is set, the clock is frozen for *everything* using
`TimeProvider` in that process, not just check-ins — audit timestamps, `LastActiveAt`, session
heartbeats, etc. will all read the same frozen instant. This is expected and fine for a local
debug session; just remember to clear it when you're done so unrelated local testing isn't
confused by a stuck clock.

### Safety — this cannot affect anything deployed

`DevClockTimeProvider` is only ever registered when
[`DevClockGate.IsLocalDevelopment`](../../apps/backend/src/StarterKit.Core/Dev/DevClockGate.cs)
returns true, which requires **both**:

1. `ASPNETCORE_ENVIRONMENT=Development` (excludes Testing/Staging/Production), **and**
2. no `WEBSITE_SITE_NAME` environment variable — Azure App Service always sets this for every
   deployed slot, regardless of its configured environment name. This is defense-in-depth: even
   if a deployed "dev" Azure slot were ever misconfigured with
   `ASPNETCORE_ENVIRONMENT=Development`, it still cannot freeze time for every user hitting that
   shared, deployed instance.

Outside those conditions (Testing, Staging, Production, or any Azure-hosted slot), the real
`TimeProvider.System` is registered and `DevClock` config is never read at all. `appsettings.json`
ships `"OverrideUtc": null` by default, so even on a local Development run, nothing freezes unless
you explicitly set a value.

### Seed data (already in place)

[`DevAdminSeeder.cs`](../../apps/backend/src/StarterKit.Migrator/Seeders/DevAdminSeeder.cs) seeds the
local dev club (`StarterKit`, Denver/CO) with `Timezone = "America/Denver"`. If your local database
was seeded **before** this change, backfill it once:

```sql
UPDATE "Clubs" SET "Timezone" = 'America/Denver'
WHERE "Id" = '00000000-0000-0000-0000-000000000010';
```

### Automated tests

For unit/integration tests, don't touch the dev clock at all — use a hand-rolled fake
`TimeProvider` with an explicit US IANA id, the pattern already established in
[`CheckInSlotResolverTests.cs`](../../apps/backend/tests/StarterKit.Core.Tests/CheckIns/CheckInSlotResolverTests.cs)
and `CheckInServiceTests.cs` (`America/New_York`, frozen `DateTime` + `FakeTimeProvider`). This is
deterministic and doesn't depend on any of the above.

---

## Mobile (Expo)

The check-in gating flow (`useCheckInStatus` → `GET /check-ins/status`) has **no client-side
timezone logic** — it's a pure server response, so the device/simulator timezone doesn't affect
correctness at all. You only need to touch the device clock if you want to verify how *displayed*
timestamps read to a US end user (`format-date.ts`, `formatters.ts`), which do use the device's
`Intl`/locale:

- **iOS Simulator**: Settings app → General → Date & Time → turn off "Set Automatically" → pick a
  US region (e.g. New York). The simulator is a full iOS environment, so this works the same as
  on a real device.
- **Android Emulator**: Settings app → System → Date & time → turn off "Use network-provided time
  zone" → pick a US region.

---

## Identified time-zone-dependent features (as of the identity split)

`Club.Timezone` currently has exactly one consumer: **check-ins**
(`CheckInSlotResolver.ResolveCurrentSlot` / `ResolveLocalDayBoundsUtc`, used by
`CheckInService.SubmitAsync` / `GetStatusAsync`). No other backend feature reads it yet. When a
new feature starts depending on club-local time, add it to this list and confirm it can be
exercised via the dev clock override above.
