import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICampaign extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    qrCodeUrl: string;
    targetUrl?: string;
    hits: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        description: { type: String },
        qrCodeUrl: { type: String, required: true },
        targetUrl: { type: String },
        hits: { type: Number, default: 0 },
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const Campaign: Model<ICampaign> =
    (mongoose.models.Campaign as Model<ICampaign>) ||
    mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;