"use client";

import { useEffect, useId, useState } from "react";
import {
    Loader2,
    Tag,
    CreditCard,
    User,
    Mail,
    MapPin,
    Trophy,
    Check,
    ChevronDown,
    ChevronUp,
    Swords,
    Target,
    ShieldHalf,
    Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { loadRazorpayScript } from "@/hooks/useRazorpayScript";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

type Role = "batsman" | "bowler" | "allrounder" | "wicketkeeper";
const ROLES: Array<{
    value: Role;
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
}> = [
    { value: "batsman", label: "Batsman", description: "Specialist batter", Icon: Swords },
    { value: "bowler", label: "Bowler", description: "Specialist bowler", Icon: Target },
    { value: "allrounder", label: "All-Rounder", description: "Bat & bowl", Icon: Trophy },
    { value: "wicketkeeper", label: "Wicket-Keeper", description: "Keeper & batter", Icon: Hand },
];

// 28 Indian states + 8 UTs (alphabetical, mixed).
const INDIAN_STATES: string[] = [
    "Andaman and Nicobar Islands",
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chandigarh",
    "Chhattisgarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Ladakh",
    "Lakshadweep",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Puducherry",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
];

type ExistingUser = {
    _id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
} | null;

type CouponState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; code: string; discount: number; finalAmount: number; couponId: string }
    | { status: "invalid"; reason: string };

const POLL_INTERVAL_MS = 2000;
const POLL_DURATION_MS = 60_000;

