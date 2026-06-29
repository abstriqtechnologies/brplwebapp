import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICoupon extends Document {
    _id: mongoose.Types.ObjectId;
    code: string;
    description?: string;
    type: "flat" | "percent";
    amount: number; // for flat: rupees; for percent: 1-100
    usageLimit: number;
    usedCount: number;
    minOrderAmount?: number;
    active: boolean;
    source?: "manual" | "referral";
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        description: { type: String, trim: true },
        type: { type: String, enum: ["flat", "percent"], default: "percent" },
        amount: { type: Number, required: true, min: 0 },
        usageLimit: { type: Number, default: 0 }, // 0 = unlimited
        usedCount: { type: Number, default: 0 },
        minOrderAmount: { type: Number },
        active: { type: Boolean, default: true },
        source: { type: String, enum: ["manual", "referral"], default: "manual", index: true },
        expiresAt: { type: Date },
    },
    { timestamps: true },
);

const Coupon: Model<ICoupon> =
    (mongoose.models.Coupon as Model<ICoupon>) || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
