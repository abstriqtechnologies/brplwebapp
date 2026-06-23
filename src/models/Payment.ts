import mongoose, { Schema, Model, Document } from "mongoose";

export interface IPayment extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId | string;
    paymentId: string;
    orderId?: string;
    amount: number;
    currency: string;
    status: "created" | "completed" | "failed" | "refunded";
    source: "razorpay" | "manual" | "coupon";
    method?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        paymentId: { type: String, required: true, index: true },
        orderId: { type: String, index: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        status: {
            type: String,
            enum: ["created", "completed", "failed", "refunded"],
            default: "completed",
            index: true,
        },
        source: { type: String, enum: ["razorpay", "manual", "coupon"], default: "razorpay" },
        method: { type: String },
    },
    { timestamps: true }
);

const Payment: Model<IPayment> =
    (mongoose.models.Payment as Model<IPayment>) || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
