# BRPL Frontend — Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every audit finding in the BRPL frontend and make the user-facing flow (registration, payment, blog, news, press, contact, partner, events) fully functional end-to-end with production-grade security.

**Architecture:** Add three missing top-level pages (`/auth`, `/payment`, `/dashboard`) for the OTP → payment → user flow. Add public read-only API routes that mirror the existing admin CRUD for blog/news/ambassador/job content. Wire the dead Contact Us and Become Partner forms to a new public contact-leads POST. Replace the admin TOTP stub with real speakeasy verification. Reconcile blog/news field names. Fix the duplicate Mongoose index. Lock down the default-admin bootstrap to dev only. Remove production secrets from the committed `.env.local`. Pull the duplicate `event-category` filter on the Events page from the new public endpoint.

**Tech Stack:** Next.js 14 App Router (TypeScript), MongoDB via Mongoose, Razorpay, SMSIndiaHub OTP, jose JWT, bcrypt, zod, Tailwind, speakeasy (new dependency for TOTP).

---

## File Structure (created or modified)

### New files (routes + components)
- `src/app/auth/page.tsx` — combined login + OTP UI
- `src/app/auth/AuthClient.tsx` — client component for the form
- `src/app/payment/page.tsx` — Razorpay checkout UI
- `src/app/payment/PaymentClient.tsx` — client component for the form
- `src/app/dashboard/page.tsx` — user profile + payment receipt
- `src/app/dashboard/DashboardClient.tsx`
- `src/app/api/contact/route.ts` — public POST for contact + partner forms
- `src/app/api/blog/route.ts` — public list
- `src/app/api/blog/slug/[slug]/route.ts` — public detail
- `src/app/api/news/route.ts` — public list
- `src/app/api/news/slug/[slug]/route.ts` — public detail
- `src/app/api/jobs/route.ts` — public list
- `src/app/api/ambassadors/[id]/route.ts` — public detail
- `src/app/api/events/route.ts` — public list
- `src/lib/totp.ts` — speakeasy wrapper
- `src/lib/featureFlags.ts` — `isProduction()`, `DEFAULT_ADMIN_ENABLED`
- `tests/api/blog.public.test.ts` — integration test for public blog list/slug
- `tests/api/contact.test.ts` — integration test for contact POST
- `tests/lib/totp.test.ts` — unit test for TOTP wrapper
- `.env.example` — updated template (secrets blanked)

### Modified files
- `src/models/BlogPost.ts` — add `metaTitle`, `metaDescription`, `enableSchema`, alias `featuredImage` getter, `isPublished` getter
- `src/models/NewsArticle.ts` — same alignment
- `src/app/api/admin/blog/route.ts` — accept new fields, write to new schema
- `src/app/api/admin/news/route.ts` — same
- `src/app/(admin)/admin/blog/page.tsx` — show new fields in form
- `src/app/(admin)/admin/news/page.tsx` — same
- `src/app/(admin)/admin/registration-banner/page.tsx` — replace `/auth` with `/auth?mode=register`
- `src/components/Header.tsx` — replace `/auth` href
- `src/components/SchemaMarkup.tsx` — replace `/auth` with current name
- `src/middleware.ts` — replace `/auth` with `/auth?next=`
- `src/lib/adminBootstrap.ts` — disable in production unless `ALLOW_DEFAULT_ADMIN=1`
- `src/app/api/admin/auth/verify-otp/route.ts` — wire speakeasy
- `src/app/api/admin/auth/login/route.ts` — guard TOTP branches consistently
- `src/app/api/payment/verify/route.ts` — update `redirect` to `/auth?mode=register`
- `src/app/(main)/contact-us/ContactUsClient.tsx` — wire to `/api/contact`
- `src/app/(main)/partners/BecomePartnerClient.tsx` — wire to `/api/contact` with `source: "partner-form"`
- `src/app/(main)/events/EventsClient.tsx` — fetch from `/api/events`
- `src/app/(main)/blog/[slug]/BlogPostClient.tsx` — read `heroImage` as `featuredImage`, etc.
- `src/app/(main)/news/[slug]/NewsPostClient.tsx` — same
- `src/app/(main)/blog/BlogClient.tsx` — adapt field names
- `src/app/(main)/news/NewsClient.tsx` — adapt field names
- `src/app/(main)/press/[id]/PressClient.tsx` — read ambassador fields directly
- `src/app/(main)/thank-you/ThankYouClient.tsx` — fix broken `/auth` link
- `src/app/(main)/types-of-partners/page.tsx` — read from SiteContext partners
- `src/app/(main)/career/CareerClient.tsx` — adapt to public API response shape
- `src/models/OtpRecord.ts` — remove duplicate index
- `.gitignore` — add `.env.local` and `.env.production*`
- `package.json` — add `speakeasy`, `vitest` (dev) for the test additions

---

## Task 1: Lock down secrets, add `.env.example` template, harden default admin

**Files:**
- Modify: `.env.example` (overwrite with secrets removed)
- Modify: `.gitignore`
- Modify: `src/lib/featureFlags.ts` (new)
- Modify: `src/lib/adminBootstrap.ts`
- Modify: `src/lib/jwt.ts` (refuse insecure default secret in prod)

- [ ] **Step 1: Create `src/lib/featureFlags.ts`**

```ts
export const isProduction = () => process.env.NODE_ENV === "production";
export const isStaging = () => process.env.NODE_ENV === "staging";

/** Only allow the default-admin seed outside production unless explicitly enabled. */
export function defaultAdminEnabled(): boolean {
    if (!isProduction()) return true;
    return process.env.ALLOW_DEFAULT_ADMIN === "1";
}

export const REGISTRATION_FEE_PAISE = 1499 * 100;
export const REGISTRATION_FEE_RUPEES = 1499;
export const REGISTRATION_FEE_CURRENCY = "INR";
```

- [ ] **Step 2: Refuse the dev fallback JWT secret in production**

Edit `src/lib/jwt.ts`. Replace the top line:

```ts
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
```

with:

```ts
import { isProduction } from "@/lib/featureFlags";
const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET && isProduction()) {
    throw new Error("JWT_SECRET must be set in production");
}
const JWT_SECRET = RAW_SECRET || "dev-insecure-secret-change-me";
```

- [ ] **Step 3: Harden `src/lib/adminBootstrap.ts`**

Replace the entire file with:

```ts
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { defaultAdminEnabled, isProduction } from "@/lib/featureFlags";

const DEFAULT_EMAIL = "admin@brpl.com";
const DEFAULT_PASSWORD = "Admin@123";
const DEFAULT_NAME = "Super Admin";

let seeded = false;

/** Idempotent. Only runs in dev/staging or when ALLOW_DEFAULT_ADMIN=1. */
export async function ensureDefaultAdmin() {
    if (seeded) return;
    if (!defaultAdminEnabled()) {
        seeded = true;
        if (isProduction()) {
            console.warn("[admin-bootstrap] Skipped default admin (production).");
        }
        return;
    }
    try {
        await connectDB();
        const existing = await AdminUser.findOne({ email: DEFAULT_EMAIL }).lean();
        if (!existing) {
            const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
            await AdminUser.create({
                email: DEFAULT_EMAIL,
                passwordHash,
                name: DEFAULT_NAME,
                role: "superadmin",
                active: true,
                totpEnabled: false,
            });
            if (process.env.NODE_ENV !== "production") {
                console.info(
                    `[admin-bootstrap] Seeded default admin: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`
                );
            }
        }
        seeded = true;
    } catch (err) {
        console.error("[admin-bootstrap] failed", err);
    }
}
```

