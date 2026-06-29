/**
 * `/api/admin/players` — list users (players) from the MongoDB `User`
 * collection. Returns a compact projection suitable for the admin
 * players table.
 */

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Coupon from "@/models/Coupon";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser from "@/models/AdminUser";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

export type AdminPlayer = {
    id: string;
    name: string;
    phone: string;
    role: string;
    city: string;
    state: string;
    paymentStatus: "pending" | "completed" | "—";
    Trial_status: "pending" | "completed";
    couponCode: string;
    couponSource: "manual" | "referral" | null;
    couponDiscount: number | null;
    registrationDate: string; // ISO 8601, derived from createdAt
};

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async () => {
        await connectDB();
        const docs = await User.find(
            {},
            {
                name: 1,
                phone: 1,
                role: 1,
                city: 1,
                state: 1,
                paymentStatus: 1,
                Trial_status: 1,
                couponCode: 1,
                couponDiscount: 1,
                createdAt: 1,
            },
        )
            .sort({ createdAt: -1 })
            .lean();

        const couponCodes = Array.from(
            new Set(docs.map((d) => d.couponCode?.trim()).filter((code): code is string => Boolean(code))),
        );
        const coupons =
            couponCodes.length > 0
                ? await Coupon.find({ code: { $in: couponCodes } }, { code: 1, source: 1, description: 1 }).lean()
                : [];
        const couponSourceByCode = new Map<string, "manual" | "referral">(
            coupons.map((coupon) => {
                const source =
                    coupon.source === "referral" || /^Referral:/i.test(coupon.description ?? "")
                        ? "referral"
                        : "manual";
                return [coupon.code, source];
            }),
        );

        const players: AdminPlayer[] = docs.map((d) => ({
            id: String(d._id),
            name: d.name?.trim() || "—",
            phone: d.phone || "—",
            role: d.role?.trim() || "—",
            city: d.city?.trim() || "—",
            state: d.state?.trim() || "—",
            paymentStatus: (d.paymentStatus as "pending" | "completed") || "—",
            Trial_status: (d.Trial_status as "pending" | "completed") || "pending",
            couponCode: d.couponCode?.trim() || "—",
            couponSource: d.couponCode ? (couponSourceByCode.get(d.couponCode.trim()) ?? null) : null,
            couponDiscount: typeof d.couponDiscount === "number" ? d.couponDiscount : null,
            registrationDate:
                d.createdAt instanceof Date
                    ? d.createdAt.toISOString()
                    : new Date(d.createdAt as unknown as string | number).toISOString(),
        }));

        return ok({ players });
    }),
);
