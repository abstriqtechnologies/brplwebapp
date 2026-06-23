import mongoose, { Schema, Model, Document } from "mongoose";

export const ADMIN_ROLES = ["superadmin", "subadmin", "seo_content"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface IAdminUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: AdminRole;
    active: boolean;
    totpSecret?: string;
    totpEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
    {
        email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        role: { type: String, enum: ADMIN_ROLES, default: "subadmin", index: true },
        active: { type: Boolean, default: true },
        totpSecret: { type: String },
        totpEnabled: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const AdminUser: Model<IAdminUser> =
    (mongoose.models.AdminUser as Model<IAdminUser>) ||
    mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
