# Enable Default Admin Bootstrap

**Date:** 2026-06-26
**Status:** Approved
**Scope:** Single environment toggle. No new code, no new scripts, no schema changes.

## Problem

The admin panel has no usable credentials in the local development environment. New contributors (and the operator) can't sign in to `/admin` until a superadmin exists in the `AdminUser` collection.

The codebase already ships a complete solution: `ensureDefaultAdmin()` in [`src/lib/adminBootstrap.ts`](../../src/lib/adminBootstrap.ts) is idempotent and seeds `admin@brpl.com / Admin@123` as `superadmin`. It is called once on the first hit to [`/api/admin/auth/login`](../../src/app/api/admin/auth/login/route.ts) and only runs when `ALLOW_DEFAULT_ADMIN=1`. The env schema already accepts this flag ([`src/lib/env.ts:57`](../../src/lib/env.ts)).

The bootstrap is currently dormant because `ALLOW_DEFAULT_ADMIN` is unset in `.env`. This design turns it on.

## Goals

- A developer can run `npm run dev` and log in to `/admin` with `admin@brpl.com / Admin@123` without manual database work.
- The default credentials are discoverable from the repo (no tribal knowledge).
- The dev toggle stays out of any deployed environment.

## Non-goals

- New CLI scripts, role expansion, custom credentials flow, or production seeding.
- Touching the bootstrap code or the login route.
- Refactoring the admin auth system.

## Design

### Change 1 — enable the toggle in `.env`

Add a single line to [.env](../../.env):

```
ALLOW_DEFAULT_ADMIN=1
```

This activates the existing `ensureDefaultAdmin()` no-op gate. The first `POST /api/admin/auth/login` will create the superadmin and log:

```
[admin-bootstrap] Seeded default admin: admin@brpl.com / Admin@123
```

Subsequent calls find the existing admin and proceed normally. The function is idempotent — leaving the flag on across restarts is safe.

### Change 2 — document the credentials in `.env`

Add an inline comment immediately below the toggle so the next contributor doesn't have to read [`src/lib/adminBootstrap.ts`](../../src/lib/adminBootstrap.ts) to find the credentials:

```
# Dev-only bootstrap. When set to 1, the first admin login seeds:
#   admin@brpl.com / Admin@123   (role: superadmin)
# Do NOT set this in any deployed environment.
ALLOW_DEFAULT_ADMIN=1
```

### Why not a CLI script or role expansion

The existing bootstrap is the right shape for this request:

- **No new code surface.** A script duplicates what `ensureDefaultAdmin()` already does idempotently on first login.
- **No new attack surface.** Adding more roles/seeds increases the surface area of "what gets created" for what is otherwise a one-time dev convenience.
- **Matches the existing pattern.** The project already treats `ALLOW_DEFAULT_ADMIN` as the canonical "seed an admin for me" toggle (per the README and the env schema).

## Security notes

- The default password is intentionally trivial. It exists only because `ALLOW_DEFAULT_ADMIN=1` gates it; without that flag the bootstrap is a no-op.
- `.env` is in `.gitignore`, so the local toggle will not leak via git. Production deploys must not set this flag.
- The bootstrap logs the credentials to stdout in non-production only ([`src/lib/adminBootstrap.ts:36-39`](../../src/lib/adminBootstrap.ts)).

## Verification

After the change:

1. `npm run dev`
2. `curl -X POST http://localhost:3000/api/admin/auth/login -H 'content-type: application/json' -d '{"email":"admin@brpl.com","password":"Admin@123"}'`
3. Expect HTTP 200 with a JWT cookie set.
4. In the server log: `[admin-bootstrap] Seeded default admin: admin@brpl.com / Admin@123` on the first call only.
5. Re-running the same `curl` should NOT log the seed line again (idempotency check).
6. Visit `/admin` in the browser; you should land authenticated.

## Files touched

- [.env](../../.env) — two lines added (comment + flag).

No other files change.