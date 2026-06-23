import mongoose, { Schema, Model, Document } from "mongoose";

export const SITE_PAGE_KEYS = [
    "about-us",
    "teams",
    "career",
    "contact-us",
    "events-page",
    "partners",
    "registration-page",
    "types-of-partners",
    "blog-index",
    "news-index",
    "privacy-page",
    "terms-page",
    "rule-book",
    "faqs-page",
] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface ISitePage extends Document {
    _id: mongoose.Types.ObjectId;
    key: SitePageKey;
    title: string;
    subtitle?: string;
    body?: string;
    heroImage?: string;
    heroImageMobile?: string;
    ctaText?: string;
    ctaLink?: string;
    meta?: Record<string, any>;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
}

const SitePageSchema = new Schema<ISitePage>(
    {
        key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        title: { type: String, required: true },
        subtitle: { type: String },
        body: { type: String },
        heroImage: { type: String },
        heroImageMobile: { type: String },
        ctaText: { type: String },
        ctaLink: { type: String },
        meta: { type: Schema.Types.Mixed },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const SitePage: Model<ISitePage> =
    (mongoose.models.SitePage as Model<ISitePage>) ||
    mongoose.model<ISitePage>("SitePage", SitePageSchema);

export default SitePage;
