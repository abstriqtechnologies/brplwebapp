import mongoose, { Schema, Model, Document } from "mongoose";

export interface IFAQ extends Document {
    _id: mongoose.Types.ObjectId;
    question: string;
    answer: string;
    category: string;
    order: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>(
    {
        question: { type: String, required: true, trim: true },
        answer: { type: String, required: true },
        category: { type: String, default: "general", index: true },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const FAQ: Model<IFAQ> =
    (mongoose.models.FAQ as Model<IFAQ>) || mongoose.model<IFAQ>("FAQ", FAQSchema);

export default FAQ;