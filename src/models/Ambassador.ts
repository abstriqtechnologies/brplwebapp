import mongoose, { Schema, Model, Document } from "mongoose";

export interface IAmbassador extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    image?: string;
    bio?: string;
    designation?: string;
    city?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    active: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const AmbassadorSchema = new Schema<IAmbassador>(
    {
        name: { type: String, required: true, trim: true },
        image: { type: String },
        bio: { type: String },
        designation: { type: String, trim: true },
        city: { type: String, trim: true },
        instagram: { type: String, trim: true },
        twitter: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        active: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Ambassador: Model<IAmbassador> =
    (mongoose.models.Ambassador as Model<IAmbassador>) ||
    mongoose.model<IAmbassador>("Ambassador", AmbassadorSchema);

export default Ambassador;