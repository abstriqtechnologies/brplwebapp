"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        if (cleaned.length !== 10) {
            setError("Please enter a valid 10-digit mobile number");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            // Pass phone via query string so verify page can use it without a store
            router.push(`/auth/verify-otp?phone=${cleaned}`);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                        <Phone className="w-7 h-7 text-amber-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome to BRPL</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Enter your mobile number to continue. We'll send you a one-time password.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
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
                        disabled={loading || phone.length !== 10}
                        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                    </Button>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center pt-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Your information is secure and will not be shared.</span>
                    </div>
                </form>

                <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
                    By continuing, you agree to BRPL's{" "}
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
