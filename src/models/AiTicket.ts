// src/models/AiTicket.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAiTicket extends Document {
  leadId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  issue: string;
  status: "open" | "resolved";
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiTicketSchema = new Schema<IAiTicket>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "AiLead" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    issue: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true }
);

AiTicketSchema.index({ status: 1 });

export default mongoose.models.AiTicket ||
  mongoose.model<IAiTicket>("AiTicket", AiTicketSchema);
