import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISeoMeta extends Document {
    _id: mongoose.Types.ObjectId;
    path: string; // e.g. '/about-us'
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
    ogType?: string;
    twitterCard?: string;
    canonical?: string;
    robots?: string;
    updatedAt: Date;
    createdAt: Date;
}

const SeoMetaSchema = new Schema<ISeoMeta>(
    {
        path: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        keywords: { type: String },
        ogImage: { type: String },
        ogType: { type: String, default: "website" },
        twitterCard: { type: String, default: "summary_large_image" },
        canonical: { type: String },
        robots: { type: String, default: "index, follow" },
    },
    { timestamps: true }
);

const SeoMeta: Model<ISeoMeta> =
    (mongoose.models.SeoMeta as Model<ISeoMeta>) || mongoose.model<ISeoMeta>("SeoMeta", SeoMetaSchema);

export default SeoMeta;