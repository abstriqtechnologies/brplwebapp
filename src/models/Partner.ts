import mongoose, { Schema, Model, Document } from "mongoose";

export interface IPartner extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    type: "title" | "broadcasting" | "sponsor" | "associate" | "media";
    logo?: string;
    website?: string;
    description?: string;
    status: "new" | "approved" | "rejected" | "active";
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    message?: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
    {
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["title", "broadcasting", "sponsor", "associate", "media"],
            default: "sponsor",
            index: true,
        },
        logo: { type: String },
        website: { type: String, trim: true },
        description: { type: String },
        status: {
            type: String,
            enum: ["new", "approved", "rejected", "active"],
            default: "new",
            index: true,
        },
        contactName: { type: String, trim: true },
        contactEmail: { type: String, trim: true, lowercase: true },
        contactPhone: { type: String, trim: true },
        message: { type: String },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Partner: Model<IPartner> =
    (mongoose.models.Partner as Model<IPartner>) || mongoose.model<IPartner>("Partner", PartnerSchema);

export default Partner;