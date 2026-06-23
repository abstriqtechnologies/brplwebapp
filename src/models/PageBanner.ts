import mongoose, { Schema, Model, Document } from "mongoose";

export interface IPageBanner extends Document {
    _id: mongoose.Types.ObjectId;
    key: string; // unique key e.g. 'about-us', 'privacy-policy'
    title?: string;
    subtitle?: string;
    image?: string;
    imageMobile?: string;
    ctaText?: string;
    ctaLink?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PageBannerSchema = new Schema<IPageBanner>(
    {
        key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        title: { type: String },
        subtitle: { type: String },
        image: { type: String },
        imageMobile: { type: String },
        ctaText: { type: String },
        ctaLink: { type: String },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const PageBanner: Model<IPageBanner> =
    (mongoose.models.PageBanner as Model<IPageBanner>) ||
    mongoose.model<IPageBanner>("PageBanner", PageBannerSchema);

export default PageBanner;