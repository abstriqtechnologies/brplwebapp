import { describe, it, expect, vi } from "vitest";

/**
 * Security headers for `next.config.mjs`.
 *
 * Extracted into a testable module so we can assert the shape (header keys,
 * values, what they're set on). The config file imports from here.
 */

describe("security headers", () => {
    async function load() {
        return await import("@/lib/security-headers");
    }

    describe("defaultSecurityHeaders", () => {
        it("includes click-jacking / content-type / referrer / permissions policies", async () => {
            const { defaultSecurityHeaders } = await load();
            const headers = defaultSecurityHeaders();
            const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
            expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
            expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
            expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
            expect(byKey["Permissions-Policy"]).toContain("camera=()");
            expect(byKey["Permissions-Policy"]).toContain("microphone=()");
            expect(byKey["Permissions-Policy"]).toContain("geolocation=()");
        });

        it("includes Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy", async () => {
            const { defaultSecurityHeaders } = await load();
            const headers = defaultSecurityHeaders();
            const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
            expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
            expect(byKey["Cross-Origin-Resource-Policy"]).toBe("same-site");
        });

        it("omits HSTS when not in production", async () => {
            const origEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "development";
            vi.resetModules();
            try {
                const { defaultSecurityHeaders } = await load();
                const byKey = Object.fromEntries(defaultSecurityHeaders().map((h) => [h.key, h.value]));
                expect(byKey["Strict-Transport-Security"]).toBeUndefined();
            } finally {
                process.env.NODE_ENV = origEnv;
                vi.resetModules();
            }
        });

        it("includes HSTS when in production", async () => {
            const origEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";
            vi.resetModules();
            try {
                const { defaultSecurityHeaders } = await load();
                const byKey = Object.fromEntries(defaultSecurityHeaders().map((h) => [h.key, h.value]));
                expect(byKey["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
                expect(byKey["Strict-Transport-Security"]).toContain("includeSubDomains");
            } finally {
                process.env.NODE_ENV = origEnv;
                vi.resetModules();
            }
        });

        it("includes a Content-Security-Policy header", async () => {
            const { defaultSecurityHeaders } = await load();
            const byKey = Object.fromEntries(defaultSecurityHeaders().map((h) => [h.key, h.value]));
            const csp = byKey["Content-Security-Policy"];
            expect(csp).toBeDefined();
            expect(csp).toContain("default-src 'self'");
            // Razorpay checkout is loaded inline.
            expect(csp).toContain("https://checkout.razorpay.com");
            // SMSIndiaHub not loaded on the client.
            expect(csp).not.toContain("smsindiahub");
        });

        it("allows 'unsafe-eval' in script-src in development (React Refresh)", async () => {
            // Next.js's React Refresh runtime uses eval() to enable HMR.
            // Without 'unsafe-eval' in script-src, `next dev` throws EvalError
            // on every page load.
            const origEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "development";
            vi.resetModules();
            try {
                const { defaultSecurityHeaders } = await load();
                const byKey = Object.fromEntries(defaultSecurityHeaders().map((h) => [h.key, h.value]));
                const csp = byKey["Content-Security-Policy"];
                expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
            } finally {
                process.env.NODE_ENV = origEnv;
                vi.resetModules();
            }
        });

        it("does NOT include 'unsafe-eval' in production script-src", async () => {
            // Production builds don't ship the React Refresh runtime, so we
            // keep the strict CSP.
            const origEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";
            vi.resetModules();
            try {
                const { defaultSecurityHeaders } = await load();
                const byKey = Object.fromEntries(defaultSecurityHeaders().map((h) => [h.key, h.value]));
                const csp = byKey["Content-Security-Policy"];
                expect(csp).not.toContain("'unsafe-eval'");
            } finally {
                process.env.NODE_ENV = origEnv;
                vi.resetModules();
            }
        });
    });

    describe("nextHeadersConfig", () => {
        it("returns an array suitable for next.config.mjs `headers()`", async () => {
            const { nextHeadersConfig } = await load();
            const cfg = nextHeadersConfig();
            expect(Array.isArray(cfg)).toBe(true);
            // First entry should apply to all paths and contain our security headers.
            const allPaths = cfg.find((c) => c.source === "/:path*");
            expect(allPaths).toBeDefined();
            const byKey = Object.fromEntries(
                (allPaths!.headers as Array<{ key: string; value: string }>).map((h) => [h.key, h.value]),
            );
            expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
        });
    });

    describe("config-file parity", () => {
        /**
         * `next.config.mjs` mirrors the canonical header set in this module.
         * `.mjs` can't import `.ts` directly, so we assert by reading the file
         * text and checking for the expected header keys (and that the
         * always-present values appear).
         *
         * If this test breaks, the config file and this module are out of
         * sync — copy the new header from the TS module into the .mjs file.
         */
        it("next.config.mjs contains every always-present header key from defaultSecurityHeaders()", async () => {
            const fs = await import("node:fs/promises");
            const path = await import("node:path");

            const { defaultSecurityHeaders } = await load();
            const configPath = path.resolve(__dirname, "../../next.config.mjs");
            const configSrc = await fs.readFile(configPath, "utf8");

            // Always-present headers (skip prod-only HSTS).
            const alwaysHeaders = defaultSecurityHeaders().filter((h) => h.key !== "Strict-Transport-Security");
            for (const h of alwaysHeaders) {
                expect(configSrc, `config must include header key "${h.key}"`).toContain(`"${h.key}"`);
            }

            // For each header, the value (or its directives) must appear in
            // the config. For the CSP we check that all directives are listed.
            for (const h of alwaysHeaders) {
                if (h.key === "Content-Security-Policy") {
                    const directives = h.value.split("; ").map((d) => d.trim());
                    for (const d of directives) {
                        expect(configSrc, `config CSP must include directive "${d.slice(0, 30)}..."`).toContain(d);
                    }
                } else {
                    expect(configSrc, `config must include value of header "${h.key}"`).toContain(h.value);
                }
            }

            // HSTS must be conditional on NODE_ENV=production.
            expect(configSrc).toContain("Strict-Transport-Security");
            expect(configSrc).toMatch(/isProd\s*\?\s*\[\{[^}]*Strict-Transport-Security/);
        });
    });
});
