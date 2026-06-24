import mongoose, { Schema, Model, Document } from "mongoose";

export type MediaKind = "image" | "video";

export interface IMedia extends Document {
    _id: mongoose.Types.ObjectId;
    url: string;
    originalName: string;
    mime: string;
    kind: MediaKind;
    size: number;
    width?: number;
    height?: number;
    durationSec?: number;
    folder?: string;
    tags: string[];
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
    {
        url: { type: String, required: true, unique: true, index: true },
        originalName: { type: String, required: true },
        mime: { type: String, required: true },
        kind: { type: String, enum: ["image", "video"], required: true, index: true },
        size: { type: Number, required: true },
        width: { type: Number },
        height: { type: Number },
        durationSec: { type: Number },
        folder: { type: String, index: true },
        tags: { type: [String], default: [] },
        uploadedBy: { type: String, required: true },
    },
    { timestamps: true }
);

// Compound indexes for the library's filter+sort patterns
MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ kind: 1, createdAt: -1 });
// Text index for filename search
MediaSchema.index({ originalName: "text" });

const Media: Model<IMedia> =
    (mongoose.models.Media as Model<IMedia>) ||
    mongoose.model<IMedia>("Media", MediaSchema);

export default Media;