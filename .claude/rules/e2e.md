---
globs:
  - "e2e/**"
---

# E2E test context active

Load `docs/standards/e2e-testing.md` before writing any tests.

## Pattern reminder

- Page Object Model — one class per page, never raw selectors in test bodies
- Mock external services (Firebase, payment providers) via test fixtures
- DX quirks file: check `docs/standards/e2e-testing.md` § DevExtreme before interacting with DX grids
- CRUD pattern: Create → assert created → Update → assert updated → Delete → assert gone
- No `page.waitForTimeout()` — use proper waits (`waitForSelector`, `waitForResponse`)
