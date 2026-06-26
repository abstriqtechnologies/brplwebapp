/**
 * POST /api/payment/redeem-coupon
 *
 * Two modes:
 *   - ?dryRun=1 (default for the "Apply" button): validates without
 *     consuming. Returns { valid, discount, finalAmount, reason? }.
 *   - default (no dryRun): consumes the coupon and creates a Payment
 *     record with source="coupon", then marks the user as paid and
 *     re-issues the auth cookie with paid:true.
 *
 * Auth: accepts either a pending cookie (new user) or an auth cookie
 * with paid:false (returning unpaid user). For pending sessions in
 * consume mode, the route will look up the user by phone and create
 * the User record on the fly when the coupon fully covers the fee
 * (new-user + 100% coupon flow).
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifyPending, verifyAuth } from "@/lib/auth/crypto";
import { cookies } from "next/headers";
import { COOKIE_NAMES, setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";
import { signAuth } from "@/lib/auth/crypto";
import {
    validateCoupon,
    redeemCoupon as redeemCouponService,
} from "@/lib/domain/coupon/service";
import {
    MongooseUserRepo,
    MongoosePaymentRepo,
    MongooseCouponRepo,
} from "@/lib/infra/db/mongoose-repos";
import { connectDB } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    code: z.string().min(1).max(64),
    orderAmountRupees: z.number().int().min(0).max(100_000),
    // Profile fields — required only when the request comes from a
    // pending-cookie session and no User record exists yet. For an
    // existing-user redeem, all are ignored.
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().max(120).optional(),
    role: z.enum(["batsman", "bowler", "allrounder", "wicketkeeper"]).optional(),
    state: z.string().trim().min(2).max(60).optional(),
    city: z.string().trim().min(2).max(60).optional(),
});

async function readSession(): Promise<
    | { kind: "pending"; phone: string }
    | { kind: "auth"; userId: string; phone: string; paid: false }
> {
    const c = await cookies();
    const authToken = c.get(COOKIE_NAMES.AUTH)?.value;
    const pendingToken = c.get(COOKIE_NAMES.PENDING)?.value;

    if (authToken) {
        const payload = await verifyAuth(authToken);
        if (payload && payload.paid === false && payload.sub && payload.phone) {
            return {
                kind: "auth",
                userId: payload.sub,
                phone: payload.phone,
                paid: false as const,
            };
        }
    }
    if (pendingToken) {
        const payload = await verifyPending(pendingToken);
        if (payload?.phone) return { kind: "pending", phone: payload.phone };
    }
    throw new Error("Authentication required");
}

export async function POST(req: NextRequest) {
    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", issues: parsed.error.issues },
            { status: 400 },
        );
    }
    const { code, orderAmountRupees, name, email, role, state, city } = parsed.data;

    let session;
    try {
        session = await readSession();
    } catch {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const couponRepo = new MongooseCouponRepo();

    if (dryRun) {
        const result = await validateCoupon({
            code,
            orderAmountRupees,
            couponRepo,
        });
        return NextResponse.json(result);
    }

    // Consume mode.
    await connectDB();

    // Resolve a User from the session. For pending sessions, the User
    // record may not exist yet (new user + 100% coupon), so we create
    // it inline using the profile fields supplied in the body.
    const userRepo = new MongooseUserRepo();
    let userId: string;
    let userPhone: string;

    if (session.kind === "pending") {
        userPhone = session.phone;
        let user = await userRepo.findByPhone(userPhone);
        if (!user) {
            if (!name || !email || !role || !state || !city) {
                return NextResponse.json(
                    { error: "Profile required to redeem coupon for new user" },
                    { status: 400 },
                );
            }
            user = await userRepo.create({
                phone: userPhone,
                name,
                email: email.toLowerCase(),
                role,
                state,
                city,
                paymentStatus: "completed",
                paymentId: "",
                orderId: "",
                amount: 0,
            } as any);
        } else if (name && email && role && state && city) {
            // User record already exists — a createOrder pre-creation stub,
            // an earlier webhook fallback, or a re-entry. Enrich it with
            // the profile fields before marking paid below.
            const enriched = await userRepo.update(String(user._id), {
                name,
                email: email.toLowerCase(),
                role,
                state,
                city,
            });
            if (!enriched) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            user = enriched;
        }
        userId = String(user!._id);
    } else {
        userId = session.userId;
        userPhone = session.phone;
    }

    const result = await redeemCouponService({
        code,
        userId,
        orderAmountRupees,
        couponRepo,
    });

    // Record a Payment row with source="coupon" so the existing admin
    // dashboards and analytics keep working.
    const paymentRepo = new MongoosePaymentRepo();
    const orderId = `coupon_${Date.now()}_${result.couponId.slice(-6)}`;
    await paymentRepo.create({
        userId,
        paymentId: orderId,
        orderId,
        amount: 0, // free via coupon
        currency: "INR",
        status: "completed",
        source: "coupon",
    });

    // Mark user paid + re-issue auth cookie with paid:true.
    const updated = await userRepo.update(userId, {
        paymentStatus: "completed",
        paymentId: orderId,
        orderId,
        amount: 0,
    });
    if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = await signAuth({
        sub: userId,
        phone: userPhone,
        paid: true,
    });
    await setAuthCookie(token);
    await clearPendingCookie();

    logger.info("coupon.redeemed", {
        userId,
        code: result.code,
        discount: result.discount,
        fromPending: session.kind === "pending",
    });

    return NextResponse.json({
        success: true,
        discount: result.discount,
        finalAmount: result.finalAmount,
        redirect: "/dashboard",
    });
}
