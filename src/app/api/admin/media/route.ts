import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        const { searchParams } = new URL(req.url);
        const folder = searchParams.get("folder") || undefined;
        const kind = searchParams.get("kind") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(96, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

        const query: Record<string, unknown> = {};
        if (folder) query.folder = folder;
        if (kind === "image" || kind === "video") query.kind = kind;
        if (search) query.$or = [
            { originalName: { $regex: escapeRegex(search), $options: "i" } },
            { folder: { $regex: escapeRegex(search), $options: "i" } },
            { tags: { $regex: escapeRegex(search), $options: "i" } },
        ];

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Media.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Media.countDocuments(query),
        ]);

        return ok({
            items: items.map((m) => ({
                ...m,
                _id: m._id.toString(),
                webpUrl: m.kind === "image" && m.url ? m.url.replace(/\.[^.]+$/, ".webp") : undefined,
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

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
