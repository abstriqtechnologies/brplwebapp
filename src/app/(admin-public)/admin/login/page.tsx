"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";

function LoginInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/admin/dashboard";

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [requireOtp, setRequireOtp] = useState(false);
    const [otpToken, setOtpToken] = useState("");
    const [otpInput, setOtpInput] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post<any>("/api/admin/auth/login", formData);
            if (!res.ok) {
                toast({ variant: "destructive", title: "Login failed", description: res.error });
                return;
            }
            if (res.data?.requireOtp) {
                setRequireOtp(true);
                setOtpToken(res.data.otpToken);
                toast({ title: "2FA Required", description: res.data.message || "Enter the 6-digit code" });
                return;
            }
            toast({ title: "Login successful", description: "Welcome back!" });
            router.replace(next);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Login failed", description: err?.message || "Invalid credentials" });
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otpInput.length !== 6) return;
        setIsVerifying(true);
        try {
            const res = await api.post<any>("/api/admin/auth/verify-otp", {
                otpToken,
                code: otpInput,
            });
            if (!res.ok) {
                toast({ variant: "destructive", title: "OTP failed", description: res.error });
                return;
            }
            toast({ title: "Login successful", description: "Welcome back!" });
            router.replace(next);
        } catch (err: any) {
            toast({ variant: "destructive", title: "OTP failed", description: err?.message });
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-slate-50 dark:bg-slate-950">
            <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20"
                style={{
                    backgroundImage: "url('/register-footer.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "top center",
                }}
            />
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to site
            </Link>
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white drop-shadow-md">Admin Portal</h2>
                    <p className="text-zinc-200 mt-2 font-medium">
                        Sign in to continue to administration
                    </p>
                </div>

                {requireOtp ? (
                    <form onSubmit={verifyOtp} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="otp" className="text-white">Enter 6-digit Code</Label>
                            <Input
                                id="otp"
                                inputMode="numeric"
                                pattern="\d{6}"
                                maxLength={6}
                                className="bg-white text-black text-center text-2xl tracking-widest font-mono"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold"
                            disabled={isVerifying || otpInput.length !== 6}
                        >
                            {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            Verify Code
                        </Button>
                        <button
                            type="button"
                            onClick={() => {
                                setRequireOtp(false);
                                setOtpInput("");
                            }}
                            className="w-full text-sm text-zinc-300 hover:text-white"
                        >
                            Back to login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white font-semibold">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    className="pl-12 bg-white text-black placeholder:text-slate-400"
                                    placeholder="admin@brpl.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-white font-semibold">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="pl-12 pr-10 bg-white text-black placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full mt-4 bg-amber-500 text-black hover:bg-amber-400 font-bold text-lg h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            Sign In
                        </Button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-xs text-zinc-400">
                        Default credentials: <code className="text-amber-400">admin@brpl.com</code> /{" "}
                        <code className="text-amber-400">Admin@123</code>
                    </p>
                </div>
            </div>
        </div>
    );
}

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
