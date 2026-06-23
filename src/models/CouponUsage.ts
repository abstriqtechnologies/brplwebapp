import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICouponUsage extends Document {
    _id: mongoose.Types.ObjectId;
    couponId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    code: string;
    discountApplied: number;
    orderId?: string;
    usedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
    {
        couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        code: { type: String, required: true, index: true },
        discountApplied: { type: Number, required: true },
        orderId: { type: String },
        usedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

const CouponUsage: Model<ICouponUsage> =
    (mongoose.models.CouponUsage as Model<ICouponUsage>) ||
    mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);

export default CouponUsage;
