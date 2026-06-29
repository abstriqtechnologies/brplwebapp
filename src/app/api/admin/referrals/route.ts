/**
 * `/api/admin/referrals` — admin CRUD list/create for referral links.
 *
 * A referral owns an underlying coupon code so checkout can reuse the
 * existing coupon validation, payment, coupon count, and user attribution
 * flows.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Coupon from "@/models/Coupon";
import Payment from "@/models/Payment";
import Referral from "@/models/Referral";
import User from "@/models/User";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ConflictError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const listQuerySchema = z.object({
    search: z.string().trim().max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

const createSchema = z
    .object({
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(6).max(20),
        code: z.string().trim().max(40).optional(),
        type: z.enum(["flat", "percent"]),
        amount: z.number().int().min(0),
        usageLimit: z.number().int().min(0).default(0),
        active: z.boolean().default(true),
        expiresAt: z.string().datetime().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "percent" && data.amount > 100) {
            ctx.addIssue({
                code: "custom",
                path: ["amount"],
                message: "percent discount cannot exceed 100",
            });
        }
    });

type ReferralDoc = {
    _id: unknown;
    name: string;
    phone: string;
    code: string;
    couponId: unknown;
    couponCode: string;
    type: "flat" | "percent";
    amount: number;
    usageLimit: number;
    active: boolean;
    expiresAt?: Date | null;
    linkOpenCount: number;
    lastOpenedAt?: Date | null;
    createdAt: Date;
};

function normalizeCode(input: string | undefined, name: string): string {
    const fallback = `REF-${name}-${Date.now().toString(36)}`;
    const raw = (input?.trim() || fallback).toUpperCase();
    const code = raw
        .replace(/[^A-Z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    return code.length >= 2 ? code : `REF-${Date.now().toString(36).toUpperCase()}`;
}

function referralDescription(name: string, phone: string): string {
    return `Referral: ${name} (${phone})`;
}

async function serializeReferrals(referrals: ReferralDoc[]) {
    const codes = referrals.map((ref) => ref.couponCode);

    const [userStats, paymentStats] =
        codes.length === 0
            ? [[], []]
            : await Promise.all([
                  User.aggregate([
                      { $match: { couponCode: { $in: codes }, paymentStatus: "completed" } },
                      { $group: { _id: "$couponCode", registrations: { $sum: 1 } } },
                  ]),
                  Payment.aggregate([
                      { $match: { couponCode: { $in: codes }, status: "completed" } },
                      { $group: { _id: "$couponCode", revenuePaise: { $sum: "$amount" } } },
                  ]),
              ]);

    const registrationsByCode = new Map<string, number>(
        userStats.map((row: { _id: string; registrations: number }) => [row._id, row.registrations]),
    );
    const revenueByCode = new Map<string, number>(
        paymentStats.map((row: { _id: string; revenuePaise: number }) => [row._id, row.revenuePaise]),
    );

    return referrals.map((ref) => ({
        id: String(ref._id),
        name: ref.name,
        phone: ref.phone,
        code: ref.code,
        couponId: String(ref.couponId),
        couponCode: ref.couponCode,
        type: ref.type,
        amount: ref.amount,
        usageLimit: ref.usageLimit,
        active: ref.active,
        expiresAt: ref.expiresAt ? ref.expiresAt.toISOString() : null,
        linkOpenCount: ref.linkOpenCount ?? 0,
        lastOpenedAt: ref.lastOpenedAt ? ref.lastOpenedAt.toISOString() : null,
        registrations: registrationsByCode.get(ref.couponCode) ?? 0,
        revenue: Math.round(((revenueByCode.get(ref.couponCode) ?? 0) / 100) * 100) / 100,
        createdAt: ref.createdAt.toISOString(),
    }));
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const url = new URL(req.url);
        const parsed = listQuerySchema.safeParse({
            search: url.searchParams.get("search") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            pageSize: url.searchParams.get("pageSize") ?? undefined,
        });
        if (!parsed.success) throw new BadRequestError("Invalid query");
        const { search, page, pageSize } = parsed.data;

        const query: Record<string, unknown> = {};
        if (search?.trim()) {
            const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
            query.$or = [{ name: regex }, { phone: regex }, { code: regex }, { couponCode: regex }];
        }

        const [referrals, total] = await Promise.all([
            Referral.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Referral.countDocuments(query),
        ]);

        return ok({
            referrals: await serializeReferrals(referrals as unknown as ReferralDoc[]),
            total,
            page,
            pageSize,
        });
    }),
);

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;
        const code = normalizeCode(data.code, data.name);

        try {
            const coupon = await Coupon.create({
                code,
                description: referralDescription(data.name, data.phone),
                type: data.type,
                amount: data.amount,
                usageLimit: data.usageLimit,
                usedCount: 0,
                active: data.active,
                source: "referral",
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            });

            const referral = await Referral.create({
                name: data.name,
                phone: data.phone,
                code,
                couponId: coupon._id,
                couponCode: coupon.code,
                type: data.type,
                amount: data.amount,
                usageLimit: data.usageLimit,
                active: data.active,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            });

            const [serialized] = await serializeReferrals([referral.toObject() as ReferralDoc]);
            return ok({ referral: serialized });
        } catch (err) {
            const e = err as { code?: number };
            if (e?.code === 11000) {
                throw new ConflictError(`Referral code "${code}" already exists`);
            }
            throw err;
        }
    }),
);

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
