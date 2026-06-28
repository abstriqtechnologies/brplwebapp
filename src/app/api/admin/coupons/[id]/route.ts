/**
 * `/api/admin/coupons/[id]` — single-coupon admin operations.
 *
 *   PATCH  /api/admin/coupons/[id]   — partial update
 *   DELETE /api/admin/coupons/[id]   — hard delete
 *
 * Auth: superadmin.
 *
 * NOTE: `withRequest` doesn't forward Next.js route params, so we extract
 * `id` from the URL path here. This matches the rest of the
 * `withRequest`-wrapped routes in the codebase.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { MongooseCouponRepo } from "@/lib/infra/db/mongoose-repos";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

/** Pull the last non-empty path segment (the dynamic id) from the request URL. */
function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

const patchSchema = z
    .object({
        code: z.string().trim().min(2).max(40).optional(),
        description: z.string().trim().max(200).nullable().optional(),
        type: z.enum(["flat", "percent"]).optional(),
        amount: z.number().int().min(0).optional(),
        usageLimit: z.number().int().min(0).optional(),
        minOrderAmount: z.number().int().min(0).nullable().optional(),
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

function serializeCoupon(c: {
    _id: unknown;
    code: string;
    description?: string;
    type: string;
    amount: number;
    usageLimit: number;
    usedCount: number;
    minOrderAmount?: number | null;
    active: boolean;
    expiresAt?: Date | null;
    createdAt: Date;
}) {
    return {
        id: String(c._id),
        code: c.code,
        description: c.description ?? "",
        type: c.type,
        amount: c.amount,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        minOrderAmount: c.minOrderAmount ?? null,
        active: c.active,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
    };
}

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }
        const data = parsed.data;

        // Translate JSON-friendly fields into the shapes the repo expects.
        const patch: Record<string, unknown> = { ...data };
        if (data.expiresAt !== undefined) {
            patch.expiresAt = data.expiresAt === null ? undefined : new Date(data.expiresAt);
        }
        if (data.minOrderAmount === null) {
            patch.minOrderAmount = undefined;
        }

        const repo = new MongooseCouponRepo();
        try {
            const updated = await repo.update(extractId(req), patch as never);
            if (!updated) throw new NotFoundError("Coupon not found");
            return ok({ coupon: serializeCoupon(updated) });
        } catch (err) {
            const e = err as { code?: number; status?: number };
            if (e?.code === 11000) {
                throw new ConflictError("Coupon code already in use");
            }
            if (e?.status) throw err; // re-throw our own AppErrors
            throw err;
        }
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const repo = new MongooseCouponRepo();
        const deleted = await repo.remove(extractId(req));
        if (!deleted) throw new NotFoundError("Coupon not found");
        return ok({ deleted: true });
    }),
);
