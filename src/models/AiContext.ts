// src/models/AiContext.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAiContext extends Document {
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AiContextSchema = new Schema<IAiContext>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.AiContext ||
  mongoose.model<IAiContext>("AiContext", AiContextSchema);
