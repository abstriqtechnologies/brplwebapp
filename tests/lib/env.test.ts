import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * The env module eagerly caches its parsed result inside `_env`. We use
 * `vi.resetModules()` to force a fresh import per test and mutate
 * `process.env` directly to drive different validation paths.
 */
async function loadEnv() {
    vi.resetModules();
    return (await import("@/lib/env")) as typeof import("@/lib/env");
}

describe("env module", () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
        // Start each test from a known baseline.
        for (const k of Object.keys(process.env)) delete (process.env as Record<string, string>)[k];
        Object.assign(process.env, ORIGINAL_ENV);
        // Explicitly delete env vars that have a booleanish schema — these
        // have default-false semantics and tests should exercise that path
        // without being affected by values set in .env.
        delete process.env.ALLOW_DEFAULT_ADMIN;
        delete process.env.CMS_LIVE;
        delete process.env.BRPL_CSRF_REQUIRED;
        // Required defaults for the happy path
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        process.env.JWT_SECRET = "test-secret-12345678";
    });

    afterEach(() => {
        for (const k of Object.keys(process.env)) delete (process.env as Record<string, string>)[k];
        Object.assign(process.env, ORIGINAL_ENV);
        vi.resetModules();
    });

    it("parses minimal required env", async () => {
        const envMod = await loadEnv();
        const e = envMod.getEnv();
        expect(e.NODE_ENV).toBe("test");
        expect(e.MONGODB_URI).toBe("mongodb://localhost:27017/test");
        expect(e.JWT_SECRET).toBe("test-secret-12345678");
        expect(e.SMS_SENDER_ID).toBe("SMSHUB"); // default
        expect(e.SMS_GWID).toBe("2"); // default
        expect(e.MEDIA_STORAGE_PATH).toBe("public/uploads"); // default
    });

    it("coerces booleanish flags", async () => {
        process.env.ALLOW_DEFAULT_ADMIN = "1";
        process.env.CMS_LIVE = "true";
        process.env.BRPL_CSRF_REQUIRED = "yes";
        const envMod = await loadEnv();
        const e = envMod.getEnv();
        expect(e.ALLOW_DEFAULT_ADMIN).toBe(true);
        expect(e.CMS_LIVE).toBe(true);
        expect(e.BRPL_CSRF_REQUIRED).toBe(true);
    });

    it("treats unset booleanish flags as false", async () => {
        const envMod = await loadEnv();
        const e = envMod.getEnv();
        expect(e.ALLOW_DEFAULT_ADMIN).toBe(false);
        expect(e.CMS_LIVE).toBe(false);
        expect(e.BRPL_CSRF_REQUIRED).toBe(false);
    });

    it("rejects too-short JWT secrets", async () => {
        process.env.JWT_SECRET = "short";
        const envMod = await loadEnv();
        expect(() => envMod.getEnv()).toThrow(/JWT_SECRET/);
    });

    it("uses dev fallbacks for missing MONGODB_URI in non-production", async () => {
        delete process.env.MONGODB_URI;
        process.env.NODE_ENV = "development";
        const envMod = await loadEnv();
        const e = envMod.getEnv();
        expect(e.MONGODB_URI).toMatch(/dev-placeholder|localhost/);
    });

    it("throws in production if MONGODB_URI is missing", async () => {
        delete process.env.MONGODB_URI;
        process.env.NODE_ENV = "production";
        const envMod = await loadEnv();
        expect(() => envMod.getEnv()).toThrow(/MONGODB_URI/);
    });

    it("exposes isProduction / isStaging / isDev helpers", async () => {
        process.env.NODE_ENV = "production";
        let envMod = await loadEnv();
        expect(envMod.isProduction()).toBe(true);
        expect(envMod.isStaging()).toBe(false);
        expect(envMod.isDev()).toBe(false);

        process.env.NODE_ENV = "staging";
        envMod = await loadEnv();
        expect(envMod.isProduction()).toBe(false);
        expect(envMod.isStaging()).toBe(true);
        expect(envMod.isDev()).toBe(false);

        process.env.NODE_ENV = "development";
        envMod = await loadEnv();
        expect(envMod.isProduction()).toBe(false);
        expect(envMod.isStaging()).toBe(false);
        expect(envMod.isDev()).toBe(true);
    });

    it("env proxy returns the same values as getEnv()", async () => {
        const envMod = await loadEnv();
        const e = envMod.getEnv();
        expect(envMod.env.NODE_ENV).toBe(e.NODE_ENV);
        expect(envMod.env.MONGODB_URI).toBe(e.MONGODB_URI);
        expect(envMod.env.JWT_SECRET).toBe(e.JWT_SECRET);
    });
});
