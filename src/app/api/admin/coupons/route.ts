import { z } from "zod";
import Coupon from "@/models/Coupon";
import { buildCrudRoutes } from "@/lib/adminCrud";

const schema = z.object({
    code: z
        .string()
        .min(1)
        .max(40)
        .transform((v) => v.toUpperCase()),
    description: z.string().max(500).optional(),
    type: z.enum(["flat", "percent"]).default("percent"),
    amount: z.number().min(0).max(100000),
    usageLimit: z.number().int().min(0).default(0),
    minOrderAmount: z.number().min(0).optional(),
    active: z.boolean().default(true),
    expiresAt: z.string().datetime().optional().nullable(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { list, create } = buildCrudRoutes(() => Coupon, schema, {
    searchFields: ["code", "description"],
});
export { list as GET, create as POST };
