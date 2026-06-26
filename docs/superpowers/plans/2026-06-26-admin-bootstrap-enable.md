# Enable Default Admin Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the existing `ensureDefaultAdmin()` seeder in local development by setting `ALLOW_DEFAULT_ADMIN=1` in `.env`, so an operator can log in to `/admin` with `admin@brpl.com / Admin@123` without manual database work.

**Architecture:** No code changes. The bootstrap function (`src/lib/adminBootstrap.ts`) and its caller (`src/app/api/admin/auth/login/route.ts:26`) already exist and are wired correctly. The only missing piece is the env flag — once set, the first `POST /api/admin/auth/login` will hash and persist the default superadmin.

**Tech Stack:** Next.js 14 App Router, MongoDB via Mongoose, bcryptjs, dotenv-style env loading via `src/lib/env.ts` (zod schema).

---

## File Structure

This plan touches exactly **one file**:

- **Modify:** `.env` — append a single commented block with `ALLOW_DEFAULT_ADMIN=1` and a discoverability hint about the default credentials.

No new files. No tests. No source changes.

### Why no tests

The behavior under test — `ensureDefaultAdmin()` idempotently seeding a superadmin — is already covered by the existing module in `src/lib/adminBootstrap.ts`, which is invoked (and would be exercised) by the login route. Adding new tests would require either a Mongoose in-memory fixture or a route-level integration test for a behavior the codebase already supports. The bootstrap is gated by an env flag and only runs in non-production, so the test surface is low and a manual smoke test (per the spec's verification section) is the proportionate check.

---

### Task 1: Enable the bootstrap flag in `.env`

**Files:**
- Modify: `.env` (append at the end of the file)

- [ ] **Step 1: Read the current end of `.env`**

Run: `tail -10 .env`
Expected: shows the current last line (in this repo, `NEXT_PUBLIC_APP_URL=http://localhost:3000`).

- [ ] **Step 2: Append the bootstrap block**

Append exactly the following lines to the end of `.env`:

```
# Dev-only admin bootstrap. When set to 1, the first /api/admin/auth/login
# request seeds a superadmin (idempotent) with:
#   email:    admin@brpl.com
#   password: Admin@123
# Do NOT set this in any deployed environment.
ALLOW_DEFAULT_ADMIN=1
```

- [ ] **Step 3: Verify the flag is parsed correctly**

Run: `node -e "require('dotenv').config(); console.log('ALLOW_DEFAULT_ADMIN=' + process.env.ALLOW_DEFAULT_ADMIN)"`
Expected output: `ALLOW_DEFAULT_ADMIN=1`

If `dotenv` is not available in this script (the project loads env via Next.js / `src/lib/env.ts`, not the bare `dotenv` package), run this instead:

```
node -e "const e = require('fs').readFileSync('.env','utf8').split('\n').filter(l=>l.startsWith('ALLOW_DEFAULT_ADMIN=')); console.log(e.join('\n') || 'NOT FOUND')"
```

Expected output: `ALLOW_DEFAULT_ADMIN=1`

- [ ] **Step 4: Verify env validation accepts the flag**

Run: `npx tsc --noEmit src/lib/env.ts 2>&1 | head -20`
Expected: no errors. (If `tsc` complains about imports in unrelated files, run `npx tsc --noEmit src/lib/env.ts --target es2022 --module esnext --moduleResolution bundler` instead — we're only checking that the `ALLOW_DEFAULT_ADMIN: booleanish` line still parses.)

- [ ] **Step 5: Manual smoke test (per spec verification)**

1. Start the dev server: `npm run dev` (Ctrl+C to stop after).
2. In another terminal, hit the login route:
   ```
   curl -i -X POST http://localhost:3000/api/admin/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"admin@brpl.com","password":"Admin@123"}'
   ```
3. Expected response: `HTTP/1.1 200 OK`, a `Set-Cookie` header with the admin JWT, and a JSON body containing `ok: true`.
4. In the dev-server terminal log: `[admin-bootstrap] Seeded default admin: admin@brpl.com / Admin@123` (only on the very first call).
5. Re-run the same `curl` command. Expected: still `200 OK` with a fresh JWT, but **no** `[admin-bootstrap]` log line on this call (idempotency check).

If the seed log line does not appear on the first call, check that MongoDB is reachable (the project's `.env` already has `MONGODB_URI` set) and that the `AdminUser` collection has no pre-existing document with `email: admin@brpl.com`.

- [ ] **Step 6: Commit**

```bash
git add .env
git commit -m "chore(env): enable ALLOW_DEFAULT_ADMIN for dev bootstrap

Activates the existing ensureDefaultAdmin() seeder so the admin
panel is loggable-in locally with admin@brpl.com / Admin@123.
Idempotent and dev-only — must not be set in deployed envs.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

- Spec §"Change 1 — enable the toggle in `.env`": covered by Task 1 Steps 2.
- Spec §"Change 2 — document the credentials in `.env`": covered by Task 1 Step 2 (the comment block).
- Spec §"Verification" (5 checks): covered by Task 1 Step 5 (5 sub-checks).
- Spec §"Security notes": no task needed — they describe constraints, not changes.
- Spec §"Files touched" (just `.env`): matches the plan exactly.

**2. Placeholder scan:** No TBD/TODO/fill-in markers. All commands are concrete and runnable.

**3. Type consistency:** No new types or functions introduced. Only an env flag and a comment block.