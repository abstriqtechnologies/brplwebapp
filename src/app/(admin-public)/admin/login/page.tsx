"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Loader2,
    ShieldCheck,
    KeyRound,
    Lock,
    ArrowLeft,
    Check,
    Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

type Step = "phone" | "otp";

export default function AdminLoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            }
        >
            <LoginInner />
        </Suspense>
    );
}

function LoginInner() {
    const params = useSearchParams();
    const next = params.get("next") || "/admin/dashboard";
    const { toast } = useToast();

    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [resendIn, setResendIn] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const sendOtp = async (): Promise<boolean> => {
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        if (cleaned.length !== 10) {
            setError("Please enter a valid 10-digit mobile number");
            return false;
        }
        setError(null);
        setBusy(true);
        try {
            const res = await fetch("/api/admin/auth/send-otp", {
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
            const res = await fetch("/api/admin/auth/verify-otp", {
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
            const target = data.redirect || next;
            toast({ title: "Welcome back!" });
            // Hard navigation so cookies are committed before middleware runs.
            window.location.href = target;
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setOtp(Array(OTP_LENGTH).fill(""));
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
        const nextOtp = [...otp];
        nextOtp[i] = v.slice(-1);
        setOtp(nextOtp);
        if (v && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
        if (nextOtp.every((d) => d.length === 1)) void submitOtp(nextOtp.join(""));
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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-slate-50 dark:bg-slate-950">
            {/* Background image */}
            <div
                aria-hidden
                className="absolute inset-0 z-0 opacity-30 dark:opacity-20"
                style={{
                    backgroundImage: "url('/register-footer.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "top center",
                }}
            />

            {/* Back to site */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to site
            </Link>

            {/* Scoped keyframes */}
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .brpl-fade-up { animation: fadeUp 0.35s ease-out both; }
                @keyframes wiggle {
                    0%, 100% { transform: translateX(0); }
                    25%      { transform: translateX(-3px); }
                    75%      { transform: translateX(3px); }
                }
                .brpl-wiggle { animation: wiggle 0.4s ease-in-out; }
            `}</style>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/logo.webp"
                        alt="BRPL"
                        width={64}
                        height={64}
                        className="h-16 w-auto select-none drop-shadow-[0_0_30px_rgba(245,158,11,0.45)]"
                    />
                </div>

                {/* Glass card */}
                <div
                    key={step}
                    className={cn(
                        "brpl-fade-up rounded-3xl shadow-2xl shadow-black/20",
                        "backdrop-blur-xl bg-white/95 dark:bg-slate-900/85",
                        "border border-white/40 dark:border-slate-700/60",
                        "p-8 sm:p-10"
                    )}
                >
                    {/* Admin portal header */}
                    <div className="text-center mb-7">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
                            <ShieldCheck className="w-6 h-6 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Admin Portal
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Sign in to continue to administration
                        </p>
                    </div>

                    <StepIndicator step={step} />

                    <div className="mt-7">
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
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- Step indicator ---------- */

function StepIndicator({ step }: { step: Step }) {
    const steps: { key: Step; label: string }[] = [
        { key: "phone", label: "Mobile" },
        { key: "otp", label: "Verify" },
    ];
    const activeIdx = step === "phone" ? 0 : 1;
    const progressPct = step === "phone" ? 0 : 100;

    return (
        <div>
            <div className="flex items-center justify-center gap-3">
                {steps.map((s, i) => {
                    const completed = i < activeIdx;
                    const active = i === activeIdx;
                    return (
                        <div key={s.key} className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                                    completed && "bg-emerald-500 text-white",
                                    active && "bg-amber-500 text-white shadow-md shadow-amber-500/30",
                                    !completed && !active &&
                                        "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                )}
                            >
                                {completed ? (
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                ) : (
                                    i + 1
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-semibold tracking-wide transition-colors",
                                    active && "text-slate-900 dark:text-white",
                                    completed && "text-emerald-600 dark:text-emerald-400",
                                    !active && !completed && "text-slate-400 dark:text-slate-500"
                                )}
                            >
                                {s.label}
                            </span>
                            {i < steps.length - 1 && (
                                <span className="mx-1 h-px w-8 bg-slate-200 dark:bg-slate-700" />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Thin progress line */}
            <div className="relative mt-3 h-px bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                />
            </div>
        </div>
    );
}

/* ---------- Phone step ---------- */

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
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className={cn("space-y-5", error && "brpl-wiggle")}
            >
                <div>
                    <label htmlFor="phone" className="sr-only">
                        Mobile number
                    </label>
                    <div className="flex items-stretch h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/15 transition-all overflow-hidden">
                        <span className="inline-flex items-center px-4 text-sm font-bold tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-400 border-r border-amber-300/60 dark:border-amber-500/30">
                            +91
                        </span>
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) =>
                                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                            }
                            maxLength={10}
                            className="h-full flex-1 border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xl tracking-normal tabular-nums font-semibold placeholder:text-slate-300 placeholder:text-base placeholder:tracking-normal px-4"
                            required
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                        We&apos;ll text you a 4-digit code
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 text-center">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || phone.length !== 10}
                    className="w-full h-12 rounded-full font-bold text-base text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all"
                >
                    {busy ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        "Send verification code"
                    )}
                </Button>

                {/* Trust strip */}
                <div className="flex justify-center pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Secure &amp; encrypted
                    </div>
                </div>
            </form>
        </>
    );
}

/* ---------- OTP step ---------- */

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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 mb-4 transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change number
            </button>

            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
                    <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Enter verification code
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Sent to{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                        +91 {phone}
                    </span>
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className={cn("space-y-5", error && "brpl-wiggle")}
            >
                <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={onPaste}>
                    {otp.map((d, i) => {
                        const filled = d.length === 1;
                        return (
                            <div key={i} className="relative">
                                <input
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
                                    className={cn(
                                        "w-14 h-16 sm:w-16 sm:h-20 text-center rounded-xl border-2 bg-white dark:bg-slate-800",
                                        "font-mono text-3xl font-bold tracking-widest",
                                        "text-slate-900 dark:text-white",
                                        "transition-all duration-200 outline-none",
                                        "focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 focus:shadow-lg focus:shadow-amber-500/20 focus:-translate-y-0.5",
                                        filled
                                            ? "border-emerald-500 dark:border-emerald-500/80"
                                            : "border-slate-300 dark:border-slate-700"
                                    )}
                                    aria-label={`Digit ${i + 1}`}
                                />
                                {filled && (
                                    <Check
                                        className="absolute top-1 right-1 w-3.5 h-3.5 text-emerald-500 pointer-events-none"
                                        strokeWidth={3}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 font-medium",
                            otpExpiresIn > 0
                                ? "text-slate-500 dark:text-slate-400"
                                : "text-red-500"
                        )}
                    >
                        <Lock className="w-3.5 h-3.5" />
                        {otpExpiresIn > 0
                            ? `Expires in ${formatExpiry(otpExpiresIn)}`
                            : "OTP expired"}
                    </span>
                    {resendIn > 0 ? (
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                            Resend in {resendIn}s
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={busy}
                            className="text-amber-600 hover:text-amber-700 font-semibold disabled:opacity-50"
                        >
                            Resend OTP
                        </button>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 text-center">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || otp.some((d) => !d)}
                    className="w-full h-12 rounded-full font-bold text-base text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all"
                >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                </Button>
            </form>
        </>
    );
}