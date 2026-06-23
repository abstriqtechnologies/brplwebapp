import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns last 6 months of registration + revenue counts.
 * Output: [{ name: "Jan", users: 12, revenue: 2400 }, ...]
 */
export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        await connectDB();
        const now = new Date();
        const months: { key: string; label: string; start: Date; end: Date }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            months.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                label: d.toLocaleString("en-US", { month: "short" }),
                start,
                end,
            });
        }

        const data = await Promise.all(
            months.map(async (m) => {
                const [users, revenueAgg] = await Promise.all([
                    User.countDocuments({ createdAt: { $gte: m.start, $lt: m.end } }),
                    Payment.aggregate([
                        {
                            $match: {
                                status: "completed",
                                createdAt: { $gte: m.start, $lt: m.end },
                            },
                        },
                        { $group: { _id: null, total: { $sum: "$amount" } } },
                    ]),
                ]);
                return {
                    name: m.label,
                    users,
                    revenue: revenueAgg?.[0]?.total ?? 0,
                };
            })
        );

        return ok(data);
    } catch (err) {
        return serverError(err);
    }
}
