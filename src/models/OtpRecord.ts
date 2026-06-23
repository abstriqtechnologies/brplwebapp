import mongoose, { Schema, Model, Document } from "mongoose";

export interface IOtpRecord extends Document {
    _id: mongoose.Types.ObjectId;
    phone: string; // 10 digits
    otp: string;
    expiresAt: Date;
    attempts: number;
    verified: boolean;
    createdAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>({
    phone: { type: String, required: true, index: true, match: /^\d{10}$/ },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 }, // TTL index — Mongo will auto-delete
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Index for the TTL — MongoDB will auto-delete documents when expiresAt is in the past
OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpRecord: Model<IOtpRecord> =
    (mongoose.models.OtpRecord as Model<IOtpRecord>) || mongoose.model<IOtpRecord>("OtpRecord", OtpRecordSchema);

export default OtpRecord;
