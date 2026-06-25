/**
 * Repository interfaces — abstract, DB-agnostic data access.
 *
 * Services depend on these interfaces, not on Mongoose directly. Two
 * implementations exist:
 *   - `MongooseXxxRepo` (production) — talks to MongoDB.
 *   - `InMemoryXxxRepo` (tests) — pure JS, lets us unit-test services
 *     without a database.
 *
 * Each repo exposes the minimal set of queries the services need — nothing
 * more. If a service wants something new, we add it here first, then
 * implement it in both repos.
 */

import type { Document } from "mongoose";
import type { IUser } from "@/models/User";
import type { IAdminUser } from "@/models/AdminUser";
import type { IOtpRecord } from "@/models/OtpRecord";
import type { IPayment } from "@/models/Payment";
import type { ICoupon } from "@/models/Coupon";
import type { ICouponUsage } from "@/models/CouponUsage";
import type { IMedia } from "@/models/Media";

// ---------- UserRepo ----------

export type CreateUserInput = Omit<IUser, "_id" | "createdAt" | "updatedAt">;
export type UpdateUserInput = Partial<Omit<IUser, "_id" | "createdAt" | "updatedAt">>;

export interface UserRepo {
    findById(id: string): Promise<IUser | null>;
    findByPhone(phone: string): Promise<IUser | null>;
    create(data: CreateUserInput): Promise<IUser>;
    update(id: string, data: UpdateUserInput): Promise<IUser | null>;
    updateByPhone(phone: string, data: UpdateUserInput): Promise<IUser | null>;
}

// ---------- AdminRepo ----------

export type CreateAdminInput = {
    email: string;
    passwordHash: string;
    name: string;
    role: "superadmin" | "subadmin" | "seo_content";
    active?: boolean;
    totpSecret?: string;
    totpEnabled?: boolean;
};

export interface AdminRepo {
    findById(id: string): Promise<IAdminUser | null>;
    findByEmail(email: string): Promise<IAdminUser | null>;
    create(data: CreateAdminInput): Promise<IAdminUser>;
    updatePassword(id: string, passwordHash: string): Promise<void>;
    setActive(id: string, active: boolean): Promise<void>;
    existsByEmail(email: string): Promise<boolean>;
}

// ---------- OtpRepo ----------

export type CreateOtpInput = {
    phone: string;
    otp: string;
    expiresAt: Date;
};

export interface OtpRepo {
    /** Most-recent unverified OTP for a phone. */
    findLatest(phone: string): Promise<IOtpRecord | null>;
    create(data: CreateOtpInput): Promise<IOtpRecord>;
    /** Mark the OTP as verified; returns the updated record or null. */
    markVerified(id: string): Promise<IOtpRecord | null>;
    /** Delete expired OTPs. No-op for in-memory. */
    cleanupExpired(): Promise<void>;
}

// ---------- PaymentRepo ----------

export type CreatePaymentInput = {
    userId: string;
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: "created" | "completed" | "failed" | "refunded";
    source: "razorpay" | "manual" | "coupon";
};

export interface PaymentRepo {
    findByPaymentId(paymentId: string): Promise<IPayment | null>;
    findByOrderId(orderId: string): Promise<IPayment | null>;
    findByUserId(userId: string): Promise<IPayment[]>;
    create(data: CreatePaymentInput): Promise<IPayment>;
    updateStatus(paymentId: string, status: CreatePaymentInput["status"]): Promise<IPayment | null>;
}

// ---------- MediaRepo ----------

export type CreateMediaInput = {
    url: string;
    kind: "image" | "video";
    folder?: string;
    originalName?: string;
    uploadedBy?: string;
    mimeType?: string;
    size?: number;
    webpUrl?: string;
};

export interface MediaRepo {
    findById(id: string): Promise<IMedia | null>;
    findMany(query: { folder?: string; search?: string; limit?: number; skip?: number }): Promise<IMedia[]>;
    listFolders(): Promise<string[]>;
    create(data: CreateMediaInput): Promise<IMedia>;
    update(id: string, data: Partial<CreateMediaInput>): Promise<IMedia | null>;
    delete(id: string): Promise<boolean>;
}

// ---------- CouponRepo (for future payment work) ----------

export type CreateCouponInput = Omit<ICoupon, "_id" | "createdAt" | "updatedAt" | keyof Document>;
export type CreateCouponUsageInput = Omit<
    ICouponUsage,
    "_id" | "createdAt" | "updatedAt" | keyof Document
>;

