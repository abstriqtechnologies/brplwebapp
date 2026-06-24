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
    // MongoDB's TTL monitor uses the indexed `expiresAt` field; the
    // expireAfterSeconds option is set on the explicit index() call below
    // to avoid duplicate-index warnings.
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpRecordSchema.index({ phone: 1, verified: 1, createdAt: -1 });

const OtpRecord: Model<IOtpRecord> =
    (mongoose.models.OtpRecord as Model<IOtpRecord>) || mongoose.model<IOtpRecord>("OtpRecord", OtpRecordSchema);

export default OtpRecord;
