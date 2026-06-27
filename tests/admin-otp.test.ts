/**
 * Tests for the admin phone+OTP auth service.
 *
 * Mirrors the structure of `auth-register.test.ts`:
 *   - vitest describe/it/expect
 *   - in-memory fakes of the repo interfaces, built inline with `new Map()`
 *   - deterministic `now` for time-dependent tests
 *
 * The service reads `ADMIN_PHONES` via the lazy `env` proxy in `src/lib/env.ts`,
 * which caches the parsed value on first access. To exercise different env
 * values without leaking between tests, we `vi.resetModules()` and re-import
 * the module so the proxy re-reads `process.env.ADMIN_PHONES`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { normalizePhone } from "@/lib/phone";
import type { AdminRepo, OtpRepo, CreateAdminInput, CreateOtpInput } from "@/lib/infra/db/repos";
import type { IAdminUser } from "@/models/AdminUser";
import type { IOtpRecord } from "@/models/OtpRecord";

// ---------- AdminRepo fake ----------

type AdminDoc = Partial<IAdminUser> & {
    _id: string;
    email: string;
    name: string;
    role: IAdminUser["role"];
    active: boolean;
    phone?: string;
    totpEnabled: boolean;
};

function makeAdminRepo(initial: AdminDoc[] = []): { repo: AdminRepo; docs: Map<string, AdminDoc> } {
    const docs = new Map<string, AdminDoc>();
    initial.forEach((d) => docs.set(d._id, { ...d }));

    const repo: AdminRepo = {
        findById: async (id) => (docs.get(id) as IAdminUser | undefined) ?? null,
        findByEmail: async (email) => {
            const lower = email.toLowerCase();
            for (const d of docs.values()) {
                if (d.email.toLowerCase() === lower) return d as IAdminUser;
            }
            return null;
        },
        findByPhone: async (phone) => {
            for (const d of docs.values()) {
                if (d.phone === phone) return d as IAdminUser;
            }
            return null;
        },
        create: async (data: CreateAdminInput) => {
            const id = `adm_${Math.random().toString(36).slice(2)}`;
            const doc: AdminDoc = {
                _id: id,
                email: data.email,
                name: data.name,
                role: data.role,
                active: data.active ?? true,
                totpEnabled: data.totpEnabled ?? false,
                passwordHash: data.passwordHash,
                ...(data.totpSecret ? { totpSecret: data.totpSecret } : {}),
                ...(data.phone ? { phone: data.phone } : {}),
            };
            docs.set(id, doc);
            return doc as IAdminUser;
        },
        updatePassword: async () => {
            // unused in these tests
        },
        setActive: async (id, active) => {
            const d = docs.get(id);
            if (d) d.active = active;
        },
        update: async (id, patch) => {
            const cur = docs.get(id);
            if (!cur) return null;
            const next = { ...cur, ...patch } as AdminDoc;
            docs.set(id, next);
            return next as IAdminUser;
        },
        existsByEmail: async (email) => {
            const lower = email.toLowerCase();
            for (const d of docs.values()) {
                if (d.email.toLowerCase() === lower) return true;
            }
            return false;
        },
    };

    return { repo, docs };
}

// ---------- OtpRepo fake ----------

type OtpDoc = IOtpRecord & { _id: string };

function makeOtpRepo(opts: { now?: () => Date } = {}): {
    repo: OtpRepo;
    store: OtpDoc[];
    findLatestCalls(): number;
} {
    const store: OtpDoc[] = [];
    let counter = 0;
    let calls = 0;
    const now = opts.now ?? (() => new Date());

    const repo: OtpRepo = {
        findLatest: async (phone: string) => {
            calls += 1;
            const matches = store
                .filter((o) => o.phone === phone && !o.verified)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return matches[0] ?? null;
        },
        create: async (data: CreateOtpInput & { createdAt?: Date }) => {
            counter += 1;
            const doc: OtpDoc = {
                _id: `otp_${counter}`,
                phone: data.phone,
                otp: data.otp,
                expiresAt: data.expiresAt,
                attempts: 0,
                verified: false,
                createdAt: data.createdAt ?? now(),
            };
            store.push(doc);
            return doc;
        },
        markVerified: async (id: string) => {
            const o = store.find((x) => x._id === id);
            if (!o) return null;
            o.verified = true;
            return o;
        },
        cleanupExpired: async () => {
            const now = new Date();
            for (let i = store.length - 1; i >= 0; i--) {
                if (store[i].expiresAt < now) store.splice(i, 1);
            }
        },
    };

    return { repo, store, findLatestCalls: () => calls };
}

// Re-import the service module (and the errors module it pulls in) to
// reset the lazy env proxy. We pull both modules fresh so the error classes
// the service throws are the same identity as the ones used in test
// assertions — `vi.resetModules()` re-imports everything, including the
// errors module, so the previously top-level imported classes become stale.
async function loadServiceWithEnv(adminPhones: string | undefined) {
    if (adminPhones === undefined) {
        delete process.env.ADMIN_PHONES;
    } else {
        process.env.ADMIN_PHONES = adminPhones;
    }
    vi.resetModules();
    // Re-resolve the module through vitest's alias so @/ paths still work.
    const mod = await import("@/lib/domain/admin-auth/service");
    const errors = await import("@/lib/api/errors");
    return { ...mod, errors };
}

type LoadedService = Awaited<ReturnType<typeof loadServiceWithEnv>>;

// =====================================================================
// isAdminAllowedPhone
// =====================================================================

describe("isAdminAllowedPhone", () => {
    let mod: LoadedService;

    beforeEach(async () => {
        mod = await loadServiceWithEnv("9234894293");
    });

    it("returns true for the default allowlisted number", () => {
        expect(mod.isAdminAllowedPhone("9234894293")).toBe(true);
    });

    it("returns false for a non-allowlisted number", () => {
        expect(mod.isAdminAllowedPhone("9876543210")).toBe(false);
    });

    it("accepts a +91-prefixed variant via normalizePhone", () => {
        // isAdminAllowedPhone takes a normalized 10-digit value (per its
        // `phone10` parameter name); the UI normalizes raw input first.
        expect(mod.isAdminAllowedPhone(normalizePhone("+91 9234894293")!)).toBe(true);
    });

    it("accepts whitespace around the digits", () => {
        expect(mod.isAdminAllowedPhone(normalizePhone(" 9234894293 ")!)).toBe(true);
    });

    it("returns false for the empty string", () => {
        expect(mod.isAdminAllowedPhone("")).toBe(false);
    });

    it("returns false for non-10-digit garbage", () => {
        expect(mod.isAdminAllowedPhone("abc")).toBe(false);
        expect(mod.isAdminAllowedPhone("12345")).toBe(false);
        expect(mod.isAdminAllowedPhone("923489429300")).toBe(false);
    });
});

// =====================================================================
// getAdminAllowedPhones
// =====================================================================

describe("getAdminAllowedPhones", () => {
    it("returns the single default value when ADMIN_PHONES is unset", async () => {
        const mod = await loadServiceWithEnv(undefined);
        expect(mod.getAdminAllowedPhones()).toEqual(["9234894293"]);
    });

    it("parses a comma-separated list of phones", async () => {
        const mod = await loadServiceWithEnv("9234894293,9876543210,7011223344");
        expect(mod.getAdminAllowedPhones()).toEqual(["9234894293", "9876543210", "7011223344"]);
    });

    it("falls back to the default when ADMIN_PHONES is an empty string", async () => {
        const mod = await loadServiceWithEnv("");
        expect(mod.getAdminAllowedPhones()).toEqual(["9234894293"]);
    });

    it("normalizes whitespace and stray commas", async () => {
        const mod = await loadServiceWithEnv(" 9234894293 , , 9876543210 ,, ");
        expect(mod.getAdminAllowedPhones()).toEqual(["9234894293", "9876543210"]);
    });

    it("drops entries that don't normalize (e.g. 'abc')", async () => {
        const mod = await loadServiceWithEnv("abc,9234894293,xyz");
        expect(mod.getAdminAllowedPhones()).toEqual(["9234894293"]);
    });
});

// =====================================================================
// sendAdminOtp
// =====================================================================

describe("sendAdminOtp", () => {
    let mod: LoadedService;

    beforeEach(async () => {
        mod = await loadServiceWithEnv("9234894293");
    });

    it("returns { sent: false, expiresInSec: 0 } for a disallowed phone and never touches the repos", async () => {
        const { repo: otpRepo, store, findLatestCalls } = makeOtpRepo();
        const sendSms = vi.fn(async () => true);

        const result = await mod.sendAdminOtp({
            phone: "9876543210",
            otpRepo,
            generateOtp: () => "1234",
            sendSms,
            now: () => 1_700_000_000_000,
        });

        expect(result).toEqual({ sent: false, expiresInSec: 0 });
        expect(store.length).toBe(0);
        expect(sendSms).not.toHaveBeenCalled();
        // findLatest isn't even consulted on the disallowed path — the service
        // short-circuits on the allowlist check.
        expect(findLatestCalls()).toBe(0);
    });

    it("creates an OTP, calls sendSms with purpose 'admin', and returns { sent: true, expiresInSec: 300 } for an allowed phone", async () => {
        const { repo: otpRepo, store } = makeOtpRepo();
        const sendSms = vi.fn(async () => true);
        const now = 1_700_000_000_000;

        const result = await mod.sendAdminOtp({
            phone: "9234894293",
            otpRepo,
            generateOtp: () => "4242",
            sendSms,
            now: () => now,
        });

        expect(result).toEqual({ sent: true, expiresInSec: 300 });
        expect(store.length).toBe(1);
        expect(store[0]).toMatchObject({
            phone: "9234894293",
            otp: "4242",
            expiresAt: new Date(now + 5 * 60 * 1000),
            verified: false,
        });
        expect(sendSms).toHaveBeenCalledTimes(1);
        expect(sendSms).toHaveBeenCalledWith("9234894293", "4242", "admin");
    });

    it("throws RateLimitError with waitSec on a second call within 60s", async () => {
        const { repo: otpRepo, store } = makeOtpRepo({ now: () => new Date(1_700_000_000_000) });
        const sendSms = vi.fn(async () => true);
        const t0 = 1_700_000_000_000;

        // First send — succeeds, OTP created.
        await mod.sendAdminOtp({
            phone: "9234894293",
            otpRepo,
            generateOtp: () => "1111",
            sendSms,
            now: () => t0,
        });

        // Second send 10s later — still inside the 60s cooldown.
        let caught: unknown;
        try {
            await mod.sendAdminOtp({
                phone: "9234894293",
                otpRepo,
                generateOtp: () => "2222",
                sendSms,
                now: () => t0 + 10_000,
            });
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeInstanceOf(mod.errors.RateLimitError);
        expect((caught as InstanceType<typeof mod.errors.RateLimitError>).retryAfterSec).toBe(50);
        // Only one OTP should have been persisted — the cooldown path must
        // not have created a second one.
        expect(store.length).toBe(1);
        // sendSms is only invoked on the successful first call.
        expect(sendSms).toHaveBeenCalledTimes(1);
    });

    it("throws UpstreamError when sendSms returns false", async () => {
        const { repo: otpRepo, store } = makeOtpRepo();
        const sendSms = vi.fn(async () => false);

        await expect(
            mod.sendAdminOtp({
                phone: "9234894293",
                otpRepo,
                generateOtp: () => "9999",
                sendSms,
                now: () => 1_700_000_000_000,
            }),
        ).rejects.toBeInstanceOf(mod.errors.UpstreamError);

        // The OTP was created before the SMS call, so we should still have one record.
        expect(store.length).toBe(1);
    });

    it("normalizes '+91 9234894293' to '9234894293' before storing", async () => {
        const { repo: otpRepo, store } = makeOtpRepo();
        const sendSms = vi.fn(async () => true);

        await mod.sendAdminOtp({
            phone: "+91 9234894293",
            otpRepo,
            generateOtp: () => "7777",
            sendSms,
            now: () => 1_700_000_000_000,
        });

        expect(store.length).toBe(1);
        expect(store[0].phone).toBe("9234894293");
        expect(sendSms).toHaveBeenCalledWith("9234894293", "7777", "admin");
    });
});

// =====================================================================
// verifyAdminOtp
// =====================================================================

describe("verifyAdminOtp", () => {
    let mod: LoadedService;

    beforeEach(async () => {
        mod = await loadServiceWithEnv("9234894293");
    });

    function buildSetup(opts: {
        admin?: AdminDoc | null;
        otp?: Partial<OtpDoc> | null;
        now?: number;
    } = {}) {
        const { repo: adminRepo } = makeAdminRepo(
            opts.admin === undefined || opts.admin === null
                ? []
                : [opts.admin],
        );
        const { repo: otpRepo, store } = makeOtpRepo();

        const t0 = opts.now ?? 1_700_000_000_000;
        if (opts.otp !== null) {
            const doc: OtpDoc = {
                _id: "otp_test",
                phone: "9234894293",
                otp: "1234",
                expiresAt: new Date(t0 + 5 * 60 * 1000),
                attempts: 0,
                verified: false,
                createdAt: new Date(t0),
                ...(opts.otp ?? {}),
            };
            store.push(doc);
        }

        return { adminRepo, otpRepo, store, now: t0 };
    }

    const adminDoc: AdminDoc = {
        _id: "adm_1",
        email: "admin@brpl.com",
        name: "Super Admin",
        role: "superadmin",
        active: true,
        phone: "9234894293",
        totpEnabled: false,
    };

    it("happy path: returns the admin when code matches", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({ admin: adminDoc });

        const admin = await mod.verifyAdminOtp({
            phone: "9234894293",
            code: "1234",
            adminRepo,
            otpRepo,
            now: () => now,
        });

        expect(admin._id).toBe("adm_1");
        expect(admin.phone).toBe("9234894293");
    });

    it("throws UnauthorizedError('Invalid OTP') for a wrong code", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({ admin: adminDoc });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "9999",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toBeInstanceOf(mod.errors.UnauthorizedError);

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "9999",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toThrow("Invalid OTP");
    });

    it("throws UnauthorizedError('Invalid OTP') when no OtpRecord exists", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({ admin: adminDoc, otp: null });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "1234",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toThrow(/Invalid OTP/);
    });

    it("throws UnauthorizedError('Invalid OTP') for an expired OtpRecord", async () => {
        // Set `now` past the OTP's expiresAt.
        const t0 = 1_700_000_000_000;
        const { adminRepo, otpRepo } = buildSetup({
            admin: adminDoc,
            otp: { expiresAt: new Date(t0 - 1000) },
            now: t0,
        });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "1234",
                adminRepo,
                otpRepo,
                now: () => t0,
            }),
        ).rejects.toThrow(/Invalid OTP/);
    });

    it("throws UnauthorizedError('Invalid OTP') for an already-verified OtpRecord", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({
            admin: adminDoc,
            otp: { verified: true },
        });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "1234",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toThrow(/Invalid OTP/);
    });

    it("throws UnauthorizedError('Invalid OTP') when no AdminUser exists for the phone", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({ admin: null });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "1234",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toThrow(/Invalid OTP/);
    });

    it("throws UnauthorizedError('Invalid OTP') for an inactive admin", async () => {
        const { adminRepo, otpRepo, now } = buildSetup({
            admin: { ...adminDoc, active: false },
        });

        await expect(
            mod.verifyAdminOtp({
                phone: "9234894293",
                code: "1234",
                adminRepo,
                otpRepo,
                now: () => now,
            }),
        ).rejects.toThrow(/Invalid OTP/);
    });
});