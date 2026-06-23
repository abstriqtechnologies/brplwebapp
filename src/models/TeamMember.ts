import mongoose, { Schema, Model, Document } from "mongoose";

export interface ITeamMember extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    role: string;
    image?: string;
    bio?: string;
    department?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
    order: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
    {
        name: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        image: { type: String },
        bio: { type: String },
        department: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const TeamMember: Model<ITeamMember> =
    (mongoose.models.TeamMember as Model<ITeamMember>) ||
    mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);

export default TeamMember;