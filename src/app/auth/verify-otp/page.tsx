"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        }>
            <VerifyOtpInner />
        </Suspense>
    );
}

function VerifyOtpInner() {
    const router = useRouter();
    const params = useSearchParams();
    const phone = params.get("phone") || "";

    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(RESEND_SECONDS);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!phone) router.replace("/auth");
    }, [phone, router]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const handleChange = (i: number, v: string) => {
        if (!/^\d*$/.test(v)) return;
        const next = [...digits];
        next[i] = v.slice(-1);
        setDigits(next);
        if (v && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
        if (next.every((d) => d.length === 1)) void submit(next.join(""));
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            e.preventDefault();
            const next = pasted.split("");
            setDigits(next);
            inputRefs.current[OTP_LENGTH - 1]?.focus();
            void submit(pasted);
        }
    };

    const submit = async (otp: string) => {
        if (loading) return;
        setLoading(true);
        setError(null);
        setInfo(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Verification failed");
                setDigits(Array(OTP_LENGTH).fill(""));
                inputRefs.current[0]?.focus();
                return;
            }
            if (data.exists) {
                router.push(data.redirect || "/dashboard");
            } else {
                router.push(data.redirect || "/payment");
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setDigits(Array(OTP_LENGTH).fill(""));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendIn > 0) return;
        setError(null);
        setInfo(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to resend");
            setResendIn(RESEND_SECONDS);
            setInfo("A new OTP has been sent.");
        } catch (err: any) {
            setError(err.message || "Failed to resend OTP");
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <Link
                    href="/auth"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-600 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Change number
                </Link>

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
                        void submit(digits.join(""));
                    }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5"
                >
                    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                autoComplete={i === 0 ? "one-time-code" : "off"}
                                value={d}
                                onChange={(e) => handleChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                maxLength={1}
                                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                                aria-label={`Digit ${i + 1}`}
                            />
                        ))}
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
                        disabled={loading || digits.some((d) => !d)}
                        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                    </Button>

                    <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Didn't get the code?{" "}
                        {resendIn > 0 ? (
                            <span>Resend in {resendIn}s</span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResend}
                                className="text-amber-600 hover:text-amber-700 font-semibold"
                            >
                                Resend OTP
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
