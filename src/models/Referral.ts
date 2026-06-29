import mongoose, { Schema, Model, Document } from "mongoose";

export interface IReferral extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    code: string;
    couponId: mongoose.Types.ObjectId | string;
    couponCode: string;
    type: "flat" | "percent";
    amount: number;
    usageLimit: number;
    active: boolean;
    expiresAt?: Date;
    linkOpenCount: number;
    lastOpenedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
    {
        name: { type: String, required: true, trim: true, index: true },
        phone: { type: String, required: true, trim: true, index: true },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
        couponCode: { type: String, required: true, uppercase: true, trim: true, index: true },
        type: { type: String, enum: ["flat", "percent"], default: "percent" },
        amount: { type: Number, required: true, min: 0 },
        usageLimit: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
        expiresAt: { type: Date },
        linkOpenCount: { type: Number, default: 0 },
        lastOpenedAt: { type: Date },
    },
    { timestamps: true },
);

const Referral: Model<IReferral> =
    (mongoose.models.Referral as Model<IReferral>) || mongoose.model<IReferral>("Referral", ReferralSchema);

export default Referral;
