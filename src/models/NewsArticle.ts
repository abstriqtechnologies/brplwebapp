import mongoose, { Schema, Model, Document } from "mongoose";

export interface INewsArticle extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    summary?: string;
    content: string;
    heroImage?: string;
    source?: string;
    sourceUrl?: string;
    tags?: string[];
    publishedAt?: Date;
    draft: boolean;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}

const NewsArticleSchema = new Schema<INewsArticle>(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        summary: { type: String },
        content: { type: String, required: true },
        heroImage: { type: String },
        source: { type: String },
        sourceUrl: { type: String },
        tags: [{ type: String }],
        publishedAt: { type: Date, index: true },
        draft: { type: Boolean, default: true, index: true },
        views: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const NewsArticle: Model<INewsArticle> =
    (mongoose.models.NewsArticle as Model<INewsArticle>) ||
    mongoose.model<INewsArticle>("NewsArticle", NewsArticleSchema);

export default NewsArticle;