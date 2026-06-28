/**
 * `/api/admin/coupons` — admin CRUD for coupon codes.
 *
 *   GET  /api/admin/coupons?search=&page=&pageSize=
 *   POST /api/admin/coupons
 *
 * Auth: any admin with role >= subadmin (superadmin or subadmin).
 * seo_content role is rejected by the middleware.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ConflictError } from "@/lib/api/errors";
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

const listQuerySchema = z.object({
    search: z.string().trim().max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(15),
});

const createSchema = z
    .object({
        code: z.string().trim().min(2).max(40),
        description: z.string().trim().max(200).optional(),
        type: z.enum(["flat", "percent"]),
        amount: z.number().int().min(0),
        usageLimit: z.number().int().min(0).default(0),
        minOrderAmount: z.number().int().min(0).optional(),
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

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin", "subadmin"],
    })(async ({ req }) => {
        const url = new URL(req.url);
        const parsed = listQuerySchema.safeParse({
            search: url.searchParams.get("search") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            pageSize: url.searchParams.get("pageSize") ?? undefined,
        });
        if (!parsed.success) throw new BadRequestError("Invalid query");
        const { search, page, pageSize } = parsed.data;

        const repo = new MongooseCouponRepo();
        const [coupons, total] = await Promise.all([
            repo.list({ limit: pageSize, skip: (page - 1) * pageSize, search }),
            repo.count(search),
        ]);

        return ok({
            coupons: coupons.map((c) => ({
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
            })),
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
        allowedRoles: ["superadmin", "subadmin"],
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", {
                details: parsed.error.issues,
            });
        }
        const data = parsed.data;

        const repo = new MongooseCouponRepo();
        try {
            const coupon = await repo.create({
                code: data.code,
                description: data.description,
                type: data.type,
                amount: data.amount,
                usageLimit: data.usageLimit,
                usedCount: 0,
                minOrderAmount: data.minOrderAmount,
                active: data.active,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            });
            return ok({
                coupon: {
                    id: String(coupon._id),
                    code: coupon.code,
                    description: coupon.description ?? "",
                    type: coupon.type,
                    amount: coupon.amount,
                    usageLimit: coupon.usageLimit,
                    usedCount: coupon.usedCount,
                    minOrderAmount: coupon.minOrderAmount ?? null,
                    active: coupon.active,
                    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
                    createdAt: coupon.createdAt.toISOString(),
                },
            });
        } catch (err) {
            // Mongoose duplicate-key error code is 11000.
            const e = err as { code?: number };
            if (e?.code === 11000) {
                throw new ConflictError(`Coupon code "${data.code.toUpperCase()}" already exists`);
            }
            throw err;
        }
    }),
);