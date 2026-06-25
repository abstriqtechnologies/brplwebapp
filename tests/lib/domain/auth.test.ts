import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Auth service — pure business logic over the UserRepo + OtpRepo.
 *
 * The service exposes:
 *   - `sendOtp(phone)` → returns { expiresInSec } on success.
 *     Throws TooManyRequestsError on resend-cooldown violation.
 *   - `verifyOtp(phone, code)` → returns { kind: "existing", user } or
 *     { kind: "new", phone } so the route handler can decide whether to
 *     issue a full auth cookie or a pending cookie.
 *   - `registerUser({ phone, name, email, role, state, city, paymentId, orderId })`
 *     → returns the created User record.
 *
 * SMS delivery is injected via `sendSms` so tests don't touch the network.
 * OTP generation is injectable so tests are deterministic.
 */

describe("domain/auth service", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        vi.doMock("server-only", () => ({}));
    });

    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const auth = await import("@/lib/domain/auth/service");
        return {
            userRepo: new repos.InMemoryUserRepo(),
            otpRepo: new repos.InMemoryOtpRepo(),
            auth,
        };
    }

    describe("sendOtp", () => {
        it("returns expiresInSec on a fresh phone", async () => {
            const { userRepo, otpRepo, auth } = await load();
            const sendSms = vi.fn().mockResolvedValue(true);
            const result = await auth.sendOtp({
                phone: "9876543210",
                userRepo,
                otpRepo,
                generateOtp: () => "123456",
                sendSms,
            });
            expect(result.expiresInSec).toBeGreaterThan(0);
            expect(sendSms).toHaveBeenCalledWith("9876543210", "123456", expect.any(String));
        });

        it("rejects resends within the 60s cooldown", async () => {
            const { userRepo, otpRepo, auth } = await load();
            const sendSms = vi.fn().mockResolvedValue(true);
            const generateOtp = () => "111111";
            await auth.sendOtp({ phone: "9876543210", userRepo, otpRepo, generateOtp, sendSms });
            await expect(
                auth.sendOtp({ phone: "9876543210", userRepo, otpRepo, generateOtp, sendSms }),
            ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
            // Only the first send should have hit SMS.
            expect(sendSms).toHaveBeenCalledTimes(1);
        });

        it("returns the same expiresInSec window every time (5 min)", async () => {
            const { userRepo, otpRepo, auth } = await load();
            const result = await auth.sendOtp({
                phone: "9876543210",
                userRepo,
                otpRepo,
                generateOtp: () => "000000",
                sendSms: async () => true,
            });
            expect(result.expiresInSec).toBe(300);
        });

        it("normalizes the phone (strips 91 country code)", async () => {
            const { userRepo, otpRepo, auth } = await load();
            const sendSms = vi.fn().mockResolvedValue(true);
            await auth.sendOtp({
                phone: "919876543210",
                userRepo,
                otpRepo,
                generateOtp: () => "123456",
                sendSms,
            });
            expect(sendSms).toHaveBeenCalledWith("9876543210", "123456", expect.any(String));
        });

        it("rejects invalid phone lengths", async () => {
            const { userRepo, otpRepo, auth } = await load();
            await expect(
                auth.sendOtp({
                    phone: "12345",
                    userRepo,
                    otpRepo,
                    generateOtp: () => "123456",
                    sendSms: async () => true,
                }),
            ).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
        });
    });

    describe("verifyOtp", () => {
        it("returns kind=existing when a user with that phone is already registered", async () => {
            const { userRepo, otpRepo, auth } = await load();
            await userRepo.create({
                phone: "9876543210",
                name: "Alice",
                email: "a@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "completed",
            });
            const result = await auth.verifyOtp({
                phone: "9876543210",
                code: "000000",
                userRepo,
                otpRepo,
                findLatestOtp: async () => ({
                    _id: "o1" as any,
                    phone: "9876543210",
                    otp: "000000",
                    verified: false,
                    attempts: 0,
                    expiresAt: new Date(Date.now() + 60_000),
                    createdAt: new Date(),
                }),
            });
            expect(result.kind).toBe("existing");
            if (result.kind === "existing") {
                expect(result.user.phone).toBe("9876543210");
            }
        });

        it("returns kind=new when no user is registered for the phone", async () => {
            const { userRepo, otpRepo, auth } = await load();
            const result = await auth.verifyOtp({
                phone: "9876543210",
                code: "000000",
                userRepo,
                otpRepo,
                findLatestOtp: async () => ({
                    _id: "o1" as any,
                    phone: "9876543210",
                    otp: "000000",
                    verified: false,
                    attempts: 0,
                    expiresAt: new Date(Date.now() + 60_000),
                    createdAt: new Date(),
                }),
            });
            expect(result.kind).toBe("new");
            if (result.kind === "new") {
                expect(result.phone).toBe("9876543210");
            }
        });

        it("rejects an incorrect OTP code", async () => {
            const { userRepo, otpRepo, auth } = await load();
            await expect(
                auth.verifyOtp({
                    phone: "9876543210",
                    code: "111111",
                    userRepo,
                    otpRepo,
                    findLatestOtp: async () => ({
                        _id: "o1" as any,
                        phone: "9876543210",
                        otp: "000000",
                        verified: false,
                        attempts: 0,
                        expiresAt: new Date(Date.now() + 60_000),
                        createdAt: new Date(),
                    }),
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("rejects an expired OTP", async () => {
            const { userRepo, otpRepo, auth } = await load();
            await expect(
                auth.verifyOtp({
                    phone: "9876543210",
                    code: "000000",
                    userRepo,
                    otpRepo,
                    findLatestOtp: async () => ({
                        _id: "o1" as any,
                        phone: "9876543210",
                        otp: "000000",
                        verified: false,
                        attempts: 0,
                        expiresAt: new Date(Date.now() - 1000),
                        createdAt: new Date(),
                    }),
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("rejects when no OTP has been issued", async () => {
            const { userRepo, otpRepo, auth } = await load();
            await expect(
                auth.verifyOtp({
                    phone: "9876543210",
                    code: "000000",
                    userRepo,
                    otpRepo,
                    findLatestOtp: async () => null,
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });
    });

    describe("registerUser", () => {
        it("creates a user and returns it", async () => {
            const { userRepo, auth } = await load();
            const u = await auth.registerUser(
                {
                    phone: "9876543210",
                    name: "Bob",
                    email: "b@x.com",
                    role: "bowler",
                    state: "KA",
                    city: "Bangalore",
                    paymentId: "pay_1",
                    orderId: "ord_1",
                },
                { userRepo },
            );
            expect(u.phone).toBe("9876543210");
            expect(u.name).toBe("Bob");
            expect(u.paymentStatus).toBe("completed");
            expect(u.paymentId).toBe("pay_1");

            const found = await userRepo.findByPhone("9876543210");
            expect(found?._id.toString()).toBe(u._id.toString());
        });

        it("rejects if a user already exists for the phone", async () => {
            const { userRepo, auth } = await load();
            await userRepo.create({
                phone: "9876543210",
                name: "Alice",
                email: "a@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "completed",
            });
            await expect(
                auth.registerUser(
                    {
                        phone: "9876543210",
                        name: "Bob",
                        email: "b@x.com",
                        role: "bowler",
                        state: "KA",
                        city: "Bangalore",
                        paymentId: "pay_1",
                        orderId: "ord_1",
                    },
                    { userRepo },
                ),
            ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
        });

        it("rejects missing required fields", async () => {
            const { userRepo, auth } = await load();
            await expect(
                auth.registerUser(
                    {
                        phone: "9876543210",
                        name: "",
                        email: "b@x.com",
                        role: "bowler",
                        state: "KA",
                        city: "Bangalore",
                        paymentId: "pay_1",
                        orderId: "ord_1",
                    },
                    { userRepo },
                ),
            ).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
        });
    });
});