export interface CouponRepo {
    findByCode(code: string): Promise<ICoupon | null>;
    findById(id: string): Promise<ICoupon | null>;
    incrementUsage(couponId: string): Promise<ICoupon | null>;
    createUsage(data: CreateCouponUsageInput): Promise<ICouponUsage>;
    /** Returns the existing usage if this user has already redeemed this coupon. */
    findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null>;
    listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]>;
}

// ---------- In-memory implementations (for tests + dev) ----------

import { randomUUID } from "crypto";

function nowIso(): string {
    return new Date().toISOString();
}

function idLike(): string {
    return randomUUID();
}

type AnyDoc = { _id: string; createdAt?: Date; updatedAt?: Date };

export class InMemoryUserRepo implements UserRepo {
    private items: (IUser & { _id: string; createdAt: Date; updatedAt: Date })[] = [];

    async findById(id: string): Promise<IUser | null> {
        return this.items.find((u) => String(u._id) === id) ?? null;
    }
    async findByPhone(phone: string): Promise<IUser | null> {
        return this.items.find((u) => u.phone === phone) ?? null;
    }
    async create(data: CreateUserInput): Promise<IUser> {
        const doc = {
            ...data,
            _id: idLike() as unknown as IUser["_id"],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as unknown as IUser & { _id: string; createdAt: Date; updatedAt: Date };
        this.items.push(doc);
        return doc;
    }
    async update(id: string, data: UpdateUserInput): Promise<IUser | null> {
        const idx = this.items.findIndex((u) => String(u._id) === id);
        if (idx === -1) return null;
        this.items[idx] = {
            ...this.items[idx],
            ...data,
            updatedAt: new Date(),
        } as unknown as (typeof this.items)[number];
        return this.items[idx];
    }
    async updateByPhone(phone: string, data: UpdateUserInput): Promise<IUser | null> {
        const idx = this.items.findIndex((u) => u.phone === phone);
        if (idx === -1) return null;
        this.items[idx] = {
            ...this.items[idx],
            ...data,
            updatedAt: new Date(),
        } as unknown as (typeof this.items)[number];
        return this.items[idx];
    }
    // Test helpers
    _all(): IUser[] {
        return [...this.items];
    }
    _clear(): void {
        this.items = [];
    }
}

export class InMemoryAdminRepo implements AdminRepo {
    private items: (IAdminUser & { _id: string; createdAt?: Date; updatedAt?: Date })[] = [];

    async findById(id: string): Promise<IAdminUser | null> {
        return this.items.find((a) => String(a._id) === id) ?? null;
    }
    async findByEmail(email: string): Promise<IAdminUser | null> {
        return this.items.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
    }
    async create(data: CreateAdminInput): Promise<IAdminUser> {
        const doc = {
            ...data,
            active: data.active ?? true,
            totpEnabled: data.totpEnabled ?? false,
            _id: idLike(),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as IAdminUser & { _id: string };
        this.items.push(doc);
        return doc;
    }
    async updatePassword(id: string, passwordHash: string): Promise<void> {
        const a = this.items.find((x) => String(x._id) === id);
        if (a) {
            a.passwordHash = passwordHash;
            a.updatedAt = new Date();
        }
    }
    async setActive(id: string, active: boolean): Promise<void> {
        const a = this.items.find((x) => String(x._id) === id);
        if (a) {
            a.active = active;
            a.updatedAt = new Date();
        }
    }
    async existsByEmail(email: string): Promise<boolean> {
        return !!(await this.findByEmail(email));
    }
    _clear(): void {
        this.items = [];
    }
}

export class InMemoryOtpRepo implements OtpRepo {
    private items: (IOtpRecord & { _id: string })[] = [];

    async findLatest(phone: string): Promise<IOtpRecord | null> {
        const matches = this.items
            .filter((o) => o.phone === phone && !o.verified)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return matches[0] ?? null;
    }
    async create(data: CreateOtpInput): Promise<IOtpRecord> {
        const doc = {
            ...data,
            verified: false,
            attempts: 0,
            _id: idLike(),
            createdAt: new Date(),
        } as IOtpRecord & { _id: string };
        this.items.push(doc);
        return doc;
    }
    async markVerified(id: string): Promise<IOtpRecord | null> {
        const o = this.items.find((x) => x._id === id);
        if (!o) return null;
        o.verified = true;
        return o;
    }
    async cleanupExpired(): Promise<void> {
        const now = new Date();
        this.items = this.items.filter((o) => o.expiresAt > now);
    }
    _clear(): void {
        this.items = [];
    }
}

export class InMemoryPaymentRepo implements PaymentRepo {
    private items: (IPayment & { _id: string })[] = [];

