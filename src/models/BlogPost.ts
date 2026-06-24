import mongoose, { Schema, Model, Document } from "mongoose";

export interface IBlogPost extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    heroImage?: string;
    // Public-API aliases — admin can populate either set of fields.
    featuredImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    enableSchema?: boolean;
    isPublished?: boolean;
    tags?: string[];
    authorName?: string;
    authorImage?: string;
    publishedAt?: Date;
    draft: boolean;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        excerpt: { type: String },
        content: { type: String, required: true },
        heroImage: { type: String },
        featuredImage: { type: String },
        metaTitle: { type: String, default: "" },
        metaDescription: { type: String, default: "" },
        enableSchema: { type: Boolean, default: true },
        isPublished: { type: Boolean, default: true },
        tags: [{ type: String }],
        authorName: { type: String },
        authorImage: { type: String },
        publishedAt: { type: Date, index: true },
        draft: { type: Boolean, default: true, index: true },
        views: { type: Number, default: 0 },
    },
    { timestamps: true }
);

BlogPostSchema.index({ isPublished: 1, publishedAt: -1 });

const BlogPost: Model<IBlogPost> =
    (mongoose.models.BlogPost as Model<IBlogPost>) ||
    mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);

export default BlogPost;
