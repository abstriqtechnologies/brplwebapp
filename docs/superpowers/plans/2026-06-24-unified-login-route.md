# Unified Login Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four auth-adjacent routes (`/auth`, `/auth/verify-otp`, `/auth/register`, `/registration`) with a single `/login` page that handles login and register via a server-side branch — one URL, no `?mode=` query parameter.

**Architecture:** One client component at `src/app/login/page.tsx` owns three steps (`phone → otp → register`) as React state. Server-side `/api/auth/verify-otp` already returns `exists: true` (login → dashboard) or `exists: false` (continue to register step). No router navigation between steps, no `?mode=` parameter. All other call sites get updated to point at `/login` instead of `/auth` or `/registration`.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, shadcn/ui primitives, lucide-react, Razorpay (existing integration), MongoDB (existing models), vitest.

**Reference spec:** [docs/superpowers/specs/2026-06-24-unified-login-route-design.md](../specs/2026-06-24-unified-login-route-design.md)

---

## Migration Order (do these in order)

The plan executes in five phases that match the migration order in the spec:

1. **Phase A — Create the new route.** Add `/login` and confirm it renders. Old routes still work alongside.
2. **Phase B — Update code-controlled links.** All internal `href`s, `redirect()`s, and `router.replace()`s point at `/login`. Old routes still on disk but unused.
3. **Phase C — Convert the registration shim to a 301.** Any CMS-customized `headerCtaLink: "/registration"` still lands on `/login`.
4. **Phase D — DB migration.** One-time update of any `SiteSettings` row where `headerCtaLink === "/registration"` or `floatingRegisterLink === "/registration"`.
5. **Phase E — Delete the old routes.** `/auth`, `/auth/verify-otp`, `/auth/register`, `/registration` removed. Final.

Each phase produces a working app. Phases A through D never break the user journey. Phase E is the only deletion step.

---

## File Structure

**Created:**
- `src/app/login/page.tsx` — the unified auth client. Three steps as internal React state.

**Deleted (Phase E):**
- `src/app/auth/page.tsx`
- `src/app/auth/verify-otp/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/` (directory, after files removed)
- `src/app/(main)/registration/page.tsx` (after Phase C has redirected it)

**Modified (Phase B):**
- `src/middleware.ts` — redirect targets
- `src/app/payment/page.tsx` — redirect target
- `src/app/payment/PaymentClient.tsx` — router.replace target
- `src/app/dashboard/page.tsx` — redirect target
- `src/app/dashboard/DashboardClient.tsx` — three router calls + one Link
- `src/app/api/payment/verify/route.ts` — `redirect` string in response
- `src/app/(main)/thank-you/ThankYouClient.tsx` — Link href
- `src/components/ClientProviders.tsx` — `CHROME_HIDDEN_PREFIXES`
- `src/components/Banner.tsx` — Link href
- `src/components/FloatingRegisterButton.tsx` — fallback default
- `src/components/ZoneDeadlineSection.tsx` — `router.push`
- `src/components/WhoWeAre.tsx` — Link href
- `src/components/SchemaMarkup.tsx` — `PATH_TO_LABEL` map
- `src/app/(admin)/admin/settings/page.tsx` — placeholder text
- `src/models/SiteSettings.ts` — defaults for two fields

**Modified (Phase C):**
- `src/app/(main)/registration/page.tsx` — convert from Next.js `redirect()` to `NextResponse` 301 with `Location` header (Phase C); then deleted in Phase E.

**Unchanged:**
- All `/api/auth/*` route files — server-side branching is already correct.
- `src/app/api/payment/create-order/route.ts` — already returns the right shape.
- `src/app/(admin-public)/admin/login/page.tsx` — separate admin concern.
- `src/app/payment/` directory — kept as a redirect shim (just updated target).

---

## Task 1: Create the unified `/login` page (Phase A)

**Files:**
- Create: `src/app/login/page.tsx`

This is the only new page. It owns three steps as React state. Reuses the existing `Button`, `Input`, `Loader2`, `useSiteSettings`, `useToast` primitives. Uses the existing Razorpay script loader.

- [ ] **Step 1: Create the directory and a stub page**

Run:
```bash
mkdir -p src/app/login
```

Create `src/app/login/page.tsx` with this exact content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, ShieldCheck, KeyRound, Lock, ArrowLeft, User, Mail, MapPin, Trophy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const REGISTRATION_FEE_DISPLAY = "₹1,499";

type Step = "phone" | "otp" | "register";

type RegisterForm = {
    name: string;
    email: string;
    role: "batsman" | "bowler" | "allrounder" | "wicketkeeper";
    state: string;
    city: string;
};

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            }
        >
            <LoginClient />
        </Suspense>
    );
}

