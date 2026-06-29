# Brpl Frontend

Brpl — a Next.js 14 App Router project for cricket-league management. Players register via phone OTP + Razorpay payment; admins manage content, users, payments, and media through a full CMS.

## Architecture

```
src/
  app/            Next.js App Router (pages + API routes)
  components/     UI components (shadcn/ui design system)
  hooks/          React hooks
  lib/
    api/          Response helpers, error classes, HTTP client, CSRF, rate limit, handler wrappers
    auth/         JWT crypto, cookies, session, RBAC, middleware guards
    domain/       Business logic (auth service, payment service)
    infra/db/     Repository interfaces + Mongoose impls + in-memory fakes
    env.ts        Centralised env validation (zod)
    logger.ts     Structured logging
    password-policy.ts, security-headers.ts, ...  Other utilities
  models/         Mongoose schemas
  middleware.ts   Edge-runtime auth (login redirect, protected routes)
```

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Environment variables**

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | HS256 signing key (≥ 32 chars) |
| `RAZORPAY_KEY_ID` | In prod | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | In prod | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | In prod | Webhook HMAC secret |
| `SMS_API_KEY` | For OTP | SMSIndiaHub API key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | For payments | Client-side Razorpay key |
| `ALLOW_DEFAULT_ADMIN` | Dev only | Set `1` to seed default admin |

3. **Run**

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (strict TS) |
| `npm run test` | Run unit tests (vitest) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (lib + api + tests) |
| `npm run format:check` | Check formatting (CI) |

## Testing

The project uses **vitest**. Tests are colocated in `tests/` mirroring `src/`:

```
tests/
  lib/           Unit tests for lib/*
  api/           Integration tests for API routes
  lib/domain/    Business-logic tests with in-memory repositories
```

Run all tests: `npm run test`

Run a single file: `npx vitest run tests/lib/env.test.ts`

## Key patterns (post-refactor)

- **Route handlers** compose wrappers: `withRequest(withAuth({ lookup })(handler))`.
- **Business logic** lives in `@/lib/domain/` and depends on repository interfaces.
- **Database access** goes through `@/lib/infra/db/repos.ts` interfaces (Mongoose or in-memory).
- **Environment** is validated once at boot in `@/lib/env.ts` (zod schema).
- **Errors** are thrown as typed AppErrors and caught by `withRequest` for a consistent JSON envelope.
- **Rate limiting** is per-instance token bucket (Redis-backed in multi-instance deployments).
- **CSRF** is available via `Brpl_CSRF_REQUIRED=true` (double-submit cookie).

## CI

The `.github/workflows/ci.yml` workflow runs `format:check` → `lint` → `build` → `test` on every PR. Pre-commit hooks (Husky + lint-staged) format staged files.

## Production secrets

All env vars in `.env` MUST be set in Vercel Project Settings → Environment Variables. Do not commit `.env` to git; move it to `.env.local` (already gitignored).