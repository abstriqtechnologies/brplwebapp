/**
 * Mongoose-backed implementations of the repository interfaces.
 *
 * These are the production versions. The in-memory variants in `repos.ts`
 * are for tests. Service code depends only on the interfaces, not on
 * either implementation.
 */

import "server-only";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import OtpRecord from "@/models/OtpRecord";
import Payment from "@/models/Payment";
import Media from "@/models/Media";
import AdminUser from "@/models/AdminUser";
import type { IUser } from "@/models/User";
import type { IOtpRecord } from "@/models/OtpRecord";
import type { IPayment } from "@/models/Payment";
import type { IMedia } from "@/models/Media";
import type { IAdminUser } from "@/models/AdminUser";
import type {
    UserRepo,
    CreateUserInput,
    UpdateUserInput,
    OtpRepo,
    CreateOtpInput,
    PaymentRepo,
    CreatePaymentInput,
    MediaRepo,
    CreateMediaInput,
    AdminRepo,
    CreateAdminInput,
} from "./repos";

function idToString(id: unknown): string {
    if (typeof id === "string") return id;
    if (id && typeof (id as any).toString === "function") return (id as any).toString();
    return String(id);
}

// ---------- MongooseUserRepo ----------

export class MongooseUserRepo implements UserRepo {
    async findById(id: string): Promise<IUser | null> {
        await connectDB();
        return (await User.findById(id).lean()) as IUser | null;
    }
    async findByPhone(phone: string): Promise<IUser | null> {
        await connectDB();
        return (await User.findOne({ phone }).lean()) as IUser | null;
    }
    async create(data: CreateUserInput): Promise<IUser> {
        await connectDB();
        const doc = await User.create(data);
        return doc.toObject() as IUser;
    }
    async update(id: string, data: UpdateUserInput): Promise<IUser | null> {
        await connectDB();
        const doc = await User.findByIdAndUpdate(id, data, { new: true }).lean();
        return (doc as IUser | null) ?? null;
    }
    async updateByPhone(phone: string, data: UpdateUserInput): Promise<IUser | null> {
        await connectDB();
        const doc = await User.findOneAndUpdate({ phone }, data, { new: true }).lean();
        return (doc as IUser | null) ?? null;
    }
}

// ---------- MongooseOtpRepo ----------

export class MongooseOtpRepo implements OtpRepo {
    async findLatest(phone: string): Promise<IOtpRecord | null> {
        await connectDB();
        return (await OtpRecord.findOne({ phone, verified: false })
            .sort({ createdAt: -1 })
            .lean()) as IOtpRecord | null;
    }
    async create(data: CreateOtpInput): Promise<IOtpRecord> {
        await connectDB();
        const doc = await OtpRecord.create({ ...data, attempts: 0, verified: false });
        return doc.toObject() as IOtpRecord;
    }
    async markVerified(id: string): Promise<IOtpRecord | null> {
        await connectDB();
        const doc = await OtpRecord.findByIdAndUpdate(id, { verified: true }, { new: true }).lean();
        return (doc as IOtpRecord | null) ?? null;
    }
    async cleanupExpired(): Promise<void> {
        await connectDB();
        // The TTL index on `expiresAt` handles this automatically in Mongo.
        // This method exists for the in-memory repo + future manual sweeps.
    }
}

// ---------- MongoosePaymentRepo ----------

export class MongoosePaymentRepo implements PaymentRepo {
    async findByPaymentId(paymentId: string): Promise<IPayment | null> {
        await connectDB();
        return (await Payment.findOne({ paymentId }).lean()) as IPayment | null;
    }
    async findByOrderId(orderId: string): Promise<IPayment | null> {
        await connectDB();
        return (await Payment.findOne({ orderId }).lean()) as IPayment | null;
    }
    async findByUserId(userId: string): Promise<IPayment[]> {
        await connectDB();
        return (await Payment.find({ userId }).lean()) as unknown as IPayment[];
    }
    async create(data: CreatePaymentInput): Promise<IPayment> {
        await connectDB();
        const doc = await Payment.create(data);
        return doc.toObject() as IPayment;
    }
    async updateStatus(paymentId: string, status: CreatePaymentInput["status"]): Promise<IPayment | null> {
        await connectDB();
        const doc = await Payment.findOneAndUpdate({ paymentId }, { status }, { new: true }).lean();
        return (doc as IPayment | null) ?? null;
    }
}

// ---------- MongooseMediaRepo ----------

export class MongooseMediaRepo implements MediaRepo {
    async findById(id: string): Promise<IMedia | null> {
        await connectDB();
        return (await Media.findById(id).lean()) as IMedia | null;
    }
    async findMany(query: { folder?: string; search?: string; limit?: number; skip?: number }): Promise<IMedia[]> {
        await connectDB();
        const q: Record<string, unknown> = {};
        if (query.folder) q.folder = query.folder;
        if (query.search) {
            q.originalName = { $regex: query.search, $options: "i" };
        }
        const items = await Media.find(q)
            .sort({ createdAt: -1 })
            .skip(query.skip ?? 0)
            .limit(query.limit ?? 50)
            .lean();
        return items as unknown as IMedia[];
    }
    async listFolders(): Promise<string[]> {
        await connectDB();
        const folders = await Media.distinct("folder", { folder: { $ne: null } });
        return folders as string[];
    }
    async create(data: CreateMediaInput): Promise<IMedia> {
        await connectDB();
        const doc = await Media.create(data);
        return doc.toObject() as IMedia;
    }
    async update(id: string, data: Partial<CreateMediaInput>): Promise<IMedia | null> {
        await connectDB();
        const doc = await Media.findByIdAndUpdate(id, data, { new: true }).lean();
        return (doc as IMedia | null) ?? null;
    }
    async delete(id: string): Promise<boolean> {
        await connectDB();
        const res = await Media.findByIdAndDelete(id);
        return !!res;
    }
}

// ---------- MongooseAdminRepo ----------

export class MongooseAdminRepo implements AdminRepo {
    async findById(id: string): Promise<IAdminUser | null> {
        await connectDB();
        return (await AdminUser.findById(id).lean()) as IAdminUser | null;
    }
    async findByEmail(email: string): Promise<IAdminUser | null> {
        await connectDB();
        return (await AdminUser.findOne({ email: email.toLowerCase() }).lean()) as IAdminUser | null;
    }
    async create(data: CreateAdminInput): Promise<IAdminUser> {
        await connectDB();
        const doc = await AdminUser.create({
            ...data,
            email: data.email.toLowerCase(),
            active: data.active ?? true,
            totpEnabled: data.totpEnabled ?? false,
        });
        return doc.toObject() as IAdminUser;
    }
    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await connectDB();
        await AdminUser.findByIdAndUpdate(id, { passwordHash });
    }
    async setActive(id: string, active: boolean): Promise<void> {
        await connectDB();
        await AdminUser.findByIdAndUpdate(id, { active });
    }
    async existsByEmail(email: string): Promise<boolean> {
        await connectDB();
        const found = await AdminUser.findOne({ email: email.toLowerCase() }).select("_id").lean();
        return !!found;
    }
}
