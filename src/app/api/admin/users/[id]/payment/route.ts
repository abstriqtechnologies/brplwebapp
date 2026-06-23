import { z } from "zod";
import { requireAdminDb, ok, notFound, serverError } from "@/lib/adminApi";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    paymentId: z.string().min(1).max(200),
    paymentAmount: z.number().nonnegative().max(1000000),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound("Invalid user id");

        const json = await req.json().catch(() => ({}));
        const parsed = schema.safeParse({
            ...json,
            paymentAmount: typeof json.paymentAmount === "string" ? Number(json.paymentAmount) : json.paymentAmount,
        });
        if (!parsed.success) {
            return ok({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
        }

        await connectDB();
        const user = await User.findById(params.id);
        if (!user) return notFound("User not found");

        const wasPaid = user.paymentStatus === "completed";

        user.paymentStatus = "completed";
        user.paymentId = parsed.data.paymentId;
        user.amount = parsed.data.paymentAmount;
        await user.save();

        if (!wasPaid) {
            await Payment.create({
                userId: user._id,
                paymentId: parsed.data.paymentId,
                amount: parsed.data.paymentAmount,
                currency: "INR",
                status: "completed",
                source: "manual",
            });
        }

        return ok({ success: true, user: { ...user.toObject(), _id: user._id.toString() } });
    } catch (err) {
        return serverError(err);
    }
}
