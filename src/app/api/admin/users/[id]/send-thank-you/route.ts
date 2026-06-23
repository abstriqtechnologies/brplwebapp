import { requireAdminDb, ok, notFound, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-mode thank-you email trigger. Real implementation would call into
 * a transactional email provider (e.g. Resend/SES). For now we log and
 * return success.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        await connectDB();
        const user = await User.findById(params.id).lean();
        if (!user) return notFound("User not found");
        if (user.paymentStatus !== "completed") {
            return ok({ sent: false, message: "User has not completed payment" });
        }
        if (!user.email) {
            return ok({ sent: false, message: "No email on file" });
        }

        console.info(`[admin] Thank-you email → ${user.email} (user ${user._id})`);
        return ok({ sent: true });
    } catch (err) {
        return serverError(err);
    }
}
