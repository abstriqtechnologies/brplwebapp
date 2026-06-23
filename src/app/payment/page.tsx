"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, CreditCard, CheckCircle2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRazorpayScript } from "@/hooks/useRazorpayScript";
import { useBlockBackNavigation } from "@/hooks/useBlockBackNavigation";

const AMOUNT = 1499;

export default function PaymentPage() {
    const router = useRouter();
    const razorpayReady = useRazorpayScript();
    useBlockBackNavigation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(true);

    useEffect(() => {
        // Check if user is in the pending-registration state
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (d.user) router.replace("/dashboard");
            })
            .finally(() => setPending(false));
    }, [router]);

    const startPayment = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/payment/create-order", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create order");

            if (!razorpayReady || !window.Razorpay) {
                throw new Error("Payment SDK not loaded. Please refresh and try again.");
            }

            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: "Beyond Reach Premier League",
                description: "BRPL Player Registration",
                image: "/logo.webp",
                order_id: data.orderId,
                prefill: data.prefill || {},
                notes: data.notes || {},
                theme: { color: "#F59E0B" },
                handler: async function (response: any) {
                    // Verify on backend (defense in depth alongside webhook)
                    try {
                        const verifyRes = await fetch("/api/payment/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
                        router.push(
                            `/auth/register?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`
                        );
                    } catch (err: any) {
                        setError(err.message || "Payment verification failed");
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (response: any) {
                setError(response?.error?.description || "Payment failed. Please try again.");
                setLoading(false);
            });
            rzp.open();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setLoading(false);
        }
    };

    if (pending) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-6 py-8 text-center text-black">
                        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">BRPL Player Registration</h1>
                        <p className="text-sm text-black/80">Pay the registration fee to get your Trial Pass</p>
                        <div className="mt-6 inline-flex items-baseline gap-1">
                            <IndianRupee className="w-7 h-7" />
                            <span className="text-5xl font-extrabold tracking-tight">{AMOUNT}</span>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                        <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                            {[
                                "Eligibility for Your zonal trials",
                                "Official player profile and BRPL ID",
                                "Access to player dashboard and stats",
                                "Tournament updates and results",
                            ].map((b) => (
                                <li key={b} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center pt-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Secured by Razorpay • 256-bit SSL encryption</span>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 text-center">
                                {error}
                            </p>
                        )}

                        <Button
                            onClick={startPayment}
                            disabled={loading || !razorpayReady}
                            size="lg"
                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Pay ₹{AMOUNT} with Razorpay
                                </>
                            )}
                        </Button>
                        {!razorpayReady && !loading && (
                            <p className="text-xs text-center text-slate-500">Loading payment gateway…</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
