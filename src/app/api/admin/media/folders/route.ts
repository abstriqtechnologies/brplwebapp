import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        const folders = await Media.distinct("folder", { folder: { $nin: [null, ""] } });
        return ok(folders.filter((f): f is string => typeof f === "string" && f.length > 0).sort());
    } catch (err) {
        return serverError(err);
    }
}
