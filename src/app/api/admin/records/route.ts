import { requireAdminDb, ok, fail, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paginated list of users.
 *   ?type=paid|unpaid|users
 *   ?page=1&limit=10
 *   ?search=
 *   ?startDate=&endDate=
 *   ?source=  (unused; kept for BRPL compat)
 */
export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        const { searchParams } = new URL(req.url);
        const type = (searchParams.get("type") || "users") as "paid" | "unpaid" | "users";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
        const search = (searchParams.get("search") || "").trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        await connectDB();
        const query: Record<string, unknown> = {};
        if (type === "paid") query.paymentStatus = "completed";
        if (type === "unpaid") query.paymentStatus = { $ne: "completed" };

        if (search) {
            const rx = new RegExp(escapeRegex(search), "i");
            query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { city: rx }, { state: rx }];
        }
        if (startDate || endDate) {
            const createdAt: Record<string, Date> = {};
            if (startDate) createdAt.$gte = new Date(startDate);
            if (endDate) createdAt.$lte = new Date(endDate);
            query.createdAt = createdAt;
        }

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        return ok({
            type,
            items: items.map((u) => ({
                ...u,
                _id: u._id.toString(),
                videoCount: 0,
                isPaid: u.paymentStatus === "completed",
                paymentAmount: u.amount ?? 1499,
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

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
