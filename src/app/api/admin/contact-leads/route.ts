import { connectDB } from "@/lib/mongodb";
import ContactLead from "@/models/ContactLead";
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
        const status = searchParams.get("status") || "";

        await connectDB();
        const query: Record<string, unknown> = {};
        if (status) query.status = status;

        const [items, total] = await Promise.all([
            ContactLead.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ContactLead.countDocuments(query),
        ]);

        return ok({
            items: items.map((l) => ({ ...l, _id: l._id.toString() })),
            pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
        });
    } catch (err) {
        return serverError(err);
    }
}