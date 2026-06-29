/**
 * Pure auth crypto helpers.
 *
 * Wraps `jose` to issue and verify JSON Web Tokens for the three cookie
 * identities in this app:
 *   - "auth"        — fully-registered user session (`Brpl_auth`)
 *   - "pending_reg" — verified phone, registration not yet complete (`Brpl_pending`)
 *   - "admin"       — admin user session (`Brpl_admin`)
 *
 * Each verify* function returns `null` on any failure (expired, tampered,
 * wrong purpose, wrong secret) — never throws. This keeps call sites simple.
 */

import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ALG = "HS256";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

// ---------- Public types ----------

export type AuthTokenPayload = {
    sub: string;
    phone?: string;
    paid?: boolean; // mirror of User.paymentStatus === "completed" at issuance
    purpose: "auth";
    [key: string]: unknown;
};

export type PendingTokenPayload = {
    sub: string;
    phone: string;
    purpose: "pending_reg";
    [key: string]: unknown;
};

export type AdminTokenPayload = {
    sub: string;
    email: string;
    role: "superadmin";
    name?: string;
    purpose: "admin";
    [key: string]: unknown;
};

// ---------- Signers ----------

async function signWithPurpose(
    purpose: "auth" | "pending_reg" | "admin",
    payload: Record<string, unknown>,
    expiresIn: string,
): Promise<string> {
    return await new SignJWT({ ...payload, purpose })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setSubject(String(payload.sub))
        .sign(SECRET);
}

export function signAuth(payload: Omit<AuthTokenPayload, "purpose">, expiresIn = "7d"): Promise<string> {
    return signWithPurpose("auth", payload as Record<string, unknown>, expiresIn);
}

export function signPending(payload: Omit<PendingTokenPayload, "purpose">, expiresIn = "30m"): Promise<string> {
    return signWithPurpose("pending_reg", payload as Record<string, unknown>, expiresIn);
}

export function signAdmin(payload: Omit<AdminTokenPayload, "purpose">, expiresIn = "8h"): Promise<string> {
    return signWithPurpose("admin", payload as Record<string, unknown>, expiresIn);
}

// ---------- Verifiers (return null on any failure) ----------

async function verifyAndAssertPurpose<T extends { purpose: string }>(
    token: string,
    expected: T["purpose"],
): Promise<T | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
        if (payload.purpose !== expected) return null;
        return payload as T;
    } catch {
        return null;
    }
}

export function verifyAuth(token: string): Promise<AuthTokenPayload | null> {
    return verifyAndAssertPurpose<AuthTokenPayload>(token, "auth");
}

export function verifyPending(token: string): Promise<PendingTokenPayload | null> {
    return verifyAndAssertPurpose<PendingTokenPayload>(token, "pending_reg");
}

export function verifyAdmin(token: string): Promise<AdminTokenPayload | null> {
    return verifyAndAssertPurpose<AdminTokenPayload>(token, "admin");
}
