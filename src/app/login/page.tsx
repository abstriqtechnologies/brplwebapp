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
import { loadRazorpayScript } from "@/hooks/useRazorpayScript";

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

            // Lazily load Razorpay script via shared helper (promise-deduped, typed window.Razorpay).
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error("Failed to load Razorpay");

            const rzp = new window.Razorpay!({
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
