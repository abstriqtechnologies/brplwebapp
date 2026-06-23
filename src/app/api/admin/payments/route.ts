import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const status = searchParams.get("status") || "";

        await connectDB();
        const query: Record<string, unknown> = {};
        if (status) query.status = status;

        const [items, total, summary] = await Promise.all([
            Payment.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("userId", "name email phone")
                .lean(),
            Payment.countDocuments(query),
            Payment.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),
        ]);

        return ok({
            items: items.map((p: any) => ({
                ...p,
                _id: p._id.toString(),
                userId: p.userId
                    ? { ...p.userId, _id: p.userId._id.toString() }
                    : null,
            })),
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
            summary: {
                totalAmount: summary?.[0]?.total ?? 0,
                totalCount: summary?.[0]?.count ?? 0,
            },
        });
    } catch (err) {
        return serverError(err);
    }
}