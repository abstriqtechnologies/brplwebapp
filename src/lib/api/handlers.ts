/**
 * Composable route-handler wrappers.
 *
 * Layered model:
 *
 *   // OUTER: Request-only entry point. Owns requestId + error catching.
 *   export const POST = withRequest(
 *     // MIDDLE: operate on the HandlerContext, add auth/csrf/rate-limit.
 *     withAuth({ lookup })(
 *       // INNER: pure business logic with all the context it needs.
 *       async ({ user, requestId }) => ok({ hello: user._id }),
 *     ),
 *   );
 *
 * Each layer receives `HandlerContext` (with optional auth/csrf extras).
 * Errors propagate up; only `withRequest` catches them.
 */

import "server-only";
import { logger, newRequestId } from "@/lib/logger";
import { fail, isAppError } from "@/lib/api/response";
import { RateLimiter, type BucketOptions } from "@/lib/api/rate-limit";
import { assertCsrf, CSRF_HEADER } from "@/lib/api/csrf";
import { ForbiddenError } from "@/lib/api/errors";
import { requireAuth, requireAdmin, requirePending, type PendingSession } from "@/lib/auth/middleware";
import { type AuthSession, type AdminSession } from "@/lib/auth/session";
import { type AdminRole } from "@/lib/auth/rbac";
import { type IUser } from "@/models/User";
import { type IAdminUser } from "@/models/AdminUser";
import { UnauthorizedError } from "@/lib/api/errors";
import { getAuthCookie, getPendingCookie } from "@/lib/auth/cookies";
import { verifyAuth, verifyPending, type AuthTokenPayload, type PendingTokenPayload } from "@/lib/auth/crypto";

// ---------- Handler context types ----------

export type HandlerContext = {
    req: Request;
    requestId: string;
};

export type AuthHandler = (
    ctx: HandlerContext & { user: IUser; session: AuthSession["session"] },
) => Promise<Response> | Response;
export type AdminHandler = (
    ctx: HandlerContext & { admin: IAdminUser; session: AdminSession["session"] },
) => Promise<Response> | Response;
export type PendingHandler = (ctx: HandlerContext & { pending: PendingSession }) => Promise<Response> | Response;

/**
 * Context for a "checkout" route — accepts either a verified-pending cookie
 * (new user, OTP-verified, not yet registered) OR an auth cookie for an
 * unpaid user (returning user who signed in but hasn't paid).
 *
 * - `phone` is always present.
 * - `userId` is set only when an auth session was used (the user already
 *   exists in the DB). Pending cookies do NOT have a user id.
 */
export type CheckoutSession = {
    phone: string;
    userId?: string;
};

export type CheckoutHandler = (ctx: HandlerContext & { session: CheckoutSession }) => Promise<Response> | Response;

/**
 * Context for /api/auth/register. Accepts:
 *   - `brpl_pending` (true new user, OTP-verified, never paid)
 *   - `brpl_auth` with `paid === false` (existing user, paying now)
 *   - `brpl_auth` with `paid === true` (webhook-first race: payment
 *     confirmation landed but the profile fields haven't been written yet)
 *
 * In all three cases the handler should write name/email/role/state/city
 * onto the existing (or freshly-created) User record. The session's `paid`
 * claim tells the handler which side of the race it's on — useful for
 * logging and for tightening the conflict guard inside registerUser.
 *
 * `phone` is always present. `userId` is set only when an auth cookie was
 * used (the user already exists in the DB).
 */
export type RegisterSession = {
    phone: string;
    userId?: string;
    paid: boolean;
};

export type RegisterHandler = (ctx: HandlerContext & { session: RegisterSession }) => Promise<Response> | Response;

// ---------- withRequest ----------

const HEADER_REQUEST_ID = "x-request-id";

/**
 * Outermost wrapper. Takes the raw `Request`, builds the `HandlerContext`,
 * and calls the inner handler. Catches AppErrors and unknown errors.
 */
