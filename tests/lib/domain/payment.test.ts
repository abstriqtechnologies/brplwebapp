import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Payment service — wraps the Razorpay SDK calls.
 *
 * The Razorpay client is injected (so tests can fake order creation) and the
 * HMAC signature is verified via the existing `verifyCheckoutSignature` /
 * `verifyWebhookSignature` helpers — we don't reimplement HMAC.
 *
 * The service exposes:
 *   - `createOrder({ userId, phone, amount, currency })` → returns the
 *     Razorpay order + persisted Payment doc (status: "created").
 *   - `verifyPayment({ userId, paymentId, orderId, signature })` → returns
 *     the updated Payment + updated User (marked paid) on success.
 *   - `handleWebhook(rawBody, signature, event)` → returns the result of
 *     processing a Razorpay server-to-server webhook event.
 */

describe("domain/payment service", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
        process.env.NODE_ENV = "test";
        process.env.MONGODB_URI = "mongodb://localhost:27017/test";
        process.env.RAZORPAY_KEY_ID = "rzp_test_x";
        process.env.RAZORPAY_KEY_SECRET = "test-secret-for-hmac";
        process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret-for-hmac";
        vi.doMock("server-only", () => ({}));
    });

    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const payment = await import("@/lib/domain/payment/service");
        return {
            userRepo: new repos.InMemoryUserRepo(),
            paymentRepo: new repos.InMemoryPaymentRepo(),
            payment,
        };
    }

    /** Compute the same HMAC Razorpay would produce for checkout. */
    function makeCheckoutSignature({
        orderId,
        paymentId,
        secret,
    }: {
        orderId: string;
        paymentId: string;
        secret: string;
    }): string {
        const crypto = require("crypto");
        return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    }

    describe("createOrder", () => {
        it("creates an order via Razorpay and persists a Payment doc", async () => {
            const { userRepo, paymentRepo, payment } = await load();
            await userRepo.create({
                phone: "9876543210",
                name: "Bob",
                email: "b@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "pending",
            });
            const user = await userRepo.findByPhone("9876543210");

            const razorpay = {
                orders: {
                    create: vi.fn().mockResolvedValue({
                        id: "order_xyz",
                        amount: 149900,
                        currency: "INR",
                    }),
                },
            };

            const result = await payment.createOrder({
                phone: "9876543210",
                amountPaise: 1499 * 100,
                currency: "INR",
                razorpay,
                userRepo,
                paymentRepo,
                keyId: "rzp_test_x",
            });
            expect(result.orderId).toBe("order_xyz");
            expect(result.amount).toBe(149900);
            expect(result.currency).toBe("INR");
            expect(result.key).toBe("rzp_test_x");

            const persisted = await paymentRepo.findByOrderId("order_xyz");
            expect(persisted).not.toBeNull();
            expect(persisted?.status).toBe("created");
            expect(persisted?.userId.toString()).toBe(user!._id.toString());
        });

        it("auto-creates a minimal user when none exists for the phone", async () => {
            // Login via OTP issues a `pending` cookie but does NOT create a
            // User record. The payment flow is the first place we know the
            // visitor is a real person about to pay, so we create a
            // `paymentStatus=pending` user here. The /auth/register step
            // that runs after the Razorpay webhook enriches the record with
            // name/email/role/city.
            const { userRepo, paymentRepo, payment } = await load();
            const razorpay = {
                orders: {
                    create: vi.fn().mockResolvedValue({
                        id: "order_xyz",
                        amount: 149900,
                        currency: "INR",
                    }),
                },
            };

            const result = await payment.createOrder({
                phone: "9876543210",
                amountPaise: 1499 * 100,
                currency: "INR",
                razorpay,
                userRepo,
                paymentRepo,
                keyId: "rzp_test_x",
            });

            expect(result.orderId).toBe("order_xyz");
            const created = await userRepo.findByPhone("9876543210");
            expect(created).not.toBeNull();
            expect(created?.paymentStatus).toBe("pending");
        });

        it("rejects when the user is already paid", async () => {
            const { userRepo, paymentRepo, payment } = await load();
            await userRepo.create({
                phone: "9876543210",
                name: "Bob",
                email: "b@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "completed",
            });
            await expect(
                payment.createOrder({
                    phone: "9876543210",
                    amountPaise: 149900,
                    currency: "INR",
                    razorpay: { orders: { create: vi.fn() } },
                    userRepo,
                    paymentRepo,
                    keyId: "x",
                }),
            ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
        });
    });

    describe("verifyPayment", () => {
        async function setup() {
            const ctx = await load();
            await ctx.userRepo.create({
                phone: "9876543210",
                name: "Bob",
                email: "b@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "pending",
            });
            await ctx.paymentRepo.create({
                userId: (await ctx.userRepo.findByPhone("9876543210"))!._id.toString(),
                paymentId: "pay_1",
                orderId: "order_1",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });
            return ctx;
        }

        it("marks user paid when signature is valid", async () => {
            const ctx = await setup();
            const sig = makeCheckoutSignature({
                orderId: "order_1",
                paymentId: "pay_1",
                secret: "test-secret-for-hmac",
            });
            const result = await ctx.payment.verifyPayment({
                paymentId: "pay_1",
                orderId: "order_1",
                signature: sig,
                secret: "test-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });
            expect(result.payment.status).toBe("completed");

            const user = await ctx.userRepo.findByPhone("9876543210");
            expect(user?.paymentStatus).toBe("completed");
            expect(user?.paymentId).toBe("pay_1");
        });

        it("rejects an invalid signature", async () => {
            const ctx = await setup();
            await expect(
                ctx.payment.verifyPayment({
                    paymentId: "pay_1",
                    orderId: "order_1",
                    signature: "wrong-signature",
                    secret: "test-secret-for-hmac",
                    userRepo: ctx.userRepo,
                    paymentRepo: ctx.paymentRepo,
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("rejects when no payment record exists for the orderId", async () => {
            const ctx = await setup();
            // The Payment row is stored with orderId "order_1" — query with
            // a different orderId to simulate a missing record.
            await expect(
                ctx.payment.verifyPayment({
                    paymentId: "pay_unknown",
                    orderId: "order_missing",
                    signature: "sig",
                    secret: "test-secret-for-hmac",
                    userRepo: ctx.userRepo,
                    paymentRepo: ctx.paymentRepo,
                }),
            ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
        });

        // Regression: mirrors the real flow. `createOrder` persists the
        // Payment row with `paymentId` set to the Razorpay *order id*
        // (because no payment id exists at order-creation time). After the
        // user pays, Razorpay's `handler` callback hands the client a
        // different `razorpay_payment_id`. The client posts that real
        // payment id to /api/payment/verify. The service must locate the
        // Payment record by `orderId` (which both sides agree on) rather
        // than by `paymentId`, then update the row with the real payment
        // id and persist it on the User.
        it("accepts the real razorpay payment id when the record was created with orderId as paymentId", async () => {
            const ctx = await setup();
            // Match what `createOrder` actually writes in production.
            await ctx.paymentRepo.updateStatus("pay_1", "created"); // ensure status
            // Simulate the production seed: paymentId holds the order id,
            // orderId holds the order id. (Identical strings at this stage.)
            await ctx.paymentRepo.create({
                userId: (await ctx.userRepo.findByPhone("9876543210"))!._id.toString(),
                paymentId: "order_real_1",
                orderId: "order_real_1",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });
            const realRzpPaymentId = "pay_REAL_777";
            const sig = makeCheckoutSignature({
                orderId: "order_real_1",
                paymentId: realRzpPaymentId,
                secret: "test-secret-for-hmac",
            });

            const result = await ctx.payment.verifyPayment({
                paymentId: realRzpPaymentId,
                orderId: "order_real_1",
                signature: sig,
                secret: "test-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });

            expect(result.payment?.status).toBe("completed");
            expect(result.payment?.paymentId).toBe(realRzpPaymentId);
            const user = await ctx.userRepo.findByPhone("9876543210");
            expect(user?.paymentStatus).toBe("completed");
            expect(user?.paymentId).toBe(realRzpPaymentId);
            expect(user?.orderId).toBe("order_real_1");
        });
    });

    describe("handleWebhook", () => {
        function makeWebhookSignature(body: string, secret: string): string {
            const crypto = require("crypto");
            return crypto.createHmac("sha256", secret).update(body).digest("hex");
        }

        it("processes payment.captured and marks user paid", async () => {
            const ctx = await load();
            await ctx.userRepo.create({
                phone: "9876543210",
                name: "Bob",
                email: "b@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "pending",
            });
            const user = await ctx.userRepo.findByPhone("9876543210");
            await ctx.paymentRepo.create({
                userId: user!._id.toString(),
                paymentId: "pay_wh",
                orderId: "order_wh",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });

            const body = JSON.stringify({
                event: "payment.captured",
                payload: {
                    payment: {
                        entity: {
                            id: "pay_wh",
                            order_id: "order_wh",
                            notes: { phone: "9876543210" },
                        },
                    },
                },
            });
            const sig = makeWebhookSignature(body, "webhook-secret-for-hmac");

            const result = await ctx.payment.handleWebhook({
                rawBody: body,
                signature: sig,
                secret: "webhook-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });
            expect(result.handled).toBe(true);

            const updated = await ctx.paymentRepo.findByPaymentId("pay_wh");
            expect(updated?.status).toBe("completed");
            const updatedUser = await ctx.userRepo.findByPhone("9876543210");
            expect(updatedUser?.paymentStatus).toBe("completed");
        });

        it("processes payment.captured and creates a placeholder user when none exists yet", async () => {
            const ctx = await load();
            // No user pre-created.
            await ctx.paymentRepo.create({
                userId: "pre-placeholder",
                paymentId: "pay_orphan",
                orderId: "order_orphan",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });
            const body = JSON.stringify({
                event: "payment.captured",
                payload: {
                    payment: {
                        entity: {
                            id: "pay_orphan",
                            order_id: "order_orphan",
                            amount: 149900,
                            notes: { phone: "5555555555" },
                        },
                    },
                },
            });
            const sig = makeWebhookSignature(body, "webhook-secret-for-hmac");
            await ctx.payment.handleWebhook({
                rawBody: body,
                signature: sig,
                secret: "webhook-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });
            const u = await ctx.userRepo.findByPhone("5555555555");
            expect(u).not.toBeNull();
            expect(u?.paymentStatus).toBe("completed");
        });

        it("processes payment.failed and marks payment failed", async () => {
            const ctx = await load();
            await ctx.userRepo.create({
                phone: "9876543210",
                name: "Bob",
                email: "b@x.com",
                role: "batsman",
                state: "MH",
                city: "Mumbai",
                paymentStatus: "pending",
            });
            const user = await ctx.userRepo.findByPhone("9876543210");
            await ctx.paymentRepo.create({
                userId: user!._id.toString(),
                paymentId: "pay_fail",
                orderId: "order_fail",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });

            const body = JSON.stringify({
                event: "payment.failed",
                payload: {
                    payment: {
                        entity: {
                            id: "pay_fail",
                            order_id: "order_fail",
                            notes: { phone: "9876543210" },
                        },
                    },
                },
            });
            const sig = makeWebhookSignature(body, "webhook-secret-for-hmac");

            await ctx.payment.handleWebhook({
                rawBody: body,
                signature: sig,
                secret: "webhook-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });

            const updated = await ctx.paymentRepo.findByPaymentId("pay_fail");
            expect(updated?.status).toBe("failed");
        });

        it("rejects an invalid webhook signature", async () => {
            const ctx = await load();
            const body = JSON.stringify({ event: "payment.captured" });
            await expect(
                ctx.payment.handleWebhook({
                    rawBody: body,
                    signature: "wrong",
                    secret: "webhook-secret-for-hmac",
                    userRepo: ctx.userRepo,
                    paymentRepo: ctx.paymentRepo,
                }),
            ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        });

        it("ignores unknown event types but returns handled: true", async () => {
            const ctx = await load();
            const body = JSON.stringify({ event: "order.paid", payload: {} });
            const sig = makeWebhookSignature(body, "webhook-secret-for-hmac");
            const result = await ctx.payment.handleWebhook({
                rawBody: body,
                signature: sig,
                secret: "webhook-secret-for-hmac",
                userRepo: ctx.userRepo,
                paymentRepo: ctx.paymentRepo,
            });
            expect(result.handled).toBe(true);
        });
    });

    describe("verifyPayment returns updated user", () => {
        it("returns updated user and payment", async () => {
            const { userRepo, paymentRepo, payment } = await load();
            const u = await userRepo.create({
                phone: "9876543210",
                paymentStatus: "pending",
            });
            await paymentRepo.create({
                userId: String(u._id),
                paymentId: "pay_1",
                orderId: "order_1",
                amount: 149900,
                currency: "INR",
                status: "created",
                source: "razorpay",
            });
            const sig = makeCheckoutSignature({
                orderId: "order_1",
                paymentId: "pay_1",
                secret: "test-secret-for-hmac",
            });

            const result = await payment.verifyPayment({
                paymentId: "pay_1",
                orderId: "order_1",
                signature: sig,
                secret: "test-secret-for-hmac",
                userRepo,
                paymentRepo,
            });
            const reloaded = await userRepo.findByPhone("9876543210");
            expect(reloaded?.paymentStatus).toBe("completed");
            expect(result.user.paymentStatus).toBe("completed");
        });
    });
});
