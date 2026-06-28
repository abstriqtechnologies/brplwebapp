// src/models/AiLead.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IConversationMessage {
  role: "user" | "ai";
  message: string;
  timestamp: Date;
}

export interface IAiLead extends Document {
  name: string;
  phone: string;
  conversation: IConversationMessage[];
  status: "active" | "resolved" | "escalated";
  ticketId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AiLeadSchema = new Schema<IAiLead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    conversation: [ConversationMessageSchema],
    status: {
      type: String,
      enum: ["active", "resolved", "escalated"],
      default: "active",
    },
    ticketId: { type: Schema.Types.ObjectId, ref: "AiTicket" },
  },
  { timestamps: true }
);

AiLeadSchema.index({ phone: 1 });
AiLeadSchema.index({ status: 1 });

export default mongoose.models.AiLead ||
  mongoose.model<IAiLead>("AiLead", AiLeadSchema);
