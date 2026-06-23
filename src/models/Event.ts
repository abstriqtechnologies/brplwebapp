import mongoose, { Schema, Model, Document } from "mongoose";

export interface IEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    description?: string;
    content?: string;
    image?: string;
    venue?: string;
    city?: string;
    state?: string;
    startDate: Date;
    endDate?: Date;
    status: "upcoming" | "live" | "completed" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        description: { type: String, trim: true },
        content: { type: String },
        image: { type: String },
        venue: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        startDate: { type: Date, required: true, index: true },
        endDate: { type: Date },
        status: {
            type: String,
            enum: ["upcoming", "live", "completed", "cancelled"],
            default: "upcoming",
            index: true,
        },
    },
    { timestamps: true }
);

const Event: Model<IEvent> =
    (mongoose.models.Event as Model<IEvent>) || mongoose.model<IEvent>("Event", EventSchema);

export default Event;