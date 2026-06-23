import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;

        await connectDB();
        const [paidCount, unpaidCount, revenueAgg] = await Promise.all([
            User.countDocuments({ paymentStatus: "completed" }),
            User.countDocuments({ paymentStatus: { $ne: "completed" } }),
            Payment.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
        ]);

        const totalRevenue = revenueAgg?.[0]?.total ?? 0;

        return ok({
            stats: {
                paidCount,
                unpaidCount,
                totalRevenue,
                totalUsers: paidCount + unpaidCount,
            },
        });
    } catch (err) {
        return serverError(err);
    }
}