export function withRequest<H extends (ctx: HandlerContext) => Promise<Response> | Response>(
    handler: H,
): (req: Request) => Promise<Response> {
    return async (req: Request) => {
        const requestId = req.headers.get(HEADER_REQUEST_ID) ?? newRequestId();

        const log = logger.child({
            requestId,
            method: req.method,
            path: new URL(req.url).pathname,
        });
        log.info("request.start");

        const ctx: HandlerContext = { req, requestId };
        const started = Date.now();
        try {
            const res = await handler(ctx);
            log.info("request.end", { status: res.status, durationMs: Date.now() - started });
            res.headers.set(HEADER_REQUEST_ID, requestId);
            return res;
        } catch (err) {
            const status = isAppError(err) ? err.status : 500;
            log.error("request.error", { status, durationMs: Date.now() - started }, err);
            const res = fail(err, requestId);
            res.headers.set(HEADER_REQUEST_ID, requestId);
            return res;
        }
    };
}

// ---------- withRateLimit ----------

/**
 * Token-bucket per IP (or "global"). Returns 429 with Retry-After when empty.
 * Reads the client IP from the optional `clientIp` getter (defaults to "global").
 */
export function withRateLimit(options: BucketOptions, rateLimiter?: RateLimiter, clientIp?: () => string) {
    const limiter = rateLimiter ?? new RateLimiter(options);
    return function wrap<H extends (ctx: HandlerContext) => Promise<Response> | Response>(handler: H) {
        return async (ctx: HandlerContext): Promise<Response> => {
            const ip = clientIp?.() ?? "global";
            if (!limiter.take(ip)) {
                const retryAfter = limiter.getRetryAfter(ip);
                throw new (await import("@/lib/api/errors")).RateLimitError(retryAfter);
            }
            return handler(ctx);
        };
    };
}

// ---------- withCsrf ----------

/**
 * Assert CSRF token. Throws ForbiddenError on mismatch (caught by withRequest).
 *
 * Optional `readCookie` parameter for tests — production omits it and the
 * helper reads the cookie from `next/headers`.
 */
export function withCsrf<H extends (ctx: HandlerContext) => Promise<Response> | Response>(
    handler: H,
    readCookie?: () => Promise<string | undefined>,
) {
    return async (ctx: HandlerContext): Promise<Response> => {
        if (readCookie) {
            // Test path.
            const cookieToken = await readCookie();
            const headerToken = ctx.req.headers.get(CSRF_HEADER);
            if (!cookieToken || !headerToken) throw new ForbiddenError("CSRF token missing");
            if (cookieToken !== headerToken) throw new ForbiddenError("CSRF token mismatch");
        } else {
            await assertCsrf(ctx.req);
        }
        return handler(ctx);
    };
}

// ---------- withAuth ----------

type UserLookup = (id: string) => Promise<IUser | null>;

export function withAuth(deps: { lookup: UserLookup; getAuthCookie?: () => Promise<string | undefined> }) {
    return function wrap<H extends AuthHandler>(handler: H) {
        return async (ctx: HandlerContext): Promise<Response> => {
            const session = await requireAuth({
                ...(deps.getAuthCookie ? { getAuthCookie: deps.getAuthCookie } : {}),
                lookup: deps.lookup as unknown as (
                    id: string,
                ) => Promise<{ _id: string; phone: string; [k: string]: unknown } | null>,
            });
            return handler({ ...ctx, user: session.user as unknown as IUser, session: session.session });
        };
    };
}

// ---------- withAdmin ----------

type AdminLookup = (id: string) => Promise<IAdminUser | null>;

export function withAdmin(deps: {
    lookup: AdminLookup;
    allowedRoles?: AdminRole[];
    getAdminCookie?: () => Promise<string | undefined>;
}) {
    return function wrap<H extends AdminHandler>(handler: H) {
        return async (ctx: HandlerContext): Promise<Response> => {
            const session = await requireAdmin({
                ...deps,
                lookup: deps.lookup as unknown as (id: string) => Promise<{
                    _id: string;
                    email: string;
                    role: string;
                    active: boolean;
                    [k: string]: unknown;
                } | null>,
            });
            return handler({ ...ctx, admin: session.admin as unknown as IAdminUser, session: session.session });
        };
    };
}

