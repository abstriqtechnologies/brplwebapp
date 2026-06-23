import mongoose, { Schema, Model, Document } from "mongoose";
import { USER_ROLES, type UserRole } from "@/lib/roles";

// Re-export for backwards compatibility — server-only consumers can keep using "@/models/User"
export { USER_ROLES, type UserRole };

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    phone: string; // 10 digits
    name?: string;
    email?: string;
    role?: UserRole;
    state?: string;
    city?: string;
    paymentStatus: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        phone: { type: String, required: true, unique: true, index: true, match: /^\d{10}$/ },
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        role: { type: String, enum: USER_ROLES },
        state: { type: String, trim: true },
        city: { type: String, trim: true },
        paymentStatus: { type: String, enum: ["pending", "completed"], default: "pending", index: true },
        paymentId: { type: String },
        orderId: { type: String, index: true },
        amount: { type: Number },
    },
    { timestamps: true }
);

const User: Model<IUser> = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
export default User;
