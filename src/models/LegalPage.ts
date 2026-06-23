import mongoose, { Schema, Model, Document } from "mongoose";

export interface ILegalPage extends Document {
    _id: mongoose.Types.ObjectId;
    type: "privacy" | "terms" | "rulebook";
    title: string;
    content: string; // HTML or markdown
    version: string;
    effectiveDate?: Date;
    updatedAt: Date;
    createdAt: Date;
}

const LegalPageSchema = new Schema<ILegalPage>(
    {
        type: { type: String, enum: ["privacy", "terms", "rulebook"], required: true, unique: true, index: true },
        title: { type: String, required: true },
        content: { type: String, required: true, default: "" },
        version: { type: String, default: "1.0" },
        effectiveDate: { type: Date },
    },
    { timestamps: true }
);

const LegalPage: Model<ILegalPage> =
    (mongoose.models.LegalPage as Model<ILegalPage>) ||
    mongoose.model<ILegalPage>("LegalPage", LegalPageSchema);

export default LegalPage;