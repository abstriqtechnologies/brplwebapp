import mongoose, { Schema, Model, Document } from "mongoose";

export interface IContactLead extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    phone?: string;
    subject?: string;
    message: string;
    source: "contact-form" | "partner-form" | "press" | "general";
    status: "new" | "read" | "replied" | "archived";
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContactLeadSchema = new Schema<IContactLead>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        subject: { type: String, trim: true },
        message: { type: String, required: true },
        source: {
            type: String,
            enum: ["contact-form", "partner-form", "press", "general"],
            default: "contact-form",
            index: true,
        },
        status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new", index: true },
        notes: { type: String },
    },
    { timestamps: true }
);

const ContactLead: Model<IContactLead> =
    (mongoose.models.ContactLead as Model<IContactLead>) ||
    mongoose.model<IContactLead>("ContactLead", ContactLeadSchema);

export default ContactLead;