    async findByPaymentId(paymentId: string): Promise<IPayment | null> {
        return this.items.find((p) => p.paymentId === paymentId) ?? null;
    }
    async findByOrderId(orderId: string): Promise<IPayment | null> {
        return this.items.find((p) => p.orderId === orderId) ?? null;
    }
    async findByUserId(userId: string): Promise<IPayment[]> {
        return this.items.filter((p) => String(p.userId) === userId);
    }
    async create(data: CreatePaymentInput): Promise<IPayment> {
        const doc = {
            ...data,
            _id: idLike(),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as IPayment & { _id: string };
        this.items.push(doc);
        return doc;
    }
    async updateStatus(paymentId: string, status: CreatePaymentInput["status"]): Promise<IPayment | null> {
        const p = this.items.find((x) => x.paymentId === paymentId);
        if (!p) return null;
        p.status = status;
        p.updatedAt = new Date();
        return p;
    }
    _all(): IPayment[] {
        return [...this.items];
    }
    _clear(): void {
        this.items = [];
    }
}

export class InMemoryMediaRepo implements MediaRepo {
    private items: (IMedia & { _id: string })[] = [];

    async findById(id: string): Promise<IMedia | null> {
        return this.items.find((m) => String(m._id) === id) ?? null;
    }
    async findMany(query: { folder?: string; search?: string; limit?: number; skip?: number }): Promise<IMedia[]> {
        let r = [...this.items];
        if (query.folder) r = r.filter((m) => m.folder === query.folder);
        if (query.search) {
            const q = query.search.toLowerCase();
            r = r.filter((m) => m.originalName?.toLowerCase().includes(q));
        }
        r.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return r.slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? 50));
    }
    async listFolders(): Promise<string[]> {
        return [...new Set(this.items.map((m) => m.folder).filter((f): f is string => !!f))];
    }
    async create(data: CreateMediaInput): Promise<IMedia> {
        const doc = {
            ...data,
            _id: idLike(),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as IMedia & { _id: string };
        this.items.push(doc);
        return doc;
    }
    async update(id: string, data: Partial<CreateMediaInput>): Promise<IMedia | null> {
        const m = this.items.find((x) => String(x._id) === id);
        if (!m) return null;
        Object.assign(m, data);
        m.updatedAt = new Date();
        return m;
    }
    async delete(id: string): Promise<boolean> {
        const i = this.items.findIndex((m) => String(m._id) === id);
        if (i === -1) return false;
        this.items.splice(i, 1);
        return true;
    }
    _clear(): void {
        this.items = [];
    }
}

export class InMemoryCouponRepo implements CouponRepo {
    private coupons: (ICoupon & { _id: string; createdAt: Date; updatedAt: Date })[] = [];
    private usages: (ICouponUsage & { _id: string })[] = [];

    private normalize(code: string): string {
        return code.trim().toUpperCase();
    }

    async findByCode(code: string): Promise<ICoupon | null> {
        const norm = this.normalize(code);
        return this.coupons.find((c) => c.code === norm) ?? null;
    }
    async findById(id: string): Promise<ICoupon | null> {
        return this.coupons.find((c) => String(c._id) === id) ?? null;
    }
    async create(data: CreateCouponInput): Promise<ICoupon> {
        const doc = {
            ...data,
            code: this.normalize(data.code),
            usedCount: data.usedCount ?? 0,
            active: data.active ?? true,
            _id: idLike() as unknown as ICoupon["_id"],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as unknown as ICoupon & { _id: string; createdAt: Date; updatedAt: Date };
        this.coupons.push(doc);
        return doc;
    }
    async incrementUsage(couponId: string): Promise<ICoupon | null> {
        const idx = this.coupons.findIndex((c) => String(c._id) === couponId);
        if (idx === -1) return null;
        Object.assign(this.coupons[idx], {
            usedCount: this.coupons[idx].usedCount + 1,
            updatedAt: new Date(),
        });
        return this.coupons[idx];
    }
    async createUsage(data: CreateCouponUsageInput): Promise<ICouponUsage> {
        const doc = {
            ...data,
            usedAt: data.usedAt ?? new Date(),
            _id: idLike(),
        } as ICouponUsage & { _id: string };
        this.usages.push(doc);
        return doc;
    }
    async findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null> {
        return (
            this.usages.find(
                (u) => String(u.couponId) === couponId && String(u.userId) === userId,
            ) ?? null
        );
    }
    async listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]> {
        return this.usages
            .filter((u) => String(u.couponId) === couponId)
            .slice(skip, skip + limit);
    }
    _clear(): void {
        this.coupons = [];
        this.usages = [];
    }
}
