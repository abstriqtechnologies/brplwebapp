"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
    isValidPhone,
    isCompleteOtp,
    formatOtpExpiry,
    REGISTRATION_FEE_DISPLAY,
} from "./auth-helpers";
import { AuthShell, AuthCard, StepPill, AuthField, PhoneInput, OtpInput, PrimaryButton } from "./auth-components";

type Step = "phone" | "otp" | "register";

const FALLBACK_NEXT = "/dashboard";

const STEP_LABEL: Record<Step, string> = {
    phone: "Step 01 of 03 · Mobile",
    otp: "Step 02 of 03 · Verify",
    register: "Step 03 of 03 · Register",
};

const STEP_TITLE = {
    phone: (mode: "register" | "login") =>
        mode === "register" ? "Welcome to BRPL" : "Welcome back",
    otp: () => "Enter the code",
    register: () => "Final stretch",
} as const;

const STEP_SUB = {
    phone: (mode: "register" | "login") =>
        mode === "register"
            ? "Enter your mobile to receive a one-time passcode."
            : "Enter your registered mobile to sign in.",
    otp: (phone: string) => `We sent a 6-digit code to +91 ${phone}.`,
    register: () => "One last step before you join the league.",
} as const;

/* ---------- main component ---------- */

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
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [resendIn, setResendIn] = useState(0);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", role: "batsman", state: "", city: "" });
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);

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

    const sendOtp = async (): Promise<boolean> => {
        if (!isValidPhone(phone)) {
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
        if (!isCompleteOtp(otp)) return;
        const code = otp.join("");
        setBusy(true);
        try {
            const res = await api.post<{ exists: boolean; user?: any; redirect?: string }>(
                "/api/auth/verify-otp",
                { phone, otp: code }
            );
            if (!res.ok) {
                toast({ variant: "destructive", title: "Incorrect OTP", description: res.error || "Try again" });
                setOtp(["", "", "", "", "", ""]);
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

    const auxLabel = initialMode === "register" ? "Already a player?" : "New to BRPL?";
    const auxAction = initialMode === "register" ? "Sign in" : "Create account";
    const auxHref = `/auth?mode=${initialMode === "register" ? "login" : "register"}&next=${encodeURIComponent(next)}`;

    return (
        <AuthShell>
            <div className="auth-stage">
                <Link href="/" className="auth-brand" aria-label="Back to home">
                    <span className="auth-brand-dot" />
                    <span>
                        <span className="auth-brand-text">BRPL</span>
                        <span className="auth-brand-sub">Bharat Regional Premier League</span>
                    </span>
                </Link>

                <AuthCard>
                    <StepPill label={STEP_LABEL[step]} />
                    <h1 className="auth-title">
                        {step === "phone"
                            ? STEP_TITLE.phone(initialMode)
                            : step === "otp"
                                ? STEP_TITLE.otp()
                                : STEP_TITLE.register()}
                    </h1>
                    <p className="auth-sub">
                        {step === "phone"
                            ? STEP_SUB.phone(initialMode)
                            : step === "otp"
                                ? STEP_SUB.otp(phone)
                                : STEP_SUB.register()}
                    </p>

                    {step === "phone" && (
                        <form onSubmit={submitPhone}>
                            <AuthField label="Mobile Number" htmlFor="phone">
                                <PhoneInput
                                    id="phone"
                                    value={phone}
                                    onChange={setPhone}
                                    disabled={busy}
                                    autoFocus
                                />
                            </AuthField>

                            <PrimaryButton
                                type="submit"
                                busy={busy}
                                busyLabel="Sending"
                            >
                                Send OTP →
                            </PrimaryButton>

                            <div className="auth-trust">
                                <ShieldCheck size={16} />
                                <span>Your information is encrypted and never shared.</span>
                            </div>

                            <div className="auth-aux">
                                <span>{auxLabel}</span>
                                <Link href={auxHref}>{auxAction}</Link>
                            </div>
                        </form>
                    )}

                    {step === "otp" && (
                        <form onSubmit={submitOtp}>
                            <OtpInput value={otp} onChange={setOtp} disabled={busy} />

                            <div className="auth-otp-meta">
                                <span>
                                    <Lock size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                                    {otpExpiresIn > 0
                                        ? `Expires in ${formatOtpExpiry(otpExpiresIn)}`
                                        : "OTP expired"}
                                </span>
                                {resendIn > 0 ? (
                                    <span>Resend in {resendIn}s</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="auth-ghost"
                                        onClick={sendOtp}
                                        disabled={busy}
                                    >
                                        Resend code
                                    </button>
                                )}
                            </div>

                            <PrimaryButton
                                type="submit"
                                busy={busy}
                                busyLabel="Verifying"
                                disabled={!isCompleteOtp(otp)}
                            >
                                Verify &amp; continue <CheckCircle2 size={14} />
                            </PrimaryButton>

                            <div className="auth-aux">
                                <span>Wrong number?</span>
                                <button
                                    type="button"
                                    className="auth-ghost"
                                    onClick={() => {
                                        setOtp(["", "", "", "", "", ""]);
                                        setStep("phone");
                                    }}
                                >
                                    Change
                                </button>
                            </div>
                        </form>
                    )}

                    {step === "register" && (
                        <form onSubmit={submitRegister}>
                            {!orderId && (
                                <div className="auth-fee">
                                    <div className="auth-fee-row">
                                        <div className="auth-fee-label">Registration Fee</div>
                                        <div className="auth-fee-amount">{REGISTRATION_FEE_DISPLAY}</div>
                                    </div>
                                    <p className="auth-fee-note">
                                        Covers trials, official kit and processing.
                                    </p>
                                    <PrimaryButton
                                        type="button"
                                        busy={busy}
                                        busyLabel="Opening"
                                        onClick={startPayment}
                                    >
                                        Pay {REGISTRATION_FEE_DISPLAY}
                                    </PrimaryButton>
                                </div>
                            )}

                            {orderId && !paymentId && (
                                <div className="auth-info">
                                    Complete the payment in the Razorpay window, then return here.
                                </div>
                            )}

                            {paymentId && (
                                <>
                                    <AuthField label="Full name" htmlFor="reg-name">
                                        <input
                                            id="reg-name"
                                            className="auth-field-input"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </AuthField>
                                    <AuthField label="Email address" htmlFor="reg-email">
                                        <input
                                            id="reg-email"
                                            type="email"
                                            className="auth-field-input"
                                            required
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        />
                                    </AuthField>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <AuthField label="Role" htmlFor="reg-role">
                                            <select
                                                id="reg-role"
                                                className="auth-field-input"
                                                value={form.role}
                                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            >
                                                <option value="batsman">Batsman</option>
                                                <option value="bowler">Bowler</option>
                                                <option value="allrounder">All-rounder</option>
                                                <option value="wicketkeeper">Wicket-keeper</option>
                                            </select>
                                        </AuthField>
                                        <AuthField label="State" htmlFor="reg-state">
                                            <input
                                                id="reg-state"
                                                className="auth-field-input"
                                                required
                                                value={form.state}
                                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                            />
                                        </AuthField>
                                    </div>
                                    <AuthField label="City" htmlFor="reg-city">
                                        <input
                                            id="reg-city"
                                            className="auth-field-input"
                                            required
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        />
                                    </AuthField>

                                    <PrimaryButton
                                        type="submit"
                                        busy={busy}
                                        busyLabel="Finishing"
                                    >
                                        Complete registration <CheckCircle2 size={14} />
                                    </PrimaryButton>
                                </>
                            )}
                        </form>
                    )}
                </AuthCard>

                <div className="auth-foot">
                    <span className="auth-foot-dot" />
                    <span>Trials live · Mumbai · Bengaluru · Guwahati</span>
                </div>
            </div>
        </AuthShell>
    );
}
