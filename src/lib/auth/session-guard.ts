/**
 * Combined JWT + DB verification for the `brpl_auth` cookie.
 *
 * Use this in middleware (where we can't make full DB calls via the
 * `getAuthSession` helper, which is server-component-only) to detect stale
 * JWTs: tokens that are still cryptographically valid but reference a user
 * that no longer exists in MongoDB.
 *
 * Returns a discriminated union so callers can decide whether to:
 *   - proceed (valid)
 *   - clear the cookie + redirect (expired or user_missing)
 *   - ignore the cookie (invalid_token — treat as anonymous)
 */

import "server-only";
import { verifyAuth, type AuthTokenPayload } from "@/lib/auth/crypto";

export type AuthAndUserResult =
    | { kind: "valid"; payload: AuthTokenPayload; user: { _id: string; phone: string } }
    | { kind: "expired"; reason: "expired" }
    | { kind: "user_missing"; reason: "user_missing"; payload: AuthTokenPayload }
    | { kind: "invalid_token"; reason: "invalid_token" };

export type UserLookup = (id: string) => Promise<{ _id: string; phone: string } | null>;

export async function verifyAuthAndUser(token: string | undefined, lookup: UserLookup): Promise<AuthAndUserResult> {
    if (!token) return { kind: "invalid_token", reason: "invalid_token" };

    const payload = await verifyAuth(token);
    if (!payload) {
        // Distinguish expired vs invalid by trying to decode the exp claim.
        // If we can't decode, it's invalid. If we can and it's past, it's expired.
        try {
            const parts = token.split(".");
            if (parts.length === 3) {
                const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
                const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
                const decoded = JSON.parse(atob(padded));
                if (typeof decoded.exp === "number" && decoded.exp * 1000 < Date.now()) {
                    return { kind: "expired", reason: "expired" };
                }
            }
        } catch {
            /* fall through */
        }
        return { kind: "invalid_token", reason: "invalid_token" };
    }

    if (!payload.sub) return { kind: "invalid_token", reason: "invalid_token" };

    let user;
    try {
        user = await lookup(payload.sub);
    } catch {
        // DB error — don't clear a potentially-valid cookie on a transient blip.
        return { kind: "invalid_token", reason: "invalid_token" };
    }
    if (!user) return { kind: "user_missing", reason: "user_missing", payload };

    return { kind: "valid", payload, user };
}
