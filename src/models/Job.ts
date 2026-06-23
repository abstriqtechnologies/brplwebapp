import mongoose, { Schema, Model, Document } from "mongoose";

export interface IJob extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    department: string;
    location: string;
    type: "full-time" | "part-time" | "contract" | "internship";
    description: string;
    requirements?: string;
    applyBy?: Date;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
    {
        title: { type: String, required: true, trim: true },
        department: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["full-time", "part-time", "contract", "internship"],
            default: "full-time",
        },
        description: { type: String, required: true },
        requirements: { type: String },
        applyBy: { type: Date },
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const Job: Model<IJob> =
    (mongoose.models.Job as Model<IJob>) || mongoose.model<IJob>("Job", JobSchema);

export default Job;