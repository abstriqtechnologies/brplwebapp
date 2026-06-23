"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, MapPin, Mail, Trophy, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_ROLES, type UserRole } from "@/lib/roles";

const schema = z.object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.string().trim().email("Invalid email"),
    role: z.enum(USER_ROLES, { errorMap: () => ({ message: "Please choose a role" }) }),
    state: z.string().trim().min(2, "State is required").max(60),
    city: z.string().trim().min(2, "City is required").max(60),
});
type FormData = z.infer<typeof schema>;

const ROLE_META: Record<UserRole, { label: string; description: string; Icon: any }> = {
    batsman: { label: "Batsman", description: "Specialist batter", Icon: Trophy },
    bowler: { label: "Bowler", description: "Specialist bowler", Icon: Trophy },
    allrounder: { label: "All-Rounder", description: "Bat & bowl", Icon: Trophy },
    wicketkeeper: { label: "Wicket-Keeper", description: "Keeper & batter", Icon: Trophy },
};

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        }>
            <RegisterInner />
        </Suspense>
    );
}

function RegisterInner() {
    const router = useRouter();
    const params = useSearchParams();
    const paymentId = params.get("payment_id") || "";
    const orderId = params.get("order_id") || "";

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const selectedRole = watch("role");

    useEffect(() => {
        if (!paymentId || !orderId) {
            // Try to read from the pending cookie via /api/auth/me — if not, redirect to /auth
            fetch("/api/auth/me").then((r) => r.json()).then((d) => {
                if (!d.user) router.replace("/auth");
            });
        }
    }, [paymentId, orderId, router]);

    const onSubmit = async (data: FormData) => {
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, paymentId, orderId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Registration failed");
            router.push(json.redirect || "/dashboard");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-600 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back home
                </Link>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-4">
                        <Check className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Complete your profile</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Payment received ✓ — tell us a bit about you to finish registration.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6"
                >
                    {/* Role selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            Your playing role
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {USER_ROLES.map((role) => {
                                const meta = ROLE_META[role];
                                const active = selectedRole === role;
                                const Icon = meta.Icon;
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setValue("role", role, { shouldValidate: true })}
                                        className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                                            active
                                                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-md"
                                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                        }`}
                                    >
                                        <Icon className={`w-7 h-7 ${active ? "text-amber-600" : "text-slate-500"}`} />
                                        <span className={`text-sm font-bold ${active ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            {meta.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight text-center">
                                            {meta.description}
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
                        {errors.role && (
                            <p className="text-xs text-red-600 mt-2">{errors.role.message}</p>
                        )}
                    </div>

                    {/* Personal info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <User className="w-4 h-4 inline mr-1" />
                                Full name
                            </label>
                            <Input
                                placeholder="Your full name"
                                {...register("name")}
                                className="h-11"
                            />
                            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email
                            </label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                {...register("email")}
                                className="h-11"
                            />
                            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                State
                            </label>
                            <Input
                                placeholder="e.g. Maharashtra"
                                {...register("state")}
                                className="h-11"
                            />
                            {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                City
                            </label>
                            <Input
                                placeholder="e.g. Mumbai"
                                {...register("city")}
                                className="h-11"
                            />
                            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 text-center">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