export default function CheckoutClient({
    phone,
    next,
    registrationFeeRupees,
    existingUser,
}: {
    phone: string;
    next: string;
    registrationFeeRupees: number;
    existingUser: ExistingUser;
}) {
    const { settings } = useSiteSettings();
    const { toast } = useToast();

    const isNewUser = !existingUser?.name;
    const [form, setForm] = useState({
        name: existingUser?.name ?? "",
        email: existingUser?.email ?? "",
        role: (existingUser?.role as Role) ?? "batsman",
        state: existingUser?.state ?? "",
        city: existingUser?.city ?? "",
    });

    const [couponInput, setCouponInput] = useState("");
    const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
    const [couponOpen, setCouponOpen] = useState(false);

    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    // Phase string drives the centered overlay's title/sub copy.
    const [phase, setPhase] = useState<string>("");
    const [subPhase, setSubPhase] = useState<string>("");

    const finalAmount = coupon.status === "valid" ? coupon.finalAmount : registrationFeeRupees;
    const couponCoversAll = coupon.status === "valid" && coupon.finalAmount === 0;

    /* --- Coupon validation (does NOT consume) --- */
    const applyCoupon = async () => {
        if (!couponInput.trim()) return;
        setCoupon({ status: "checking" });
        try {
            const res = await fetch("/api/payment/redeem-coupon?dryRun=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: couponInput.trim(),
                    orderAmountRupees: registrationFeeRupees,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.valid) {
                setCoupon({
                    status: "invalid",
                    reason: data.reason || data.error || "Invalid coupon",
                });
                return;
            }
            setCoupon({
                status: "valid",
                code: data.code ?? couponInput.trim().toUpperCase(),
                discount: data.discount,
                finalAmount: data.finalAmount,
                couponId: data.couponId,
            });
        } catch {
            setCoupon({ status: "invalid", reason: "Network error" });
        }
    };

    /* --- Razorpay path --- */
    const startPayment = async () => {
        setBusy(true);
        try {
            // Save the profile to the DB before payment so attempters are
            // captured even if payment fails or is abandoned.
            if (isNewUser) {
                if (!form.name || !form.email || !form.state || !form.city) {
                    toast({
                        variant: "destructive",
                        title: "Missing fields",
                        description: "All fields are required.",
                    });
                    setBusy(false);
                    return;
                }
                setPhase("Saving your details");
                setSubPhase("Securing your player profile");
                const saveRes = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form), // no paymentId/orderId
                });
                if (!saveRes.ok) {
                    const err = await saveRes.json().catch(() => ({}));
                    throw new Error(err.error || "Could not save profile");
                }
            }

            setPhase("Preparing your order");
            setSubPhase("Connecting to payment gateway");

            const res = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    coupon.status === "valid"
                        ? {
                              couponId: coupon.couponId,
                              code: coupon.code,
                              // Pass the discounted total in paise. The server
                              // re-validates the coupon and ignores any
                              // tampered value, but we send it so the client
                              // and server agree on what we're charging.
                              finalAmountPaise: coupon.finalAmount * 100,
                          }
                        : {},
                ),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || data?.message || "Could not start payment");
            // Unwrap the standard API envelope. The route returns
            // `{ ok: true, data: { success, orderId, key, ... } }`; older
            // or non-enveloped routes may return the payload directly.
            const payload = data?.data ?? data;
            if (!payload.key) {
                // Server returned a 200 but the Razorpay key was missing or
                // empty. This used to reach the SDK and surface as the
                // cryptic "No key passed" toast. Fail loud here instead.
                throw new Error("Payment is not configured on the server. Please contact support.");
            }

            setOrderId(payload.orderId);
            setPhase("Opening secure checkout");
            setSubPhase("Loading Razorpay…");
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error("Failed to load Razorpay");

            const rzp = new window.Razorpay!({
                key: payload.key,
                amount: payload.amount,
                currency: payload.currency,
                name: settings?.siteName || "BRPL",
                description: "Player Registration",
                order_id: payload.orderId,
                prefill: { contact: phone },
                handler: async (resp: any) => {
                    setPaymentId(resp.razorpay_payment_id);
                    setPhase("Verifying payment");
                    setSubPhase("Confirming with Razorpay…");
                    const v = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: resp.razorpay_order_id,
                            paymentId: resp.razorpay_payment_id,
                            signature: resp.razorpay_signature,
                            // Pass coupon info so the server can record usage.
                            ...(coupon.status === "valid"
                                ? { couponId: coupon.couponId, couponCode: coupon.code }
                                : {}),
                        }),
                    });
                    const vData = await v.json().catch(() => ({}));
                    if (v.ok) {
                        setPhase("Taking you to your dashboard");
                        setSubPhase("Finalizing your registration…");
                        await finishRegistration();
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Verification failed",
                            description: vData.error,
                        });
                        setBusy(false);
                        setPhase("");
                        setSubPhase("");
                    }
                },
                modal: {
                    ondismiss: () => {
                        setBusy(false);
                        setPhase("");
                        setSubPhase("");
                    },
                },
            });
            rzp.open();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Payment error",
                description: err?.message || "Unknown",
            });
            setBusy(false);
            setPhase("");
            setSubPhase("");
        }
    };

    /* --- Coupon-only path (full coverage) OR post-Razorpay finish --- */
    const finishRegistration = async () => {
        // Guard against double-trigger: both the polling (webhook-first
        // path) and the Razorpay handler (verify-first path) can call
        // finishRegistration. The second call would either hit a 409 on
        // /api/auth/register (existing.name now set) or re-run the
        // coupon redeem (which would increment usage a second time).
        if (busy) return;
        setBusy(true);
        try {
            setPhase("Taking you to your dashboard");
            setSubPhase("Finalizing your registration…");
            // For new users, we need profile data + paymentId/orderId.
            if (isNewUser) {
                if (!form.name || !form.email || !form.state || !form.city) {
                    toast({
                        variant: "destructive",
                        title: "Missing fields",
                        description: "All fields are required.",
                    });
                    setBusy(false);
                    setPhase("");
                    setSubPhase("");
                    return;
                }
            }

            // If paying with a coupon that covers the full amount, redeem now.
            if (coupon.status === "valid" && couponCoversAll && !paymentId) {
                setPhase("Redeeming your coupon");
                setSubPhase("Applying 100% discount…");
                const r = await fetch("/api/payment/redeem-coupon", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code: coupon.code,
                        orderAmountRupees: registrationFeeRupees,
                        // For new users, the redeem route creates the User
                        // record inline so it must receive the profile fields.
                        ...(isNewUser
                            ? {
                                  name: form.name,
                                  email: form.email,
                                  role: form.role,
                                  state: form.state,
                                  city: form.city,
                              }
                            : {}),
                    }),
                });
                const rData = await r.json().catch(() => ({}));
                if (!r.ok) {
                    toast({
                        variant: "destructive",
                        title: "Coupon redemption failed",
                        description: rData.error || "Try again",
                    });
                    setBusy(false);
                    setPhase("");
                    setSubPhase("");
                    return;
                }
                // For new users, the redeem route has already created the
                // User, persisted a coupon Payment, and issued an auth
                // cookie with paid:true. Navigate straight to /dashboard.
                if (isNewUser) {
                    window.location.href = rData.redirect || next;
                    return;
                }
            }

            if (isNewUser) {
                // paymentId/orderId may be missing here if the webhook arrived
                // before the Razorpay modal handler ran — the server resolves
                // them from the User record in that case (see auth/service.ts).
                const regRes = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        ...(paymentId ? { paymentId } : {}),
                        ...(orderId ? { orderId } : {}),
                    }),
                });
                const regData = await regRes.json().catch(() => ({}));
                if (!regRes.ok) {
                    toast({
                        variant: "destructive",
                        title: "Registration failed",
                        description: regData.error,
                    });
                    setBusy(false);
                    setPhase("");
                    setSubPhase("");
                    return;
                }
            }

            // Hard navigation to ensure cookies + DB state are consistent.
            window.location.href = next;
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message });
            setBusy(false);
            setPhase("");
            setSubPhase("");
        }
    };

    /* --- Resumable payment polling: handles "closed tab mid-payment" case --- */
    useEffect(() => {
        let elapsed = 0;
        const t = setInterval(async () => {
            elapsed += POLL_INTERVAL_MS;
            if (elapsed > POLL_DURATION_MS) {
                clearInterval(t);
                return;
            }
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (data?.user?.paymentStatus === "completed") {
                    clearInterval(t);
                    // Webhook arrived while user was away — show the
                    // "taking you to dashboard" overlay while we finish up.
                    setBusy(true);
                    setPhase("Payment received");
                    setSubPhase("Bringing you back to your dashboard…");
                    await finishRegistration();
                }
            } catch {
                /* network blip; ignore */
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(t);
    }, []);

    /* --- Render --- */
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
            {/* Keyframes for the loader. Scoped class names so they don't
                collide with anything global. */}
            <style>{`
                @keyframes brpl-spin { to { transform: rotate(360deg); } }
                @keyframes brpl-pulse {
                    0%, 100% { opacity: 0.35; transform: scale(0.85); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                @keyframes brpl-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes brpl-pop-in {
                    0% { opacity: 0; transform: scale(0.92); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .brpl-spin { animation: brpl-spin 0.9s linear infinite; }
                .brpl-fade-in { animation: brpl-fade-in 0.2s ease-out; }
                .brpl-pop-in { animation: brpl-pop-in 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>

            {/* Animated loader overlay. Covers the entire checkout area while
                a long-running operation (save / verify / finish) is in flight. */}
            {busy && phase && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-md brpl-fade-in"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <div className="relative w-full max-w-sm mx-4 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl shadow-black/40 border border-slate-200/60 dark:border-slate-800 px-8 py-9 text-center brpl-pop-in">
                        {/* Triple-ring spinner: amber gradient ring + faint
                            trailing rings. Conveys motion + payment context. */}
                        <div className="relative mx-auto h-20 w-20 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 border-r-amber-400 brpl-spin" />
                            <div
                                className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-300/70 brpl-spin"
                                style={{ animationDuration: "1.4s", animationDirection: "reverse" }}
                            />
                            {/* Center dot */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="block h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-500/40" />
                            </div>
                        </div>

                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {phase}
                        </h2>
                        {subPhase && (
                            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                                {subPhase}
                            </p>
                        )}

                        {/* Cricket-ball dots row — three amber dots pulsing in
                            sequence. Subtle motion keeps the user engaged
                            during the longest wait. */}
                        <div className="mt-6 flex items-center justify-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span
                                    key={i}
                                    className="block h-2 w-2 rounded-full bg-amber-500"
                                    style={{
                                        animation: "brpl-pulse 1.1s ease-in-out infinite",
                                        animationDelay: `${i * 0.18}s`,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Small reassurance note for the longest path */}
                        {phase === "Taking you to your dashboard" && (
                            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Payment confirmed — setting up your dashboard
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="w-full max-w-2xl">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                    {/* Profile */}
                    {isNewUser && (
                        <section className="space-y-5">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Your details</h2>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                    <Trophy className="w-4 h-4 inline mr-1" />
                                    Playing role
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {ROLES.map((r) => {
                                        const active = form.role === r.value;
                                        const Icon = r.Icon;
                                        return (
                                            <button
                                                key={r.value}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setForm({ ...form, role: r.value })}
                                                className={`group relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                                                    active
                                                        ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20 shadow-sm ring-1 ring-amber-500/30"
                                                        : "border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700"
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                                                        active
                                                            ? "bg-amber-500 text-white shadow-sm shadow-amber-500/40"
                                                            : "bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 dark:bg-slate-800 dark:group-hover:bg-amber-950/40 dark:group-hover:text-amber-400"
                                                    }`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                </span>
                                                <span className={`text-sm font-bold ${active ? "text-amber-900 dark:text-amber-100" : "text-slate-900 dark:text-white"}`}>
                                                    {r.label}
                                                </span>
                                                <span className="text-[10px] text-slate-500 text-center leading-tight">
                                                    {r.description}
                                                </span>
                                                {active && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field
                                    label="Full name"
                                    icon={<User className="w-4 h-4" />}
                                    value={form.name}
                                    onChange={(v) => setForm({ ...form, name: v })}
                                />
                                <Field
                                    label="Email"
                                    icon={<Mail className="w-4 h-4" />}
                                    type="email"
                                    value={form.email}
                                    onChange={(v) => setForm({ ...form, email: v })}
                                />
                                <SelectField
                                    label="State"
                                    icon={<MapPin className="w-4 h-4" />}
                                    value={form.state}
                                    placeholder="Select your state"
                                    options={INDIAN_STATES}
                                    onChange={(v) => setForm({ ...form, state: v })}
                                />
                                <Field
                                    label="City"
                                    icon={<MapPin className="w-4 h-4" />}
                                    value={form.city}
                                    onChange={(v) => setForm({ ...form, city: v })}
                                />
                            </div>
                        </section>
                    )}

                    {/* Coupon */}
                    <section>
                        <button
                            type="button"
                            aria-expanded={couponOpen}
                            aria-controls="coupon-panel"
                            onClick={() => setCouponOpen((o) => !o)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                        >
                            <Tag className="w-4 h-4" />
                            Have a coupon code?
                            {couponOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {couponOpen && (
                            <div id="coupon-panel" className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter code"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        className="h-11"
                                        disabled={coupon.status === "checking"}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={applyCoupon}
                                        disabled={coupon.status === "checking" || !couponInput.trim()}
                                    >
                                        {coupon.status === "checking" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Apply"
                                        )}
                                    </Button>
                                </div>
                                {coupon.status === "valid" && (
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2">
                                        Coupon <b>{coupon.code}</b> applied — ₹{coupon.discount} off. New total: ₹
                                        {coupon.finalAmount}.
                                    </p>
                                )}
                                {coupon.status === "invalid" && (
                                    <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                                        {coupon.reason}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Pay */}
                    <section className="rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">
                                Amount due
                            </span>
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                                ₹{finalAmount.toLocaleString("en-IN")}
                            </span>
                        </div>
                        {couponCoversAll ? (
                            <Button
                                type="button"
                                onClick={finishRegistration}
                                disabled={busy}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                            >
                                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete registration"}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={startPayment}
                                disabled={busy}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                            >
                                {busy ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Pay ₹{finalAmount.toLocaleString("en-IN")}</>
                                )}
                            </Button>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    icon,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {icon} <span className="ml-1">{label}</span>
            </label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11"
                required
            />
        </div>
    );
}

function SelectField({
    label,
    icon,
    value,
    placeholder,
    options,
    onChange,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    placeholder: string;
    options: string[];
    onChange: (v: string) => void;
}) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {icon} <span className="ml-1">{label}</span>
            </label>
            <Select value={value || undefined} onValueChange={onChange}>
                <SelectTrigger
                    id={id}
                    className="h-11 w-full min-w-0 rounded-lg border-border bg-secondary/50 px-4 text-xs text-foreground leading-tight focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="text-xs">
                    {options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