// ---------- withPending ----------

export function withPending<H extends PendingHandler>(handler: H) {
    return async (ctx: HandlerContext): Promise<Response> => {
        const pending = await requirePending();
        return handler({ ...ctx, pending });
    };
}

// ---------- withCheckoutSession ----------

/**
 * Accept either:
 *   - `brpl_auth` with `paid === false` (returning unpaid user), OR
 *   - `brpl_pending` (new user, OTP-verified, registration not complete).
 *
 * Anything else (no cookie, expired, tampered, auth+paid) → 401.
 *
 * The handler receives a unified `session: { phone, userId? }`. `userId` is
 * only present when the auth cookie matched — pending cookies don't have one.
 *
 * Optional `readCookies` parameter for tests — production omits it and the
 * helper reads cookies from `next/headers`.
 */
export function withCheckoutSession<H extends CheckoutHandler>(
    handler: H,
    readCookies?: () => Promise<{ auth?: string; pending?: string }>,
) {
    return async (ctx: HandlerContext): Promise<Response> => {
        let authToken: string | undefined;
        let pendingToken: string | undefined;

        if (readCookies) {
            const got = await readCookies();
            authToken = got.auth;
            pendingToken = got.pending;
        } else {
            [authToken, pendingToken] = await Promise.all([getAuthCookie(), getPendingCookie()]);
        }

        // 1. Prefer auth+unpaid (returning user with DB record).
        if (authToken) {
            const payload: AuthTokenPayload | null = await verifyAuth(authToken);
            if (payload && payload.paid === false && payload.sub && payload.phone) {
                return handler({
                    ...ctx,
                    session: { phone: payload.phone, userId: payload.sub },
                });
            }
        }

        // 2. Fall back to pending (new user, OTP-verified, not registered yet).
        if (pendingToken) {
            const payload: PendingTokenPayload | null = await verifyPending(pendingToken);
            if (payload?.phone) {
                return handler({
                    ...ctx,
                    session: { phone: payload.phone },
                });
            }
        }

        throw new UnauthorizedError("Checkout session required");
    };
}

// ---------- withRegisterSession ----------

/**
 * Accept any of:
 *   - `brpl_pending` (new user, OTP-verified)
 *   - `brpl_auth` paid:false (returning unpaid user)
 *   - `brpl_auth` paid:true (webhook-first race: cookie upgraded before
 *     profile fields were written)
 *
 * Anything else → 401.
 */
export function withRegisterSession<H extends RegisterHandler>(
    handler: H,
    readCookies?: () => Promise<{ auth?: string; pending?: string }>,
) {
    return async (ctx: HandlerContext): Promise<Response> => {
        let authToken: string | undefined;
        let pendingToken: string | undefined;

        if (readCookies) {
            const got = await readCookies();
            authToken = got.auth;
            pendingToken = got.pending;
        } else {
            [authToken, pendingToken] = await Promise.all([getAuthCookie(), getPendingCookie()]);
        }

        // 1. Prefer auth (any paid state). Catches the webhook-first race
        //    where the cookie has already been upgraded to paid:true.
        if (authToken) {
            const payload: AuthTokenPayload | null = await verifyAuth(authToken);
            if (payload && payload.sub && payload.phone) {
                return handler({
                    ...ctx,
                    session: {
                        phone: payload.phone,
                        userId: payload.sub,
                        paid: payload.paid === true,
                    },
                });
            }
        }

        // 2. Fall back to pending (new user, OTP-verified).
        if (pendingToken) {
            const payload: PendingTokenPayload | null = await verifyPending(pendingToken);
            if (payload?.phone) {
                return handler({
                    ...ctx,
                    session: { phone: payload.phone, paid: false },
                });
            }
        }

        throw new UnauthorizedError("Registration session required");
    };
}