function LoginClient() {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get("next") || "/dashboard";
    const { settings } = useSiteSettings();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [resendIn, setResendIn] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [form, setForm] = useState<RegisterForm>({
        name: "",
        email: "",
        role: "batsman",
        state: "",
        city: "",
    });

    /* countdown ticks */
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);
    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    /* --- API helpers --- */

    const sendOtp = async (): Promise<boolean> => {
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        if (cleaned.length !== 10) {
            setError("Please enter a valid 10-digit mobile number");
            return false;
        }
        setError(null);
        setInfo(null);
        setBusy(true);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            setPhone(cleaned);
            setOtp(Array(OTP_LENGTH).fill(""));
            setOtpExpiresIn(Math.floor(data.expiresInSec ?? 300));
            setResendIn(RESEND_SECONDS);
            setStep("otp");
            return true;
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const submitOtp = async (code: string) => {
        if (busy || code.length !== OTP_LENGTH) return;
        setBusy(true);
        setError(null);
        setInfo(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp: code }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || "Verification failed");
                setOtp(Array(OTP_LENGTH).fill(""));
                return;
            }
            if (data.exists) {
                toast({ title: "Welcome back!" });
                router.replace(next);
                return;
            }
            // New user: advance to register step (do NOT router.push)
            setStep("register");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setOtp(Array(OTP_LENGTH).fill(""));
        } finally {
            setBusy(false);
        }
    };

    const startPayment = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not start payment");

            setOrderId(data.orderId);

            // Lazily load Razorpay script
            const w = window as any;
            if (!w.Razorpay) {
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
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: settings?.siteName || "BRPL",
                description: "Player Registration",
                order_id: data.orderId,
                prefill: { contact: phone },
                handler: async (resp: any) => {
                    setPaymentId(resp.razorpay_payment_id);
                    const v = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: resp.razorpay_order_id,
                            paymentId: resp.razorpay_payment_id,
                            signature: resp.razorpay_signature,
                        }),
                    });
                    const vData = await v.json().catch(() => ({}));
                    if (v.ok) {
                        toast({ title: "Payment successful", description: "Now complete your details." });
                    } else {
                        toast({ variant: "destructive", title: "Verification failed", description: vData.error });
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

    const submitRegister = async () => {
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
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, paymentId, orderId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Registration failed");
            toast({ title: "Welcome to BRPL!" });
            router.replace(data.redirect || next);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    /* --- OTP input behavior --- */
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    useEffect(() => {
        if (step === "otp") otpRefs.current[0]?.focus();
    }, [step]);

    const handleOtpChange = (i: number, v: string) => {
        if (!/^\d*$/.test(v)) return;
        const next = [...otp];
        next[i] = v.slice(-1);
        setOtp(next);
        if (v && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
        if (next.every((d) => d.length === 1)) void submitOtp(next.join(""));
    };
    const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            e.preventDefault();
            const arr = pasted.split("");
            setOtp(arr);
            otpRefs.current[OTP_LENGTH - 1]?.focus();
            void submitOtp(pasted);
        }
    };

    /* --- Render --- */
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {step === "phone" && (
                    <PhoneStep
                        phone={phone}
                        setPhone={setPhone}
                        error={error}
                        busy={busy}
                        onSubmit={sendOtp}
                    />
                )}
                {step === "otp" && (
                    <OtpStep
                        phone={phone}
                        otp={otp}
                        error={error}
                        info={info}
                        busy={busy}
                        otpExpiresIn={otpExpiresIn}
                        resendIn={resendIn}
                        otpRefs={otpRefs}
                        onChange={handleOtpChange}
                        onKeyDown={handleOtpKeyDown}
                        onPaste={handleOtpPaste}
                        onResend={() => void sendOtp()}
                        onEditNumber={() => {
                            setStep("phone");
                            setOtp(Array(OTP_LENGTH).fill(""));
                            setError(null);
                            setInfo(null);
                        }}
                        onSubmit={() => void submitOtp(otp.join(""))}
                    />
                )}
                {step === "register" && (
                    <RegisterStep
                        phone={phone}
                        orderId={orderId}
                        paymentId={paymentId}
                        busy={busy}
                        form={form}
                        setForm={setForm}
                        onPay={() => void startPayment()}
                        onSubmit={() => void submitRegister()}
                    />
                )}
                <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
                    By continuing, you agree to BRPL&apos;s{" "}
                    <Link href="/terms-and-conditions" className="text-amber-600 hover:underline font-semibold">
                        Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy-policy" className="text-amber-600 hover:underline font-semibold">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}

/* ---------- Step subcomponents (presentation only) ---------- */

function PhoneStep(props: {
    phone: string;
    setPhone: (v: string) => void;
    error: string | null;
    busy: boolean;
    onSubmit: () => void;
}) {
    const { phone, setPhone, error, busy, onSubmit } = props;
    return (
        <>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                    <Phone className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome to BRPL</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Enter your mobile number. We&apos;ll send you a one-time password.
                </p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5"
            >
                <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mobile Number
                    </label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                            +91
                        </span>
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            maxLength={10}
                            className="rounded-l-none text-lg tracking-wider h-12"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || phone.length !== 10}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                </Button>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center pt-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your information is secure and will not be shared.</span>
                </div>
            </form>
        </>
    );
}