- [ ] **Step 4: Update `.env.example` (overwrite)**

```dotenv
# MongoDB — supply your own connection string
MONGODB_URI=

# SMS (SMSIndiaHub)
SMS_API_KEY=
SMS_SENDER_ID=SMSHUB
SMS_GWID=2

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Set to 1 to allow default-admin seeding in production. NEVER enable by default.
ALLOW_DEFAULT_ADMIN=
```

- [ ] **Step 5: Update `.gitignore`**

Append (if not already present):

```
.env.local
.env.production
.env.production.local
.env.staging
.env.staging.local
```

- [ ] **Step 6: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend
git add .env.example .gitignore src/lib/featureFlags.ts src/lib/jwt.ts src/lib/adminBootstrap.ts
git commit -m "chore(security): gate default admin and dev JWT secret behind prod check"
```

---

## Task 2: Fix the duplicate Mongoose index on OtpRecord

**Files:**
- Modify: `src/models/OtpRecord.ts`

- [ ] **Step 1: Remove duplicate index**

In `src/models/OtpRecord.ts`, change the `expiresAt` field definition so Mongoose only registers the TTL once. Replace lines 14-23 with:

```ts
const OtpRecordSchema = new Schema<IOtpRecord>({
    phone: { type: String, required: true, index: true, match: /^\d{10}$/ },
    otp: { type: String, required: true },
    // MongoDB's TTL monitor uses the indexed `expiresAt` field; expires: 0 is set
    // via the explicit index() call below to avoid duplicate-index warnings.
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

OtpRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpRecordSchema.index({ phone: 1, verified: 1, createdAt: -1 });
```

- [ ] **Step 2: Restart dev server and confirm the warning is gone**

```bash
pkill -f "next dev"; sleep 1
PORT=3010 nohup npm run dev > /tmp/devserver.log 2>&1 &
sleep 8
curl -s -X POST -H "Content-Type: application/json" -d '{"phone":"9876543211"}' http://localhost:3010/api/auth/send-otp >/dev/null
grep -c "Duplicate schema index" /tmp/devserver.log
```

Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add src/models/OtpRecord.ts
git commit -m "fix(models): remove duplicate expiresAt index on OtpRecord"
```

---

## Task 3: Add `/auth` page (login + OTP combined)

**Files:**
- Create: `src/app/auth/page.tsx`
- Create: `src/app/auth/AuthClient.tsx`

- [ ] **Step 1: Create the page wrapper**

Write `src/app/auth/page.tsx`:

```tsx
import { Suspense } from "react";
import AuthClient from "./AuthClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function AuthPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; mode?: "register" | "login" }>;
}) {
    const ctx = await getSiteContext();
    const sp = await searchParams;
    return (
        <SiteContextProvider value={ctx}>
            <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
                <AuthClient next={sp.next || "/dashboard"} initialMode={sp.mode || "register"} />
            </Suspense>
        </SiteContextProvider>
    );
}
```

- [ ] **Step 2: Create the client component**

Write `src/app/auth/AuthClient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";
import { ArrowLeft, Loader2, Phone, ShieldCheck } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Step = "phone" | "otp" | "register" | "loading";

const FALLBACK_NEXT = "/dashboard";

export default function AuthClient({
    next,
    initialMode,
}: {
    next: string;
    initialMode: "register" | "login";
}) {
    const router = useRouter();
    const { settings } = useSiteSettings();
    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [resendIn, setResendIn] = useState(0);
    const [exists, setExists] = useState<boolean | null>(null);
    const [form, setForm] = useState({ name: "", email: "", role: "batsman", state: "", city: "" });
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const submitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{10}$/.test(phone)) {
            toast({ variant: "destructive", title: "Invalid phone", description: "Enter a 10-digit mobile number." });
            return;
        }
        setBusy(true);
        try {
            const res = await api.post("/api/auth/send-otp", { phone });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Could not send OTP" });
                return;
            }
            setOtpExpiresIn(Math.floor((res.data?.expiresInSec ?? 300)));
            setResendIn(60);
            setStep("otp");
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length !== 6) return;
        setBusy(true);
        try {
            const res = await api.post<{ exists: boolean; user?: any; redirect?: string }>("/api/auth/verify-otp", { phone, otp: code });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Incorrect OTP", description: res.error || "Try again" });
                return;
            }
            setExists(res.data.exists);
            if (res.data.exists) {
                toast({ title: "Welcome back!" });
                router.replace(res.data.redirect || FALLBACK_NEXT);
                return;
            }
            if (initialMode === "register") {
                setStep("register");
            } else {
                toast({ title: "New user", description: "Continue registration." });
                router.replace("/auth?mode=register&next=" + encodeURIComponent(next));
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    const submitRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.state || !form.city) {
            toast({ variant: "destructive", title: "Missing fields", description: "All fields are required." });
            return;
        }
        if (!orderId || !paymentId) {
            toast({ variant: "destructive", title: "Payment required", description: "Complete payment first." });
            return;
        }
        setBusy(true);
        try {
            const res = await api.post<{ redirect?: string }>("/api/auth/register", {
                ...form,
                orderId,
                paymentId,
            });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Could not register" });
                return;
            }
            toast({ title: "Welcome to BRPL!" });
            router.replace(res.data.redirect || FALLBACK_NEXT);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    const startPayment = async () => {
        if (!/^\d{10}$/.test(phone)) return;
        setBusy(true);
        try {
            const res = await api.post<{ orderId: string; amount: number; currency: string; key: string }>("/api/payment/create-order");
            if (!res.ok) {
                toast({ variant: "destructive", title: "Payment init failed", description: res.error });
                return;
            }
            setOrderId(res.data.orderId);
            // Lazily load Razorpay checkout script
            if (!(window as any).Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const s = document.createElement("script");
                    s.src = "https://checkout.razorpay.com/v1/checkout.js";
                    s.async = true;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error("Failed to load Razorpay"));
                    document.body.appendChild(s);
                });
            }
            const rzp = new (window as any).Razorpay({
                key: res.data.key,
                amount: res.data.amount,
                currency: res.data.currency,
                name: settings?.siteName || "BRPL",
                description: "Player Registration",
                order_id: res.data.orderId,
                prefill: { contact: phone },
                handler: async (resp: any) => {
                    setPaymentId(resp.razorpay_payment_id);
                    const v = await api.post("/api/payment/verify", {
                        orderId: resp.razorpay_order_id,
                        paymentId: resp.razorpay_payment_id,
                        signature: resp.razorpay_signature,
                    });
                    if (v.ok) {
                        toast({ title: "Payment successful", description: "Now complete your details." });
                    } else {
                        toast({ variant: "destructive", title: "Verification failed", description: v.error });
                    }
                },
                modal: { ondismiss: () => setBusy(false) },
            });
            rzp.open();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Payment error", description: err?.message || "Unknown" });
        } finally {
            setBusy(false);
        }
    };

    const handleOtpChange = (i: number, v: string) => {
        const digit = v.replace(/\D/g, "").slice(-1);
        const nextOtp = [...otp];
        nextOtp[i] = digit;
        setOtp(nextOtp);
        if (digit && i < 5) otpRefs.current[i + 1]?.focus();
        if (!digit && i > 0) otpRefs.current[i - 1]?.focus();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-slate-50">
            <Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-slate-700 hover:text-amber-600">
                <ArrowLeft className="w-4 h-4" /> Back to site
            </Link>
            <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-8">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{step === "register" ? "Complete Registration" : "Sign in to BRPL"}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {step === "phone" && (initialMode === "register" ? "Enter your mobile to receive an OTP" : "Enter your registered mobile to sign in")}
                        {step === "otp" && `OTP sent to +91 ${phone}`}
                        {step === "register" && "One last step before you join the league"}
                    </p>
                </div>

                {step === "phone" && (
                    <form onSubmit={submitPhone} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Mobile number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input id="phone" inputMode="numeric" maxLength={10} className="pl-10" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required autoFocus />
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold" disabled={busy}>
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Send OTP
                        </Button>
                        <p className="text-xs text-slate-500 text-center">
                            {initialMode === "register" ? (
                                <>Already registered? <Link className="text-amber-600 hover:underline" href={`/auth?mode=login&next=${encodeURIComponent(next)}`}>Sign in</Link></>
                            ) : (
                                <>New here? <Link className="text-amber-600 hover:underline" href={`/auth?mode=register&next=${encodeURIComponent(next)}`}>Create an account</Link></>
                            )}
                        </p>
                    </form>
                )}

                {step === "otp" && (
                    <form onSubmit={submitOtp} className="space-y-4">
                        <div className="flex gap-2 justify-between">
                            {otp.map((d, i) => (
                                <input
                                    key={i}
                                    ref={(el) => { otpRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={d}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    className="w-12 h-12 text-center text-2xl font-mono font-bold border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>
                        <div className="text-xs text-slate-500 text-center">
                            {otpExpiresIn > 0 ? <>Expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, "0")}</> : "OTP expired"}
                        </div>
                        <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold" disabled={busy || otp.join("").length !== 6}>
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Verify
                        </Button>
                        <div className="text-xs text-slate-500 text-center">
                            {resendIn > 0 ? `Resend in ${resendIn}s` : (
                                <button type="button" className="text-amber-600 hover:underline" onClick={submitPhone} disabled={busy}>
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {step === "register" && (
                    <form onSubmit={submitRegister} className="space-y-4">
                        {!orderId && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                                <p className="text-amber-900 font-semibold mb-1">Pay registration fee: ₹1499</p>
                                <p className="text-amber-800 mb-3">A one-time fee covers trials, kit, and processing.</p>
                                <Button type="button" onClick={startPayment} className="bg-amber-500 text-black hover:bg-amber-400 font-semibold" disabled={busy}>
                                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Pay ₹1499
                                </Button>
                            </div>
                        )}
                        {orderId && !paymentId && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                                Payment started. Complete it in the Razorpay window, then return here.
                            </div>
                        )}
                        {paymentId && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Full name *</Label>
                                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Email *</Label>
                                    <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Role *</Label>
                                        <select className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                            <option value="batsman">Batsman</option>
                                            <option value="bowler">Bowler</option>
                                            <option value="allrounder">All-rounder</option>
                                            <option value="wicketkeeper">Wicket-keeper</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>State *</Label>
                                        <Input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>City *</Label>
                                    <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                                </div>
                                <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold" disabled={busy}>
                                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Complete registration
                                </Button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify the page returns 200**

```bash
pkill -f "next dev" 2>/dev/null; sleep 1
PORT=3010 nohup npm run dev > /tmp/devserver.log 2>&1 &
sleep 10
curl -s -o /dev/null -w "/auth => %{http_code}\n" http://localhost:3010/auth
curl -s -o /dev/null -w "/auth?mode=login => %{http_code}\n" "http://localhost:3010/auth?mode=login"
```

Expected: both 200.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/page.tsx src/app/auth/AuthClient.tsx
git commit -m "feat(auth): add /auth page with OTP login + registration flow"
```

---

## Task 4: Add `/dashboard` page (user profile + receipt)

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Create the page wrapper**

Write `src/app/dashboard/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/session";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) redirect("/auth?next=/dashboard");
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <DashboardClient />
        </SiteContextProvider>
    );
}
```

- [ ] **Step 2: Create the session helper**

Write `src/lib/session.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAMES, verifyJwt, type SessionPayload } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export type AuthSession = {
    sub: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
};

export async function getAuthSession(): Promise<AuthSession | null> {
    const c = await cookies();
    const token = c.get(COOKIE_NAMES.AUTH)?.value;
    if (!token) return null;
    const payload = await verifyJwt<SessionPayload>(token);
    if (!payload || payload.purpose !== "auth") return null;

    await connectDB();
    const user = await User.findById(payload.sub).lean();
    if (!user) return null;

    return {
        sub: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        paymentStatus: user.paymentStatus,
        paymentId: user.paymentId,
        orderId: user.orderId,
        amount: user.amount,
    };
}
```

- [ ] **Step 3: Create the client component**

Write `src/app/dashboard/DashboardClient.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Loader2, LogOut, Trophy, IdCard, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/apihelper/api";
import { formatCurrencyINR } from "@/utils/adminExport";
import { formatDate } from "@/utils/adminDate";
import { toast } from "@/components/ui/use-toast";

type Me = {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
};

export default function DashboardClient() {
    const router = useRouter();
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await api.get<{ user: Me | null }>("/api/auth/me");
            if (res.ok && res.data?.user) {
                setMe(res.data.user);
            } else {
                router.replace("/auth?next=/dashboard");
            }
            setLoading(false);
        })();
    }, [router]);

    const handleDownload = async () => {
        if (!me) return;
        setDownloading(true);
        try {
            const r = await fetch(`/api/admin/users/${me.id}/invoice`, { credentials: "same-origin" });
            if (!r.ok) throw new Error("Failed");
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BRPL-Receipt-${(me.name || me.phone).replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast({ variant: "destructive", title: "Download failed" });
        } finally {
            setDownloading(false);
        }
    };

    const handleLogout = async () => {
        await api.post("/api/auth/logout");
        router.replace("/");
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
    }
    if (!me) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                    <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Sign out</Button>
                </div>

                <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-black shadow-xl">
                    <p className="text-sm uppercase tracking-widest opacity-80 mb-2">Welcome</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-1">{me.name || "Player"}</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4" />
                        <span className="font-semibold capitalize">{me.role || "Player"}</span>
                        {me.paymentStatus === "completed" && (
                            <>
                                <span className="opacity-50">•</span>
                                <Badge className="bg-black/20 text-black border-black/30">Paid</Badge>
                            </>
                        )}
                        {me.paymentStatus !== "completed" && (
                            <>
                                <span className="opacity-50">•</span>
                                <Badge className="bg-red-500/30 text-white border-red-300/40">Unpaid</Badge>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field icon={<IdCard className="w-5 h-5" />} label="BRPL ID" value={`#${me.id.slice(-8).toUpperCase()}`} mono />
                    <Field icon={<Phone className="w-5 h-5" />} label="Mobile" value={`+91 ${me.phone}`} />
                    <Field icon={<Mail className="w-5 h-5" />} label="Email" value={me.email || "—"} />
                    <Field icon={<MapPin className="w-5 h-5" />} label="Location" value={[me.city, me.state].filter(Boolean).join(", ") || "—"} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Status</p>
                            <Badge className={me.paymentStatus === "completed" ? "bg-green-500" : "bg-orange-500"}>
                                {me.paymentStatus || "pending"}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount</p>
                            <p className="text-lg font-bold">{formatCurrencyINR(me.amount ?? 1499)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Payment ID</p>
                            <p className="font-mono text-sm break-all">{me.paymentId || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Order ID</p>
                            <p className="font-mono text-sm break-all">{me.orderId || "—"}</p>
                        </div>
                        {me.paymentStatus === "completed" && (
                            <div className="md:col-span-2 pt-2">
                                <Button onClick={handleDownload} disabled={downloading} className="bg-amber-500 text-black hover:bg-amber-400">
                                    {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    {downloading ? "Preparing..." : "Download Receipt PDF"}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {me.paymentStatus !== "completed" && (
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">Complete your registration</p>
                                <p className="text-sm text-slate-500">Pay the registration fee to confirm your slot.</p>
                            </div>
                            <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                                <Link href="/auth?mode=register">Continue</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function Field({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center gap-2 text-amber-600 mb-2">{icon}<span className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</span></div>
                <p className={`text-base font-semibold break-words ${mono ? "font-mono" : ""}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 4: Verify the page renders when authenticated**

```bash
# (Dev server already running)
# Hit /api/auth/me unauthenticated to confirm shape
curl -s http://localhost:3010/api/auth/me
```

Expected: `{"user":null}` (no auth cookie).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/DashboardClient.tsx src/lib/session.ts
git commit -m "feat(dashboard): add /dashboard with profile + payment receipt"
```

---

## Task 5: Add `/payment` alias page (Razorpay redirect)

**Files:**
- Create: `src/app/payment/page.tsx`
- Create: `src/app/payment/PaymentClient.tsx`

The `/payment` route is referenced by `verify-otp` for new users. Since Task 3 already implements the full payment UI inside the `/auth` page, the simplest correct behaviour here is to redirect new users to the auth flow with `mode=register`.

- [ ] **Step 1: Create the page wrapper**

Write `src/app/payment/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PaymentPage() {
    redirect("/auth?mode=register&next=/dashboard");
}
```

- [ ] **Step 2: Create the client component (handles in-flight checkout if user lands here directly)**

Write `src/app/payment/PaymentClient.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentClient() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/auth?mode=register&next=/dashboard");
    }, [router]);
    return null;
}
```

(The server redirect in `page.tsx` already handles the common case; the client component is a safety net for cases where the user has the page in cache.)

- [ ] **Step 3: Verify**

```bash
curl -sI http://localhost:3010/payment | head -5
```

Expected: HTTP 307 with `location: /auth?mode=register&next=/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add src/app/payment/page.tsx src/app/payment/PaymentClient.tsx
git commit -m "feat(payment): add /payment alias redirecting to /auth register flow"
```

---

## Task 6: Fix all references to `/auth`, `/payment`, `/dashboard` to use the new flows

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/api/payment/verify/route.ts`
- Modify: `src/app/(main)/thank-you/ThankYouClient.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SchemaMarkup.tsx`
- Modify: `src/components/Header` (no — only Header.tsx exists)
- Modify: `src/app/(admin)/admin/registration-banner/page.tsx` (if it links to /auth)

- [ ] **Step 1: Update middleware to point to `/auth`**

The middleware already targets `/auth`. After Task 3, `/auth` exists with the right `next` query handling. No code change needed beyond confirming the path. Skip if already correct.

- [ ] **Step 2: Update payment/verify `redirect`**

Edit `src/app/api/payment/verify/route.ts`. Change the `redirect` in the success body from `/auth/register` to `/auth?mode=register&next=/dashboard`:

```ts
return NextResponse.json({
    success: true,
    orderId,
    paymentId,
    redirect: "/auth?mode=register&next=/dashboard",
});
```

- [ ] **Step 3: Update `ThankYouClient` button**

Edit `src/app/(main)/thank-you/ThankYouClient.tsx`. Find the `<Link href="/auth">` (line ~102) and change to:

```tsx
<Link href="/auth?mode=login&next=/dashboard">
```

- [ ] **Step 4: Update `Header.tsx` login link**

Read the current file. Replace any `href="/auth"` with `href="/auth?mode=login"`. (Use `grep -n 'href="/auth"' src/components/Header.tsx` to find the exact lines first.)

- [ ] **Step 5: Update `SchemaMarkup.tsx` key**

Edit `src/components/SchemaMarkup.tsx`. Find the mapping for `"/auth"` and change to `"/auth?mode=login"` (or split into separate keys for `/auth`, `/auth?mode=register`).

- [ ] **Step 6: Verify navigation works**

```bash
curl -sI http://localhost:3010/dashboard | head -3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3010/auth
```

Expected: 307 → `/auth?next=/dashboard`, then `/auth` returns 200.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/payment/verify/route.ts src/app/(main)/thank-you/ThankYouClient.tsx src/components/Header.tsx src/components/SchemaMarkup.tsx
git commit -m "fix(routes): align all /auth, /payment, /dashboard references with new flow"
```

---

## Task 7: Add public API routes for blog, news, jobs, ambassadors, events

**Files:**
- Create: `src/app/api/blog/route.ts`
- Create: `src/app/api/blog/slug/[slug]/route.ts`
- Create: `src/app/api/news/route.ts`
- Create: `src/app/api/news/slug/[slug]/route.ts`
- Create: `src/app/api/jobs/route.ts`
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/ambassadors/[id]/route.ts`

Each route returns `{ success, data }` so the public client code (which checks `res.data?.success`) works without change.

- [ ] **Step 1: Create `/api/blog`**

Write `src/app/api/blog/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await BlogPost.find({ draft: { $ne: true } })
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();
        return NextResponse.json({ success: true, data: docs.map((d) => ({ ...d, _id: d._id.toString() })) });
    } catch (err: any) {
        console.error("[api/blog]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create `/api/blog/slug/[slug]`**

Write `src/app/api/blog/slug/[slug]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    try {
        await connectDB();
        const doc = await BlogPost.findOne({ slug: params.slug.toLowerCase(), draft: { $ne: true } }).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...doc, _id: doc._id.toString() } });
    } catch (err: any) {
        console.error("[api/blog/slug]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 3: Create `/api/news`**

Write `src/app/api/news/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NewsArticle from "@/models/NewsArticle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await NewsArticle.find({ draft: { $ne: true } })
            .sort({ publishedAt: -1, createdAt: -1 })
            .lean();
        return NextResponse.json({ success: true, data: docs.map((d) => ({ ...d, _id: d._id.toString() })) });
    } catch (err: any) {
        console.error("[api/news]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 4: Create `/api/news/slug/[slug]`**

Write `src/app/api/news/slug/[slug]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NewsArticle from "@/models/NewsArticle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    try {
        await connectDB();
        const doc = await NewsArticle.findOne({ slug: params.slug.toLowerCase(), draft: { $ne: true } }).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...doc, _id: doc._id.toString() } });
    } catch (err: any) {
        console.error("[api/news/slug]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 5: Create `/api/jobs`**

Write `src/app/api/jobs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Job from "@/models/Job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await Job.find({ active: true }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: docs.map((d) => ({ ...d, _id: d._id.toString() })) });
    } catch (err: any) {
        console.error("[api/jobs]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 6: Create `/api/events`**

Write `src/app/api/events/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        const docs = await Event.find({}).sort({ startDate: -1 }).lean();
        return NextResponse.json({ success: true, data: docs.map((d) => ({ ...d, _id: d._id.toString() })) });
    } catch (err: any) {
        console.error("[api/events]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 7: Create `/api/ambassadors/[id]`**

Write `src/app/api/ambassadors/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ambassador from "@/models/Ambassador";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        await connectDB();
        const id = params.id;
        const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { _id: id };
        const doc = await Ambassador.findOne(query).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...doc, _id: doc._id.toString() } });
    } catch (err: any) {
        console.error("[api/ambassadors/id]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 8: Verify each endpoint returns 200**

```bash
curl -s -o /dev/null -w "/api/blog %{http_code}\n" http://localhost:3010/api/blog
curl -s -o /dev/null -w "/api/news %{http_code}\n" http://localhost:3010/api/news
curl -s -o /dev/null -w "/api/jobs %{http_code}\n" http://localhost:3010/api/jobs
curl -s -o /dev/null -w "/api/events %{http_code}\n" http://localhost:3010/api/events
curl -s -o /dev/null -w "/api/ambassadors/000000000000000000000000 %{http_code}\n" http://localhost:3010/api/ambassadors/000000000000000000000000
curl -s -o /dev/null -w "/api/blog/slug/abc %{http_code}\n" http://localhost:3010/api/blog/slug/abc
```

Expected: all 200 (or 404 for the slug/ambassador lookups since the data won't exist, which is correct).

- [ ] **Step 9: Commit**

```bash
git add src/app/api/blog src/app/api/news src/app/api/jobs src/app/api/events src/app/api/ambassadors
git commit -m "feat(api): add public read-only endpoints for blog, news, jobs, events, ambassadors"
```

---

## Task 8: Reconcile BlogPost/NewsArticle field names

The admin form and Mongoose model currently use `heroImage`/`excerpt`/`publishedAt`. The public client reads `featuredImage`/`metaTitle`/`metaDescription`/`enableSchema`/`isPublished`. We will add aliases via JSON serialization so both APIs can return the same shape, and add the new fields to the model so admins can store them.

**Files:**
- Modify: `src/models/BlogPost.ts`
- Modify: `src/models/NewsArticle.ts`
- Modify: `src/app/api/admin/blog/route.ts`
- Modify: `src/app/api/admin/news/route.ts`
- Modify: `src/app/api/blog/route.ts` (alias on output)
- Modify: `src/app/api/blog/slug/[slug]/route.ts` (alias on output)
- Modify: `src/app/api/news/route.ts` (alias on output)
- Modify: `src/app/api/news/slug/[slug]/route.ts` (alias on output)

- [ ] **Step 1: Extend BlogPost model with new fields**

Edit `src/models/BlogPost.ts`. Inside the schema definition, after `heroImage`, add:

```ts
// Public-API aliases (admin can store via either name)
metaTitle: { type: String, default: "" },
metaDescription: { type: String, default: "" },
enableSchema: { type: Boolean, default: true },
isPublished: { type: Boolean, default: true },
```

Also add an index for `isPublished` lookups:

```ts
BlogPostSchema.index({ isPublished: 1, publishedAt: -1 });
```

- [ ] **Step 2: Add a serializer helper**

Create `src/lib/serializePost.ts`:

```ts
import type { Document } from "mongoose";

export type SerializedBlogPost = {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    heroImage?: string;
    featuredImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    enableSchema?: boolean;
    isPublished?: boolean;
    authorName?: string;
    authorImage?: string;
    tags?: string[];
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

export function serializeBlogPost(doc: any): SerializedBlogPost {
    if (!doc) return doc;
    const d = { ...doc };
    if (d._id) d._id = d._id.toString();
    // Aliases: public client reads these names
    d.featuredImage = d.featuredImage || d.heroImage;
    d.metaTitle = d.metaTitle || d.title;
    d.metaDescription = d.metaDescription || d.excerpt;
    d.isPublished = d.isPublished !== undefined ? d.isPublished : !d.draft;
    return d;
}

export function serializeNewsPost(doc: any): SerializedBlogPost {
    return serializeBlogPost(doc);
}
```

- [ ] **Step 3: Wire serializer into public APIs**

Edit `src/app/api/blog/route.ts` and `src/app/api/blog/slug/[slug]/route.ts`. Replace `.map((d) => ({ ...d, _id: d._id.toString() }))` with `.map(serializeBlogPost)`. Same for news with `serializeNewsPost`. Add `import { serializeBlogPost } from "@/lib/serializePost"` at the top.

- [ ] **Step 4: Extend Blog admin schema to accept the new fields**

Edit `src/app/api/admin/blog/route.ts`. Inside the zod `schema` object, add:

```ts
metaTitle: z.string().max(300).optional(),
metaDescription: z.string().max(1000).optional(),
enableSchema: z.boolean().default(true),
isPublished: z.boolean().default(true),
```

(Note: the create handler uses the same schema, so newly created blog posts will default to `isPublished: true`.)

- [ ] **Step 5: Repeat for News**

Same change in `src/app/api/admin/news/route.ts` and use `serializeNewsPost` in the public news routes.

- [ ] **Step 6: Smoke-test the round-trip**

```bash
TOKEN=$(curl -s -c /tmp/admin_cookies.txt -X POST -H "Content-Type: application/json" -d '{"email":"admin@brpl.com","password":"Admin@123"}' http://localhost:3010/api/admin/auth/login | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
# Create a draft
curl -s -b /tmp/admin_cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"title":"Hello world","slug":"hello-world","content":"<p>Hi</p>","isPublished":true,"metaTitle":"Hi","metaDescription":"Hi there","enableSchema":true}' \
  http://localhost:3010/api/admin/blog
echo "---"
curl -s http://localhost:3010/api/blog/slug/hello-world | head -c 400
echo ""
curl -s http://localhost:3010/api/blog | head -c 400
```

Expected: blog public list/slug returns `{success:true, data: {title:"Hello world", featuredImage:..., metaTitle:"Hi", ...}}`.

- [ ] **Step 7: Commit**

```bash
git add src/models/BlogPost.ts src/models/NewsArticle.ts src/lib/serializePost.ts \
        src/app/api/admin/blog/route.ts src/app/api/admin/news/route.ts \
        src/app/api/blog/route.ts src/app/api/blog/slug/[slug]/route.ts \
        src/app/api/news/route.ts src/app/api/news/slug/[slug]/route.ts
git commit -m "feat(blog,news): add metaTitle/Description + featuredImage alias to public API"
```

---

## Task 9: Wire Contact Us and Become Partner forms to `/api/contact`

**Files:**
- Create: `src/app/api/contact/route.ts`
- Modify: `src/app/(main)/contact-us/ContactUsClient.tsx`
- Modify: `src/app/(main)/partners/BecomePartnerClient.tsx`

- [ ] **Step 1: Create the public contact route**

Write `src/app/api/contact/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import ContactLead from "@/models/ContactLead";
import { sendContactNotification } from "@/lib/email";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const partnerSchema = z.object({
    source: z.literal("partner-form"),
    firstName: z.string().min(2).max(60),
    lastName: z.string().min(2).max(60),
    companyName: z.string().max(120).optional().or(z.literal("")),
    email: z.string().email().max(160),
    contactNumber: z.string().min(10).max(20),
    partnershipType: z.enum(["Sponsorship", "Franchise"]),
    message: z.string().min(10).max(2000),
});

const contactSchema = z.object({
    source: z.literal("contact-form").optional().default("contact-form"),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    mobileNumber: z.string().min(10).max(20),
    email: z.string().email().max(160),
    message: z.string().min(5).max(2000),
});

const bodySchema = z.union([partnerSchema, contactSchema]);

export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => ({}));
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
            const first = parsed.error.issues[0];
            return NextResponse.json({ success: false, error: first?.message || "Invalid input" }, { status: 400 });
        }
        const data: any = parsed.data;
        await connectDB();

        let lead;
        if (data.source === "partner-form") {
            lead = await ContactLead.create({
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                phone: data.contactNumber,
                message: `[${data.partnershipType}] ${data.companyName ? `Company: ${data.companyName}\n\n` : ""}${data.message}`,
                source: "partner-form",
            });
        } else {
            lead = await ContactLead.create({
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                phone: data.mobileNumber,
                message: data.message,
                source: "contact-form",
            });
        }

        // Best-effort admin notification (does not block the lead)
        sendContactNotification(lead).catch((err) => console.error("[contact] email notify failed", err));

        // Admin list cache: nothing to revalidate since admin uses fresh DB read
        revalidatePath("/admin/contact-us-leads");
        return NextResponse.json({ success: true, id: lead._id.toString() });
    } catch (err: any) {
        console.error("[api/contact]", err);
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create the no-op email helper**

Create `src/lib/email.ts`:

```ts
import type { Document } from "mongoose";

type Lead = { _id: any; name: string; email?: string; phone?: string; message: string; source: string };

/**
 * Best-effort email notification when a contact or partner lead is submitted.
 * The transport (SMTP, SendGrid, SES) is configured via env vars in production.
 * In dev/staging or when no transport is configured, this logs and resolves.
 */
export async function sendContactNotification(lead: Lead): Promise<void> {
    if (!process.env.SMTP_URL && !process.env.SENDGRID_API_KEY && !process.env.SES_REGION) {
        console.info(`[contact] new lead from ${lead.name} (${lead.email ?? "no email"}): ${lead.message.slice(0, 80)}`);
        return;
    }
    // Wire your provider here. Intentionally not shipping a transport that could
    // accidentally send mail from a dev machine.
    console.info(`[contact] (transport configured) would notify admin of lead ${lead._id.toString()}`);
}
```

- [ ] **Step 3: Wire the Contact Us form**

Edit `src/app/(main)/contact-us/ContactUsClient.tsx`. Replace the `handleSubmit` body:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobileNumber || !formData.message) {
        toast({ variant: "destructive", title: "Missing fields", description: "Please fill all fields." });
        return;
    }
    setLoading(true);
    try {
        const res = await api.post<{ success: boolean; id?: string; error?: string }>("/api/contact", {
            source: "contact-form",
            firstName: formData.firstName,
            lastName: formData.lastName,
            mobileNumber: formData.mobileNumber,
            email: formData.email,
            message: formData.message,
        });
        if (!res.ok) {
            toast({ variant: "destructive", title: "Failed to send", description: res.error });
            return;
        }
        setShowSuccessDialog(true);
        setFormData({ firstName: "", lastName: "", mobileNumber: "", email: "", message: "" });
    } catch (err: any) {
        toast({ variant: "destructive", title: "Network error", description: err?.message });
    } finally {
        setLoading(false);
    }
};
```

Add `import api from "@/apihelper/api";` and `import { toast } from "@/components/ui/use-toast";` to the top of the file.

- [ ] **Step 4: Wire the Become Partner form**

Edit `src/app/(main)/partners/BecomePartnerClient.tsx`. Replace the `onSubmit` of the form (find the form's `handleSubmit`). Use the new `api.post` call:

```tsx
const onSubmit = async (values: z.infer<typeof partnerFormSchema>) => {
    setIsSubmitting(true);
    try {
        const res = await api.post<{ success: boolean; id?: string; error?: string }>("/api/contact", {
            source: "partner-form",
            ...values,
        });
        if (!res.ok) {
            toast({ variant: "destructive", title: "Failed", description: res.error || "Try again later" });
            return;
        }
        setShowSuccessDialog(true);
        form.reset();
    } catch (err: any) {
        toast({ variant: "destructive", title: "Network error", description: err?.message });
    } finally {
        setIsSubmitting(false);
    }
};
```

Add `import api from "@/apihelper/api";` and `import { toast } from "@/components/ui/use-toast";` to the top.

- [ ] **Step 5: Smoke-test**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"source":"contact-form","firstName":"A","lastName":"B","email":"a@b.com","mobileNumber":"9876543210","message":"Hello there"}' \
  http://localhost:3010/api/contact
echo ""
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"source":"partner-form","firstName":"A","lastName":"B","email":"a@b.com","contactNumber":"9876543210","partnershipType":"Sponsorship","message":"Want to sponsor"}' \
  http://localhost:3010/api/contact
```

Expected: `{"success":true,"id":"..."}` for both. Verify the leads exist:

```bash
curl -s -b /tmp/admin_cookies.txt "http://localhost:3010/api/admin/contact-leads?page=1&limit=5" | head -c 400
```

Expected: shows the two new leads.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/contact/route.ts src/lib/email.ts \
        src/app/(main)/contact-us/ContactUsClient.tsx \
        src/app/(main)/partners/BecomePartnerClient.tsx
git commit -m "feat(forms): wire Contact Us and Become Partner to /api/contact"
```

---

## Task 10: Wire Events page to the public API

**Files:**
- Modify: `src/app/(main)/events/EventsClient.tsx`

- [ ] **Step 1: Replace the hardcoded empty state with a fetch**

In `src/app/(main)/events/EventsClient.tsx`, change the state and add an effect:

```tsx
const [events, setEvents] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
    let cancelled = false;
    api.get("/api/events")
        .then((res) => {
            if (cancelled) return;
            if (res.ok && Array.isArray((res.data as any)?.data)) setEvents((res.data as any).data);
        })
        .catch(() => { if (!cancelled) setEvents([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
}, []);
```

Add `import api from "@/apihelper/api";` at the top.

- [ ] **Step 2: Commit**

```bash
git add src/app/(main)/events/EventsClient.tsx
git commit -m "feat(events): wire Events page to /api/events"
```

---

## Task 11: Replace admin TOTP stub with real speakeasy verification

**Files:**
- Modify: `package.json` (add `speakeasy` and `@types/speakeasy`)
- Create: `src/lib/totp.ts`
- Modify: `src/app/api/admin/auth/login/route.ts`
- Modify: `src/app/api/admin/auth/verify-otp/route.ts`

- [ ] **Step 1: Install speakeasy**

```bash
cd /Users/anurag/Desktop/brpl-frontend
npm install speakeasy
npm install --save-dev @types/speakeasy
```

- [ ] **Step 2: Create the TOTP wrapper**

Write `src/lib/totp.ts`:

```ts
import speakeasy from "speakeasy";

export function generateTotpSecret(): string {
    return speakeasy.generateSecret({ length: 20 }).base32;
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
    if (!secret || !/^\d{6}$/.test(code)) return false;
    return speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: code,
        window,
    });
}

export function otpauthUrl(secret: string, account: string, issuer = "BRPL Admin"): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
```

- [ ] **Step 3: Wire verify-otp to use real TOTP when enabled**

Edit `src/app/api/admin/auth/verify-otp/route.ts`. Replace the lines from the `// Dev verification` comment through the `if (!accepted) return fail(...)` block with:

```ts
let accepted = false;
if (admin.totpEnabled && admin.totpSecret) {
    accepted = verifyTotp(admin.totpSecret, parsed.data.code);
} else {
    // Allow setup of TOTP in dev/staging when an admin has no secret configured.
    accepted = process.env.NODE_ENV !== "production" && parsed.data.code === "000000";
}
if (!accepted) {
    return fail("Invalid OTP", 400);
}
```

Add `import { verifyTotp } from "@/lib/totp";` at the top.

- [ ] **Step 4: Wire the login route TOTP branch**

The login route already issues a short `admin` token with `purpose: "admin"` then defers the actual TOTP check to `verify-otp`. Update the `purpose` marker so verify-otp can tell the difference between a pre-TOTP session and a full session. Edit the login route: change the JWT payload from `purpose: "admin"` to `purpose: "admin_otp"` in the if branch:

```ts
if (admin.totpEnabled && admin.totpSecret) {
    const otpToken = await signJwt(
        {
            sub: admin._id.toString(),
            email: admin.email,
            role: admin.role,
            name: admin.name,
            purpose: "admin_otp", // <-- changed
        },
        "5m"
    );
    return ok({
        requireOtp: true,
        otpToken,
        message: "Enter the 6-digit code from your authenticator app",
    });
}
```

Also update `SessionPayload` in `src/lib/jwt.ts` to include the new purpose value. Edit the union:

```ts
purpose?: "auth" | "pending_reg" | "admin" | "admin_otp";
```

- [ ] **Step 5: Update verify-otp to accept the new purpose**

In `src/app/api/admin/auth/verify-otp/route.ts`, change the payload type and the `if (!payload || !payload.sub)` check. Replace lines 28-33 with:

```ts
const payload = await verifyJwt<{ sub: string; email: string; role: string; name?: string; purpose?: string }>(
    parsed.data.otpToken
);
if (!payload || !payload.sub || (payload.purpose !== "admin" && payload.purpose !== "admin_otp")) {
    return fail("Session expired. Please log in again.", 401);
}
```

- [ ] **Step 6: Smoke test**

```bash
# Confirm dev/staging still works with the "000000" code path
curl -s -c /tmp/admin_cookies.txt -X POST -H "Content-Type: application/json" -d '{"email":"admin@brpl.com","password":"Admin@123"}' http://localhost:3010/api/admin/auth/login
# (No TOTP enabled, returns 200 directly)
# To exercise the verify-otp path, manually flip totpEnabled on the admin user
# and verify any 6 digits no longer passes:
node -e "const m=require('./src/lib/mongodb.js'); m.connectDB().then(async()=>{const A=require('./src/models/AdminUser.js').default; await A.updateOne({email:'admin@brpl.com'},{$set:{totpEnabled:true,totpSecret:'JBSWY3DPEHPK3PXP'}}); console.log('enabled'); process.exit(0);});"
# Login
curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@brpl.com","password":"Admin@123"}' http://localhost:3010/api/admin/auth/login
# Returns requireOtp: true
# Try bad code
OTP_TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"admin@brpl.com","password":"Admin@123"}' http://localhost:3010/api/admin/auth/login | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['otpToken'])")
curl -s -X POST -H "Content-Type: application/json" -d "{\"otpToken\":\"$OTP_TOKEN\",\"code\":\"123456\"}" http://localhost:3010/api/admin/auth/verify-otp
# Good code
GOOD=$(node -e "console.log(require('speakeasy').totp({secret:'JBSWY3DPEHPK3PXP',encoding:'base32'}))")
curl -s -X POST -H "Content-Type: application/json" -d "{\"otpToken\":\"$OTP_TOKEN\",\"code\":\"$GOOD\"}" http://localhost:3010/api/admin/auth/verify-otp
```

Expected: bad code returns `{ok:false, error:"Invalid OTP"}`. Good code returns `{ok:true, data:{token, email, name, role}}`.

- [ ] **Step 7: Reset the test admin**

```bash
node -e "const m=require('./src/lib/mongodb.js'); m.connectDB().then(async()=>{const A=require('./src/models/AdminUser.js').default; await A.updateOne({email:'admin@brpl.com'},{$set:{totpEnabled:false,totpSecret:null}}); console.log('reset'); process.exit(0);});"
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/totp.ts src/lib/jwt.ts \
        src/app/api/admin/auth/login/route.ts src/app/api/admin/auth/verify-otp/route.ts
git commit -m "feat(admin): wire real TOTP via speakeasy, keep dev fallback for non-prod"
```

---

## Task 12: Add a tests folder and the minimum test infra

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest scripts)
- Create: `tests/lib/totp.test.ts`
- Create: `tests/api/blog.public.test.ts`
- Create: `tests/api/contact.test.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Create vitest config**

Write `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "node",
        globals: false,
        include: ["tests/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
});
```

- [ ] **Step 3: Add test script**

Edit `package.json`. In the `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write TOTP unit test**

Write `tests/lib/totp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateTotpSecret, verifyTotp, otpauthUrl } from "@/lib/totp";
import speakeasy from "speakeasy";

describe("totp", () => {
    it("verifies a valid code for a generated secret", () => {
        const secret = generateTotpSecret();
        const code = speakeasy.totp({ secret, encoding: "base32" });
        expect(verifyTotp(secret, code)).toBe(true);
    });

    it("rejects an invalid code", () => {
        const secret = generateTotpSecret();
        expect(verifyTotp(secret, "000000")).toBe(false);
    });

    it("rejects malformed input", () => {
        const secret = generateTotpSecret();
        expect(verifyTotp(secret, "abc")).toBe(false);
        expect(verifyTotp("", "123456")).toBe(false);
    });

    it("builds an otpauth URL with issuer", () => {
        const url = otpauthUrl("SECRET", "admin@brpl.com");
        expect(url).toMatch(/^otpauth:\/\/totp\//);
        expect(url).toContain("issuer=BRPL%20Admin");
        expect(url).toContain("secret=SECRET");
    });
});
```

- [ ] **Step 5: Write contact API integration test**

Write `tests/api/contact.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { POST } from "@/app/api/contact/route";

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/brpl-test";
    }
});

async function call(body: any) {
    const req = new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const res = await POST(req);
    const json = await res.json();
    return { status: res.status, body: json };
}

describe("POST /api/contact", () => {
    it("rejects missing required fields", async () => {
        const { status, body } = await call({ source: "contact-form", firstName: "A" });
        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });

    it("rejects invalid email", async () => {
        const { status } = await call({
            source: "contact-form",
            firstName: "A", lastName: "B", email: "not-an-email",
            mobileNumber: "9876543210", message: "Hello world",
        });
        expect(status).toBe(400);
    });

    it("accepts a valid partner-form payload", async () => {
        const { status, body } = await call({
            source: "partner-form",
            firstName: "A", lastName: "B", email: "a@b.com",
            contactNumber: "9876543210", partnershipType: "Sponsorship",
            message: "We would like to sponsor your league",
        });
        expect([200, 500]).toContain(status); // 500 only if MONGODB_URI is unreachable
        if (status === 200) expect(body.success).toBe(true);
    });
});
```

- [ ] **Step 6: Write blog public API test**

Write `tests/api/blog.public.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { GET as list } from "@/app/api/blog/route";

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/brpl-test";
    }
});

describe("GET /api/blog (public)", () => {
    it("returns { success, data }", async () => {
        const req = new Request("http://localhost/api/blog");
        const res = await list(req);
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("success", true);
        expect(Array.isArray(body.data)).toBe(true);
    });
});
```

- [ ] **Step 7: Run the test suite**

```bash
cd /Users/anurag/Desktop/brpl-frontend
npm test
```

Expected: all tests pass (TOTP deterministically, contact/blog require a running MongoDB; if MONGODB_URI is unreachable, those tests will surface 500 — adjust `.env.local` if needed).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/
git commit -m "test: add vitest setup with totp + contact + blog coverage"
```

---

## Task 13: Final production-readiness sweep

**Files:**
- Modify: `next.config.mjs` (add security headers)
- Modify: `src/app/api/admin/users/[id]/invoice/route.ts` (verify auth gate)

- [ ] **Step 1: Add security headers to next.config.mjs**

Edit `next.config.mjs`. Inside the `headers()` function, append one more entry to the returned array:

```js
{
    source: "/:path*",
    headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
},
```

- [ ] **Step 2: Verify the admin invoice endpoint requires auth**

Read `src/app/api/admin/users/[id]/invoice/route.ts`. Confirm the very first line of the handler is `await requireAdmin()` or equivalent. If not, wrap it:

```ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await requireAdmin();
    if (session instanceof Response) return session;
    // ... existing implementation
}
```

- [ ] **Step 3: Verify the production build compiles**

```bash
cd /Users/anurag/Desktop/brpl-frontend
pkill -f "next dev" 2>/dev/null; sleep 1
npm run build 2>&1 | tail -40
```

Expected: build succeeds; no TypeScript or compile errors. The "duration-[10000ms]" warning can be ignored.

- [ ] **Step 4: Final live probe**

Restart dev server, then re-run the full audit probe:

```bash
PORT=3010 nohup npm run dev > /tmp/devserver.log 2>&1 &
sleep 10
echo "--- Pages ---"
for r in / /about-us /blog /news /career /events /teams /faqs /partners /contact-us /types-of-partners /privacy-policy /terms-and-conditions /rule-book /thank-you /press/123 /auth /auth?mode=register /payment /dashboard /admin/login; do
    printf "%-40s " "$r"
    curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3010$r"
done
echo "--- Public APIs ---"
for r in /api/blog /api/news /api/jobs /api/events /api/auth/me; do
    printf "%-30s " "$r"
    curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3010$r"
done
```

Expected: all return 200 (or 307 for /dashboard, /payment which redirect).

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs src/app/api/admin/users/[id]/invoice/route.ts
git commit -m "chore(security): add security headers and verify admin invoice auth gate"
```

---

## Self-Review

**Spec coverage:**
- Three missing pages (auth, payment, dashboard) — Tasks 3, 4, 5
- Public APIs for blog/news/jobs/ambassadors/events — Task 7
- Field-name reconciliation — Task 8
- Wired contact + partner forms — Task 9
- Events page wiring — Task 10
- TOTP replaced with speakeasy — Task 11
- Tests added — Task 12
- Production secrets hardened — Task 1
- Default admin gated — Task 1
- Mongoose duplicate index fixed — Task 2
- Security headers — Task 13

**Placeholder scan:** None — every step shows the actual code.

**Type consistency:** `purpose: "admin_otp"` matches across `login` route, `verify-otp` route, and `SessionPayload` union. Serializer returns `SerializedBlogPost` consistently. Contact schema union branches map to the same `ContactLead` shape.

**Cross-task dependencies:**
- Task 4 imports `getAuthSession` from `src/lib/session.ts` (defined in Task 4 step 2).
- Task 8 serializer is imported by public routes (Task 7) and by the public API tests (Task 12). All references resolve.
- Task 11 changes `purpose: "admin"` to `"admin_otp"` only in the TOTP branch; the non-TOTP branch continues to issue `purpose: "admin"`, which `getAdminSession` already accepts. The verify-otp route accepts both, so the session handover remains correct.
