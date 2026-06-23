import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal CSV export. Real XLSX would use a library like `exceljs`.
 * CSV is universally importable by Excel/Sheets and avoids a new dep.
 */
export async function GET(req: Request) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        const { searchParams } = new URL(req.url);
        const type = (searchParams.get("type") || "users") as "paid" | "unpaid" | "users";
        const search = (searchParams.get("search") || "").trim();
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        await connectDB();
        const query: Record<string, unknown> = {};
        if (type === "paid") query.paymentStatus = "completed";
        if (type === "unpaid") query.paymentStatus = { $ne: "completed" };
        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { city: rx }];
        }
        if (startDate || endDate) {
            const createdAt: Record<string, Date> = {};
            if (startDate) createdAt.$gte = new Date(startDate);
            if (endDate) createdAt.$lte = new Date(endDate);
            query.createdAt = createdAt;
        }

        const users = await User.find(query).sort({ createdAt: -1 }).lean();

        const header = [
            "Name",
            "Email",
            "Phone",
            "Role",
            "State",
            "City",
            "Payment Status",
            "Payment ID",
            "Amount",
            "Created At",
        ];
        const rows = users.map((u) => [
            u.name || "",
            u.email || "",
            u.phone || "",
            u.role || "",
            u.state || "",
            u.city || "",
            u.paymentStatus,
            u.paymentId || "",
            String(u.amount ?? 0),
            u.createdAt ? new Date(u.createdAt).toISOString() : "",
        ]);

        const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
        const csv = [header, ...rows]
            .map((r) => r.map(escape).join(","))
            .join("\r\n");

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="BRPL-Users-${type}-${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv"`,
            },
        });
    } catch (err) {
        return serverError(err);
    }
}
