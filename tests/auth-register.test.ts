/**
 * Tests for the registration flow that previously left profile fields empty
 * on the dashboard (screenshot bug).
 *
 * The root cause: when the Razorpay webhook arrived before the modal's
 * verify handler ran, the client polled /api/auth/me, saw paymentStatus
 * "completed", and called finishRegistration — but the client had no
 * paymentId/orderId yet, so it skipped the POST to /api/auth/register
 * entirely. The User was left with paymentStatus=completed but empty
 * name/email/role/state/city.
 *
 * These tests pin down the server-side fix: registerUser must accept
 * missing paymentId/orderId and resolve them from the existing record.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerUser, type RegisterUserInput } from "@/lib/domain/auth/service";
import type { UserRepo } from "@/lib/infra/db/repos";
import type { IUser } from "@/models/User";
import { ConflictError, BadRequestError } from "@/lib/api/errors";

type Stored = Partial<IUser> & { _id: string; phone: string };

function makeRepo(initial: Stored[] = []): { repo: UserRepo; store: Map<string, Stored> } {
    const store = new Map<string, string>(); // phone -> id
    const docs = new Map<string, Stored>(); // id -> doc
    initial.forEach((d) => {
        store.set(d.phone, d._id);
        docs.set(d._id, { ...d });
    });

    const repo: UserRepo = {
        findById: async (id) => (docs.get(id) as IUser | undefined) ?? null,
        findByPhone: async (phone) => {
            const id = store.get(phone);
            if (!id) return null;
            return (docs.get(id) as IUser | undefined) ?? null;
        },
        create: async (data) => {
            const id = `u_${Math.random().toString(36).slice(2)}`;
            const doc: Stored = { _id: id, ...data } as Stored;
            store.set(doc.phone, id);
            docs.set(id, doc);
            return doc as IUser;
        },
        update: async (id, data) => {
            const cur = docs.get(id);
            if (!cur) return null;
            const next = { ...cur, ...data };
            docs.set(id, next);
            return next as IUser;
        },
    };

    return { repo, store };
}

const baseInput: RegisterUserInput = {
    phone: "9876543210",
    name: "Rohit Sharma",
    email: "rohit@example.com",
    role: "batsman",
    state: "Maharashtra",
    city: "Mumbai",
    paymentId: "pay_ABC",
    orderId: "ord_XYZ",
};

describe("registerUser — webhook-first race", () => {
    it("creates a new user when none exists", async () => {
        const { repo } = makeRepo();
        const user = await registerUser(baseInput, { userRepo: repo });
        expect(user.name).toBe("Rohit Sharma");
        expect(user.email).toBe("rohit@example.com");
        expect(user.role).toBe("batsman");
        expect(user.paymentStatus).toBe("completed");
    });

    it("enriches a webhook-pre-created user (race winner)", async () => {
        // Simulate the webhook-first race: a User exists with phone only
        // and paymentStatus=completed, but no profile fields. The client
        // never got paymentId/orderId from the Razorpay modal handler, so
        // they're missing from the request.
        const { repo, store } = makeRepo([
            {
                _id: "u_existing",
                phone: "9876543210",
                paymentStatus: "completed",
                paymentId: "pay_WEBHOOK",
                orderId: "ord_WEBHOOK",
                // name/email/role/state/city all missing
            },
        ]);
        const result = await registerUser(
            {
                phone: baseInput.phone,
                name: baseInput.name,
                email: baseInput.email,
                role: baseInput.role,
                state: baseInput.state,
                city: baseInput.city,
                // no paymentId/orderId — the modal handler never ran
            },
            { userRepo: repo },
        );
        expect(result._id).toBe("u_existing");
        expect(result.name).toBe("Rohit Sharma");
        expect(result.email).toBe("rohit@example.com");
        expect(result.role).toBe("batsman");
        expect(result.state).toBe("Maharashtra");
        expect(result.city).toBe("Mumbai");
        // Server-resolved values from the existing record
        expect(result.paymentId).toBe("pay_WEBHOOK");
        expect(result.orderId).toBe("ord_WEBHOOK");
        expect(store.get("9876543210")).toBe("u_existing");
    });

    it("prefers client-supplied paymentId/orderId over server values", async () => {
        const { repo } = makeRepo([
            {
                _id: "u_existing",
                phone: "9876543210",
                paymentStatus: "completed",
                paymentId: "pay_OLD",
                orderId: "ord_OLD",
            },
        ]);
        const result = await registerUser(baseInput, { userRepo: repo });
        expect(result.paymentId).toBe("pay_ABC");
        expect(result.orderId).toBe("ord_XYZ");
    });

    it("throws ConflictError when the user is already fully registered", async () => {
        const { repo } = makeRepo([
            {
                _id: "u_existing",
                phone: "9876543210",
                name: "Already Registered",
                email: "existing@example.com",
                role: "batsman",
                state: "Karnataka",
                city: "Bengaluru",
                paymentStatus: "completed",
            },
        ]);
        await expect(registerUser(baseInput, { userRepo: repo })).rejects.toBeInstanceOf(ConflictError);
    });

    it("throws BadRequestError when neither client nor server has paymentId", async () => {
        const { repo } = makeRepo([
            // A stub user from createOrder — never paid, no paymentId
            { _id: "u_stub", phone: "9876543210", paymentStatus: "pending" },
        ]);
        await expect(
            registerUser({ ...baseInput, paymentId: undefined, orderId: undefined }, { userRepo: repo }),
        ).rejects.toBeInstanceOf(BadRequestError);
    });
});
