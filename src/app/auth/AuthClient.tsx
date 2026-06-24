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
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", role: "batsman", state: "", city: "" });
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
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

    const sendOtp = async () => {
        if (!/^\d{10}$/.test(phone)) {
            toast({ variant: "destructive", title: "Invalid phone", description: "Enter a 10-digit mobile number." });
            return false;
        }
        setBusy(true);
        try {
            const res = await api.post<{ expiresInSec: number }>("/api/auth/send-otp", { phone });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Could not send OTP" });
                return false;
            }
            setOtpExpiresIn(Math.floor(res.data?.expiresInSec ?? 300));
            setResendIn(60);
            setStep("otp");
            return true;
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const submitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendOtp();
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length !== 6) return;
        setBusy(true);
        try {
            const res = await api.post<{ exists: boolean; user?: any; redirect?: string }>(
                "/api/auth/verify-otp",
                { phone, otp: code }
            );
            if (!res.ok) {
                toast({ variant: "destructive", title: "Incorrect OTP", description: res.error || "Try again" });
                return;
            }
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
        setBusy(true);
        try {
            const res = await api.post<{ orderId: string; amount: number; currency: string; key: string }>(
                "/api/payment/create-order"
            );
            if (!res.ok) {
                toast({ variant: "destructive", title: "Payment init failed", description: res.error });
                return;
            }
            setOrderId(res.data.orderId);
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
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-slate-700 hover:text-amber-600"
            >
                <ArrowLeft className="w-4 h-4" /> Back to site
            </Link>
            <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl p-8">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {step === "register" ? "Complete Registration" : "Sign in to BRPL"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {step === "phone" &&
                            (initialMode === "register"
                                ? "Enter your mobile to receive an OTP"
                                : "Enter your registered mobile to sign in")}
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
                                <Input
                                    id="phone"
                                    inputMode="numeric"
                                    maxLength={10}
                                    className="pl-10"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                            disabled={busy}
                        >
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Send OTP
                        </Button>
                        <p className="text-xs text-slate-500 text-center">
                            {initialMode === "register" ? (
                                <>
                                    Already registered?{" "}
                                    <Link
                                        className="text-amber-600 hover:underline"
                                        href={`/auth?mode=login&next=${encodeURIComponent(next)}`}
                                    >
                                        Sign in
                                    </Link>
                                </>
                            ) : (
                                <>
                                    New here?{" "}
                                    <Link
                                        className="text-amber-600 hover:underline"
                                        href={`/auth?mode=register&next=${encodeURIComponent(next)}`}
                                    >
                                        Create an account
                                    </Link>
                                </>
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
                                    ref={(el) => {
                                        otpRefs.current[i] = el;
                                    }}
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
                            {otpExpiresIn > 0
                                ? `Expires in ${Math.floor(otpExpiresIn / 60)}:${String(otpExpiresIn % 60).padStart(2, "0")}`
                                : "OTP expired"}
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                            disabled={busy || otp.join("").length !== 6}
                        >
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Verify
                        </Button>
                        <div className="text-xs text-slate-500 text-center">
                            {resendIn > 0 ? (
                                `Resend in ${resendIn}s`
                            ) : (
                                <button
                                    type="button"
                                    className="text-amber-600 hover:underline"
                                    onClick={sendOtp}
                                    disabled={busy}
                                >
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
                                <p className="text-amber-800 mb-3">
                                    A one-time fee covers trials, kit, and processing.
                                </p>
                                <Button
                                    type="button"
                                    onClick={startPayment}
                                    className="bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                                    disabled={busy}
                                >
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
                                    <Input
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Email *</Label>
                                    <Input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Role *</Label>
                                        <select
                                            className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white"
                                            value={form.role}
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        >
                                            <option value="batsman">Batsman</option>
                                            <option value="bowler">Bowler</option>
                                            <option value="allrounder">All-rounder</option>
                                            <option value="wicketkeeper">Wicket-keeper</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>State *</Label>
                                        <Input
                                            required
                                            value={form.state}
                                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>City *</Label>
                                    <Input
                                        required
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold"
                                    disabled={busy}
                                >
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
