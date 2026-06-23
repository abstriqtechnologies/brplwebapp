import { connectDB } from "@/lib/mongodb";
import CouponUsage from "@/models/CouponUsage";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

        await connectDB();
        const [items, total] = await Promise.all([
            CouponUsage.find({})
                .sort({ usedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("userId", "name email phone")
                .populate("couponId", "code type amount")
                .lean(),
            CouponUsage.countDocuments({}),
        ]);

        return ok({
            items: items.map((u: any) => ({
                ...u,
                _id: u._id.toString(),
                userId: u.userId ? { ...u.userId, _id: u.userId._id.toString() } : null,
                couponId: u.couponId ? { ...u.couponId, _id: u.couponId._id.toString() } : null,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (err) {
        return serverError(err);
    }
}