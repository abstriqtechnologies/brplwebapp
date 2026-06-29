/**
 * `/api/admin/referrals/[id]` — update or retire a referral link.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Coupon from "@/models/Coupon";
import Referral from "@/models/Referral";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

const patchSchema = z
    .object({
        name: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().min(6).max(20).optional(),
        type: z.enum(["flat", "percent"]).optional(),
        amount: z.number().int().min(0).optional(),
        usageLimit: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "percent" && typeof data.amount === "number" && data.amount > 100) {
            ctx.addIssue({
                code: "custom",
                path: ["amount"],
                message: "percent discount cannot exceed 100",
            });
        }
    });

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        const id = extractId(req);
        const existing = await Referral.findById(id).lean();
        if (!existing) throw new NotFoundError("Referral not found");

        const data = parsed.data;
        const referralPatch: Record<string, unknown> = { ...data };
        const couponPatch: Record<string, unknown> = {};

        if (data.name !== undefined) referralPatch.name = data.name;
        if (data.phone !== undefined) referralPatch.phone = data.phone;
        if (data.type !== undefined) couponPatch.type = data.type;
        if (data.amount !== undefined) couponPatch.amount = data.amount;
        if (data.usageLimit !== undefined) couponPatch.usageLimit = data.usageLimit;
        if (data.active !== undefined) couponPatch.active = data.active;
        if (data.expiresAt !== undefined) {
            const expiresAt = data.expiresAt === null ? undefined : new Date(data.expiresAt);
            referralPatch.expiresAt = expiresAt;
            couponPatch.expiresAt = expiresAt;
        }
        if (data.name !== undefined || data.phone !== undefined) {
            couponPatch.description = `Referral: ${data.name ?? existing.name} (${data.phone ?? existing.phone})`;
        }

        if (Object.keys(couponPatch).length > 0) {
            await Coupon.findByIdAndUpdate(existing.couponId, couponPatch);
        }

        const updated = await Referral.findByIdAndUpdate(id, referralPatch, { returnDocument: "after" }).lean();
        if (!updated) throw new NotFoundError("Referral not found");

        return ok({
            referral: {
                id: String(updated._id),
                name: updated.name,
                phone: updated.phone,
                code: updated.code,
                couponId: String(updated.couponId),
                couponCode: updated.couponCode,
                type: updated.type,
                amount: updated.amount,
                usageLimit: updated.usageLimit,
                active: updated.active,
                expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
                linkOpenCount: updated.linkOpenCount ?? 0,
                lastOpenedAt: updated.lastOpenedAt ? updated.lastOpenedAt.toISOString() : null,
                createdAt: updated.createdAt.toISOString(),
            },
        });
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        await connectDB();
        const deleted = await Referral.findByIdAndDelete(extractId(req)).lean();
        if (!deleted) throw new NotFoundError("Referral not found");

        await Coupon.findByIdAndUpdate(deleted.couponId, { active: false });
        return ok({ deleted: true });
    }),
);
