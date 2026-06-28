import mongoose, { Schema, Model, Document } from "mongoose";

export const ADMIN_ROLES = ["superadmin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface IAdminUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: AdminRole;
    active: boolean;
    /**
     * 10-digit Indian mobile used by the SMS-OTP login flow. Unique + sparse
     * so legacy admins (no phone) don't collide on the index. The bootstrap
     * stamps the phone from ADMIN_PHONES on first send-otp call.
     */
    phone?: string;
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
        role: { type: String, enum: ADMIN_ROLES, default: "superadmin", index: true },
        active: { type: Boolean, default: true },
        phone: { type: String, required: false, unique: true, sparse: true, index: true, match: /^\d{10}$/ },
        totpSecret: { type: String },
        totpEnabled: { type: Boolean, default: false },
    },
    { timestamps: true },
);

const AdminUser: Model<IAdminUser> =
    (mongoose.models.AdminUser as Model<IAdminUser>) || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