function OtpStep(props: {
    phone: string;
    otp: string[];
    error: string | null;
    info: string | null;
    busy: boolean;
    otpExpiresIn: number;
    resendIn: number;
    otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onChange: (i: number, v: string) => void;
    onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
    onResend: () => void;
    onEditNumber: () => void;
    onSubmit: () => void;
}) {
    const {
        phone,
        otp,
        error,
        info,
        busy,
        otpExpiresIn,
        resendIn,
        otpRefs,
        onChange,
        onKeyDown,
        onPaste,
        onResend,
        onEditNumber,
        onSubmit,
    } = props;
    const formatExpiry = (s: number) => {
        if (s <= 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
    };
    return (
        <>
            <button
                type="button"
                onClick={onEditNumber}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-600 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Change number
            </button>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                    <KeyRound className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Verify OTP</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Enter the 6-digit code we sent to{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">+91 {phone}</span>
                </p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5"
            >
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
                    {otp.map((d, i) => (
                        <input
                            key={i}
                            ref={(el) => {
                                otpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={i === 0 ? "one-time-code" : "off"}
                            value={d}
                            onChange={(e) => onChange(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            maxLength={1}
                            className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                            aria-label={`Digit ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {otpExpiresIn > 0 ? `Expires in ${formatExpiry(otpExpiresIn)}` : "OTP expired"}
                    </span>
                    {resendIn > 0 ? (
                        <span>Resend in {resendIn}s</span>
                    ) : (
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={busy}
                            className="text-amber-600 hover:text-amber-700 font-semibold"
                        >
                            Resend OTP
                        </button>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 text-center">
                        {error}
                    </p>
                )}
                {info && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2 text-center">
                        {info}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || otp.some((d) => !d)}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                </Button>
            </form>
        </>
    );
}

const ROLES: Array<{ value: RegisterForm["role"]; label: string; description: string }> = [
    { value: "batsman", label: "Batsman", description: "Specialist batter" },
    { value: "bowler", label: "Bowler", description: "Specialist bowler" },
    { value: "allrounder", label: "All-Rounder", description: "Bat & bowl" },
    { value: "wicketkeeper", label: "Wicket-Keeper", description: "Keeper & batter" },
];

function RegisterStep(props: {
    phone: string;
    orderId: string | null;
    paymentId: string | null;
    busy: boolean;
    form: RegisterForm;
    setForm: (next: RegisterForm) => void;
    onPay: () => void;
    onSubmit: () => void;
}) {
    const { orderId, paymentId, busy, form, setForm, onPay, onSubmit } = props;

    return (
        <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-4">
                    <Check className="w-7 h-7 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Complete your profile</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {paymentId
                        ? "Payment received ✓ — tell us a bit about you to finish registration."
                        : "Complete payment to finish your registration."}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                {!paymentId && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">
                                Registration Fee
                            </span>
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                                {REGISTRATION_FEE_DISPLAY}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Covers trials, official kit and processing.
                        </p>
                        <Button
                            type="button"
                            onClick={onPay}
                            disabled={busy}
                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                        >
                            {busy ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Pay {REGISTRATION_FEE_DISPLAY}</>
                            )}
                        </Button>
                        {orderId && !paymentId && (
                            <p className="text-xs text-slate-500 text-center mt-3">
                                Complete the payment in the Razorpay window, then return here.
                            </p>
                        )}
                    </div>
                )}

                {paymentId && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSubmit();
                        }}
                        className="space-y-5"
                    >
                        {/* Role */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                Your playing role
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {ROLES.map((r) => {
                                    const active = form.role === r.value;
                                    return (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, role: r.value })}
                                            className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                                                active
                                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-md"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                            }`}
                                        >
                                            <Trophy
                                                className={`w-7 h-7 ${active ? "text-amber-600" : "text-slate-500"}`}
                                            />
                                            <span
                                                className={`text-sm font-bold ${
                                                    active
                                                        ? "text-amber-700 dark:text-amber-300"
                                                        : "text-slate-700 dark:text-slate-300"
                                                }`}
                                            >
                                                {r.label}
                                            </span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight text-center">
                                                {r.description}
                                            </span>
                                            {active && (
                                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Personal */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <User className="w-4 h-4 inline mr-1" />
                                    Full name
                                </label>
                                <Input
                                    placeholder="Your full name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <Mail className="w-4 h-4 inline mr-1" />
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    State
                                </label>
                                <Input
                                    placeholder="e.g. Maharashtra"
                                    value={form.state}
                                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    City
                                </label>
                                <Input
                                    placeholder="e.g. Mumbai"
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    className="h-11"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            disabled={busy}
                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                        >
                            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: no errors. (Pre-existing errors in other files are acceptable; only flag errors mentioning `src/app/login/page.tsx`.)

- [ ] **Step 3: Verify the page renders in dev**

Run: `npm run dev` (in background)
Then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```
Expected: `200`.

Stop the dev server (`TaskStop` or `Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "feat(auth): add unified /login page with three-step state machine"
```

---

## Task 2: Update middleware redirect target (Phase B)

**Files:**
- Modify: `src/middleware.ts:19,30`

Both redirects send unauthenticated dashboard requests to `/auth`. Update to `/login`.

- [ ] **Step 1: Edit both lines**

Edit `src/middleware.ts`. Replace each occurrence of `/auth"` (with closing quote) with `/login"`. The file is small; the result should be:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-insecure-secret-change-me"
);

const PROTECTED_PATHS = ["/dashboard"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (!PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.next();
    }

    const token = req.cookies.get("brpl_auth")?.value;
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (payload.purpose !== "auth") throw new Error("wrong purpose");
        return NextResponse.next();
    } catch {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        const res = NextResponse.redirect(url);
        res.cookies.delete("brpl_auth");
        return res;
    }
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 2: Verify no other `/auth"` occurrences remain**

Run: `grep -n '/auth"' src/middleware.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): middleware redirects unauth to /login"
```

---

## Task 3: Update payment redirect shims (Phase B)

**Files:**
- Modify: `src/app/payment/page.tsx`
- Modify: `src/app/payment/PaymentClient.tsx`

Both currently redirect to `/auth?mode=register&next=/dashboard`. The mode param is gone; the target becomes `/login?next=/dashboard`.

- [ ] **Step 1: Update payment/page.tsx**

Replace the contents of `src/app/payment/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PaymentPage() {
    redirect("/login?next=/dashboard");
}
```

- [ ] **Step 2: Update payment/PaymentClient.tsx**

Replace the contents of `src/app/payment/PaymentClient.tsx` with:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentClient() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/login?next=/dashboard");
    }, [router]);
    return null;
}
```

- [ ] **Step 3: Verify no `/auth` references remain in payment**

Run: `grep -rn '/auth' src/app/payment/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/payment/page.tsx src/app/payment/PaymentClient.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): payment shim now points at /login"
```

---

## Task 4: Update dashboard redirects (Phase B)

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Update dashboard/page.tsx**

In `src/app/dashboard/page.tsx`, change line 11 from:

```ts
    if (!session) redirect("/auth?next=/dashboard");
```

to:

```ts
    if (!session) redirect("/login?next=/dashboard");
```

- [ ] **Step 2: Update DashboardClient.tsx — three router calls**

In `src/app/dashboard/DashboardClient.tsx`, make four edits. Each replacement is exact:

Edit 1 (line 55):
- Old: `router.replace("/auth?next=/dashboard");`
- New: `router.replace("/login?next=/dashboard");`

Edit 2 (line 60):
- Old: `.catch(() => router.replace("/auth?next=/dashboard"))`
- New: `.catch(() => router.replace("/login?next=/dashboard"))`

Edit 3 (line 68):
- Old: `router.replace("/auth");`
- New: `router.replace("/login");`

Edit 4 (line 251):
- Old: `<Link href="/auth?mode=register">Continue</Link>`
- New: `<Link href="/login">Continue</Link>`

- [ ] **Step 3: Verify no `/auth` references remain in dashboard**

Run: `grep -rn '/auth' src/app/dashboard/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/DashboardClient.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): dashboard redirects unauth/logout to /login"
```

---

## Task 5: Update payment verify API redirect string (Phase B)

**Files:**
- Modify: `src/app/api/payment/verify/route.ts:43`

The `/api/payment/verify` response includes a `redirect` field used by older clients. Update to `/login?next=/dashboard`.

- [ ] **Step 1: Edit the redirect string**

In `src/app/api/payment/verify/route.ts`, change line 43 from:

```ts
            redirect: "/auth?mode=register&next=/dashboard",
```

to:

```ts
            redirect: "/login?next=/dashboard",
```

- [ ] **Step 2: Verify no `/auth` references remain**

Run: `grep -rn '/auth' src/app/api/payment/`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/payment/verify/route.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): payment verify redirect → /login"
```

---

## Task 6: Update thank-you page sign-in link (Phase B)

**Files:**
- Modify: `src/app/(main)/thank-you/ThankYouClient.tsx:102`

- [ ] **Step 1: Edit the link**

In `src/app/(main)/thank-you/ThankYouClient.tsx`, change line 102 from:

```tsx
                            <Link href="/auth?mode=login&next=/dashboard">
```

to:

```tsx
                            <Link href="/login?next=/dashboard">
```

- [ ] **Step 2: Verify no `/auth` references remain in thank-you**

Run: `grep -rn '/auth' 'src/app/(main)/thank-you/'`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(main\)/thank-you/ThankYouClient.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): thank-you sign-in link → /login"
```

---

## Task 7: Update chrome-hidden prefixes (Phase B)

**Files:**
- Modify: `src/components/ClientProviders.tsx:13`

The chrome (header/footer) is hidden on `/auth` so the auth page can take the full viewport. Update the prefix list to `/login`.

- [ ] **Step 1: Edit the prefix list**

In `src/components/ClientProviders.tsx`, change line 13 from:

```ts
const CHROME_HIDDEN_PREFIXES = ["/auth"];
```

to:

```ts
const CHROME_HIDDEN_PREFIXES = ["/login"];
```

- [ ] **Step 2: Verify no `/auth` references remain in ClientProviders**

Run: `grep -n '/auth' src/components/ClientProviders.tsx`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ClientProviders.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): hide chrome on /login"
```

---

## Task 8: Update marketing component hrefs (Phase B)

**Files:**
- Modify: `src/components/Banner.tsx:86`
- Modify: `src/components/WhoWeAre.tsx:112`
- Modify: `src/components/ZoneDeadlineSection.tsx:106`

- [ ] **Step 1: Update Banner.tsx**

In `src/components/Banner.tsx`, change line 86 from:

```tsx
                      <Link href="/registration">
```

to:

```tsx
                      <Link href="/login">
```

- [ ] **Step 2: Update WhoWeAre.tsx**

In `src/components/WhoWeAre.tsx`, change line 112 from:

```tsx
                            <Link href="/registration">
```

to:

```tsx
                            <Link href="/login">
```

- [ ] **Step 3: Update ZoneDeadlineSection.tsx**

In `src/components/ZoneDeadlineSection.tsx`, change line 106 from:

```tsx
                                router.push("/registration");
```

to:

```tsx
                                router.push("/login");
```

- [ ] **Step 4: Verify no `/registration` references remain in these three components**

Run: `grep -n '/registration' src/components/Banner.tsx src/components/WhoWeAre.tsx src/components/ZoneDeadlineSection.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/Banner.tsx src/components/WhoWeAre.tsx src/components/ZoneDeadlineSection.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): marketing CTAs → /login"
```

---

## Task 9: Update SchemaMarkup route label map (Phase B)

**Files:**
- Modify: `src/components/SchemaMarkup.tsx:20`

Breadcrumbs use this map to label paths. We add a `/login` entry. We also remove `/auth` since it's being deleted in Phase E, but during Phase B it's still on disk so its label may still apply. We leave `/auth` for now and remove it in Task 14 (Phase E).

- [ ] **Step 1: Add /login entry**

In `src/components/SchemaMarkup.tsx`, change the `PATH_TO_LABEL` map. Replace the existing `"/auth": "Login",` line at the end of the map with:

```ts
    "/login": "Login",
    "/auth": "Login",
```

i.e., insert the `/login` entry just before `/auth`. After this edit the map ends with:

```ts
    "/registration": "Registration",
    "/contact-us": "Contact Us",
    "/privacy-policy": "Privacy Policy",
    "/terms-and-conditions": "Terms & Conditions",
    "/login": "Login",
    "/auth": "Login",
```

- [ ] **Step 2: Verify**

Run: `grep -n '"/login"\|"/auth"' src/components/SchemaMarkup.tsx`
Expected: both lines visible, `/login` first.

- [ ] **Step 3: Commit**

```bash
git add src/components/SchemaMarkup.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): add /login to breadcrumb label map"
```

---

## Task 10: Update FloatingRegisterButton default and admin settings placeholder (Phase B)

**Files:**
- Modify: `src/components/FloatingRegisterButton.tsx:26`
- Modify: `src/app/(admin)/admin/settings/page.tsx:47`

- [ ] **Step 1: Update FloatingRegisterButton fallback default**

In `src/components/FloatingRegisterButton.tsx`, change line 26 from:

```tsx
    const href: string = settings.floatingRegisterLink || "/registration";
```

to:

```tsx
    const href: string = settings.floatingRegisterLink || "/login";
```

- [ ] **Step 2: Update admin settings placeholder text**

In `src/app/(admin)/admin/settings/page.tsx`, change line 47 from:

```tsx
                { name: "headerCtaLink", label: "Header CTA Link", type: "text", placeholder: "/registration" },
```

to:

```tsx
                { name: "headerCtaLink", label: "Header CTA Link", type: "text", placeholder: "/login" },
```

- [ ] **Step 3: Verify no `/registration` placeholder/defaults remain in these two files**

Run: `grep -n '/registration' src/components/FloatingRegisterButton.tsx 'src/app/(admin)/admin/settings/page.tsx'`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/FloatingRegisterButton.tsx src/app/\(admin\)/admin/settings/page.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): floating button default + admin placeholder → /login"
```

---

## Task 11: Update SiteSettings model defaults (Phase B)

**Files:**
- Modify: `src/models/SiteSettings.ts:118,127`

Two Mongoose field defaults need updating so newly-created sites ship with `/login` instead of `/registration`. Existing rows are migrated in Task 13.

- [ ] **Step 1: Edit both defaults**

In `src/models/SiteSettings.ts`, change:

Line 118 from:
```ts
        headerCtaLink: { type: String, default: "/registration" },
```
to:
```ts
        headerCtaLink: { type: String, default: "/login" },
```

Line 127 from:
```ts
        floatingRegisterLink: { type: String, default: "/registration" },
```
to:
```ts
        floatingRegisterLink: { type: String, default: "/login" },
```

- [ ] **Step 2: Verify**

Run: `grep -n '"/registration"' src/models/SiteSettings.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/models/SiteSettings.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): SiteSettings defaults → /login"
```

---

## Task 12: Convert /registration shim to 301 redirect (Phase C)

**Files:**
- Modify: `src/app/(main)/registration/page.tsx`

`src/app/(main)/registration/page.tsx` currently uses Next.js's `redirect()` which returns 307. We want a 301 (permanent) so SEO consolidates on `/login`. Replace with a `NextResponse` redirect.

- [ ] **Step 1: Replace the file contents**

Replace the contents of `src/app/(main)/registration/page.tsx` with:

```tsx
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    // 301: any old CMS-customized headerCtaLink: "/registration" continues to land on /login.
    // After Task 13 migrates the DB, no row will point here. Removed in Task 14 (Phase E).
    return NextResponse.redirect(new URL("/login", "http://placeholder"), {
        status: 301,
        headers: { Location: "/login" },
    });
}
```

**Important:** Next.js requires `NextResponse.redirect` to take a URL. The `http://placeholder` is required by the type signature but the `Location` header overrides it. This pattern is the standard way to issue a relative 301 in Next.js App Router route handlers.

- [ ] **Step 2: Verify the file type-checks**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors mentioning `src/app/(main)/registration/page.tsx`.

- [ ] **Step 3: Smoke test (dev server)**

Run: `npm run dev` (in background)
Then:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/registration
```
Expected: `301 /login`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/registration/page.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): /registration now 301s to /login"
```

---

## Task 13: Migrate SiteSettings DB rows (Phase D)

**Files:**
- Create: `scripts/migrate-registration-links.ts`

A one-shot script that updates any `SiteSettings` row whose `headerCtaLink` or `floatingRegisterLink` is exactly `"/registration"` to `"/login"`. Idempotent.

- [ ] **Step 1: Inspect existing rows (sanity check)**

Run a one-liner with the existing project setup. This requires the `MONGODB_URI` env var to be set; if it isn't, skip and note in commit message.

```bash
node -e "require('dotenv').config({path:'.env.local'}); const {connectDB}=require('./src/lib/mongodb.ts'); const M=require('./src/models/SiteSettings.ts'); connectDB().then(async()=>{const r=await M.default.find({}).select('headerCtaLink floatingRegisterLink').lean();console.log(JSON.stringify(r,null,2));process.exit(0)});" 2>&1 | tail -30
```

Expected: a JSON array of `SiteSettings` rows showing current values. (If the env vars aren't loadable via `node -e`, defer this to the script in Step 3, which uses `tsx`.)

- [ ] **Step 2: Create the migration script**

Create `scripts/migrate-registration-links.ts` with this exact content:

```ts
/**
 * One-shot migration: rewrite SiteSettings rows whose headerCtaLink or
 * floatingRegisterLink is the old "/registration" path to point at "/login".
 *
 * Idempotent: only touches rows that match. Safe to re-run.
 *
 * Run with: npx tsx scripts/migrate-registration-links.ts
 */
import { connectDB } from "../src/lib/mongodb";
import SiteSettings from "../src/models/SiteSettings";

const NEW = "/login";
const OLD = "/registration";

async function main() {
    await connectDB();

    const filter = {
        $or: [{ headerCtaLink: OLD }, { floatingRegisterLink: OLD }],
    };

    const before = await SiteSettings.find(filter).select("_id headerCtaLink floatingRegisterLink").lean();
    console.log(`Found ${before.length} row(s) with ${OLD}:`);
    for (const row of before) {
        console.log(`  _id=${row._id} headerCtaLink=${row.headerCtaLink} floatingRegisterLink=${row.floatingRegisterLink}`);
    }

    if (before.length === 0) {
        console.log("Nothing to update.");
        return;
    }

    const result = await SiteSettings.updateMany(filter, [
        {
            $set: {
                headerCtaLink: {
                    $cond: [{ $eq: ["$headerCtaLink", OLD] }, NEW, "$headerCtaLink"],
                },
                floatingRegisterLink: {
                    $cond: [{ $eq: ["$floatingRegisterLink", OLD] }, NEW, "$floatingRegisterLink"],
                },
            },
        },
    ]);

    console.log(`Updated ${result.modifiedCount} row(s).`);

    const after = await SiteSettings.find(filter).select("_id headerCtaLink floatingRegisterLink").lean();
    console.log(`Rows still matching ${OLD}: ${after.length}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
```

- [ ] **Step 3: Run the migration**

Run: `npx tsx scripts/migrate-registration-links.ts`
Expected: prints the rows that matched, then `Updated N row(s).` and `Rows still matching /registration: 0`. (N may be 0 if no rows had the old value; that's fine.)

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-registration-links.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "chore(auth): add SiteSettings migration script for /registration → /login"
```

Note: do **not** commit the DB change itself. The migration runs against the live DB and is captured by the next backup, not by git.

- [ ] **Step 5: Verify no DB row still references /registration**

Re-run the script. Expected: `Found 0 row(s)` and `Nothing to update.`

---

## Task 14: Delete old auth and registration pages (Phase E)

**Files:**
- Delete: `src/app/auth/page.tsx`
- Delete: `src/app/auth/verify-otp/page.tsx`
- Delete: `src/app/auth/register/page.tsx`
- Delete: `src/app/auth/` directory (after files removed)
- Delete: `src/app/(main)/registration/page.tsx`
- Delete: `src/app/(main)/registration/` directory (after file removed)

- [ ] **Step 1: Remove the files**

Run:
```bash
rm src/app/auth/page.tsx \
   src/app/auth/verify-otp/page.tsx \
   src/app/auth/register/page.tsx
rmdir src/app/auth/verify-otp src/app/auth/register src/app/auth

rm src/app/\(main\)/registration/page.tsx
rmdir src/app/\(main\)/registration
```

Expected: each command exits 0. If `rmdir` reports "Directory not empty" because of stray files (`.DS_Store`, etc.), inspect with `ls -la` before manually removing only the stray files. Do not force-remove files you didn't expect.

- [ ] **Step 2: Verify no references to /auth or /registration remain anywhere in src/**

Run:
```bash
grep -rn '/auth' src/ || echo "no /auth matches"
grep -rn '/registration' src/ || echo "no /registration matches"
```
Expected: both print "no ... matches". (The `PATH_TO_LABEL` entry for `/auth` is already covered by the grep; we already added `/login` to the map in Task 9. Remove the `/auth` line from `PATH_TO_LABEL` as part of this task.)

- [ ] **Step 3: Remove /auth entry from SchemaMarkup**

In `src/components/SchemaMarkup.tsx`, the `PATH_TO_LABEL` map currently has both:
```ts
    "/login": "Login",
    "/auth": "Login",
```
Remove the `"/auth": "Login",` line. The map should end with `"/login": "Login",`.

- [ ] **Step 4: Build the project**

Run: `npm run build 2>&1 | tail -40`
Expected: build succeeds. If it complains about missing routes, re-check Step 2.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): delete /auth, /auth/verify-otp, /auth/register, /registration routes"
```

---

## Task 15: Final acceptance check

**Files:** none. This task verifies the acceptance criteria from the spec.

- [ ] **Step 1: Walk the phone step in a browser**

Run: `npm run dev` (in background)
Open `http://localhost:3000/login` in a browser.

Verify:
- Page renders without errors.
- Mobile input accepts 10 digits; non-digits are stripped.
- "Send OTP" disabled until input is 10 digits.
- Clicking Send with a valid number advances to the OTP step (no URL change).

- [ ] **Step 2: Verify the /auth URL is gone**

Visit `http://localhost:3000/auth` and `http://localhost:3000/registration`. Both should return 404.

- [ ] **Step 3: Verify the redirect-after-login convention**

Visit `http://localhost:3000/login?next=/foo` in a browser. The page renders. (You can't complete the full flow without a real OTP, but the page loads with `?next=/foo` honored.)

Run:
```bash
curl -s 'http://localhost:3000/login?next=/foo' | grep -o 'next\|/foo' | head -5
```
Expected: at least one match.

- [ ] **Step 4: Verify the middleware redirect**

With no auth cookie, visit `http://localhost:3000/dashboard`. Expected: redirects to `/login?next=/dashboard` (not `/auth`).

- [ ] **Step 5: Verify the chrome is hidden on /login**

On `/login`, the global `<Header />` and `<Footer />` should not render (only the login card and Terms/Privacy footer text inside the card). On any other page (e.g. `/about-us`), they should render.

- [ ] **Step 6: Stop the dev server**

`Ctrl+C` in the terminal that ran `npm run dev`.

- [ ] **Step 7: Final commit (if any cleanup needed)**

If any cleanup was required (e.g. unused imports introduced by deletion), commit it:

```bash
git status --short
```

If there are uncommitted changes:
```bash
git add -A
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "chore(auth): post-deletion cleanup"
```

Otherwise, skip this step.

---

## Self-Review

**1. Spec coverage:**

| Spec requirement | Task |
|---|---|
| `/login` page with three internal steps | Task 1 |
| Phone step with `+91` prefix, 10-digit validation | Task 1 (`PhoneStep`) |
| OTP step with 6 boxes, auto-advance, paste, resend, edit-number | Task 1 (`OtpStep`) |
| Register step with payment card + profile form | Task 1 (`RegisterStep`) |
| Server-side branching: `exists: true` → dashboard, `exists: false` → step=register | Task 1 (`submitOtp`) |
| `?next=` query param respected | Task 1 (`useSearchParams`) |
| Update middleware | Task 2 |
| Update payment shim | Task 3 |
| Update dashboard redirects | Task 4 |
| Update `/api/payment/verify` redirect string | Task 5 |
| Update thank-you link | Task 6 |
| Update chrome-hidden prefixes | Task 7 |
| Update marketing component hrefs (Banner, WhoWeAre, ZoneDeadlineSection) | Task 8 |
| Update SchemaMarkup label map | Tasks 9 + 14 |
| Update FloatingRegisterButton default | Task 10 |
| Update admin settings placeholder | Task 10 |
| Update SiteSettings model defaults | Task 11 |
| Convert `/registration` shim to 301 | Task 12 |
| One-time DB migration of `SiteSettings` rows | Task 13 |
| Delete old pages | Task 14 |
| Final acceptance verification | Task 15 |

All acceptance criteria from the spec are covered.

**2. Placeholder scan:** No "TBD", "TODO", or "implement later" markers. Every step shows full code or full commands.

**3. Type consistency:**

- `Step` is `"phone" | "otp" | "register"` everywhere (Task 1).
- `RegisterForm` is defined once in Task 1 and used by `RegisterStep` only.
- `next` default is `"/dashboard"` — matches existing middleware convention (middleware passes `?next=/dashboard`; this default catches the case where `?next` is missing).
- `LoginClient`'s child component props are typed explicitly in Task 1 and consistent across all three step components.
- `phone` is `string` (cleaned to 10 digits); `otp` is `string[]` of length 6; `orderId`/`paymentId` are `string | null`. Consistent with Task 1 and with the existing API responses.
- `useSearchParams` returns `ReadonlyURLSearchParams | null`; we read `params.get("next")` only after the `Suspense` boundary, which Next.js guarantees will provide a non-null params object once the boundary resolves. The `|| "/dashboard"` default handles a missing key.

All types consistent. Plan is ready.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-24-unified-login-route.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration with isolated context per task.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, with batch execution and checkpoints for review.

Which approach?
