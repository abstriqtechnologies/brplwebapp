"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import {
    LogOut,
    MapPin,
    Mail,
    Phone,
    Trophy,
    User as UserIcon,
    Loader2,
    CheckCircle2,
    Download,
    IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialPass from "@/components/TrialPass";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

const ROLE_COLOR: Record<string, string> = {
    batsman: "from-red-500 to-orange-500",
    bowler: "from-blue-500 to-cyan-500",
    allrounder: "from-purple-500 to-pink-500",
    wicketkeeper: "from-amber-500 to-yellow-500",
};

type Me = {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    profileImage?: string | null;
};

export default function DashboardClient() {
    const router = useRouter();
    const [user, setUser] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const trialPassRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (!d.user) {
                    router.replace("/login?next=/dashboard");
                    return;
                }
                setUser(d.user);
            })
            .catch(() => router.replace("/login?next=/dashboard"))
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
        } finally {
            setLoggingOut(false);
        }
    };

    const handleDownload = async () => {
        if (!trialPassRef.current || !user) return;
        setDownloading(true);
        try {
            const dataUrl = await toPng(trialPassRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
            });
            const link = document.createElement("a");
            link.download = `BRPL-Trial-Pass-${user.phone || "player"}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Download failed", err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!user) return null;

    const roleColor = ROLE_COLOR[user.role as string] || "from-slate-500 to-slate-700";
    const roleLabel = ROLE_LABELS[user.role as UserRole] || "Player";
    const trialPassUser = {
        ...user,
        // TrialPass prefers profileImage, then avatar, then DEFAULT_AVATAR (handled in component)
        avatar: user.profileImage ?? undefined,
    };

    return (
        <div className="min-h-[80vh] px-4 py-10">
            <div className="max-w-5xl mx-auto">
                {/* Welcome header */}
                <div
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleColor} p-6 sm:p-8 text-white shadow-2xl mb-8`}
                >
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Welcome to BRPL</p>
                            <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">{user.name || "Player"}</h1>
                            <div className="flex items-center gap-2 text-white/90">
                                <Trophy className="w-4 h-4" />
                                <span className="font-semibold">{roleLabel}</span>
                                {user.paymentStatus === "completed" && (
                                    <>
                                        <span className="opacity-60">•</span>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-sm">Registered</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            variant="outline"
                            className="bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-sm w-fit"
                        >
                            {loggingOut ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4 mr-2" />
                            )}
                            {!loggingOut && "Logout"}
                        </Button>
                    </div>
                </div>

                {/* Trial Pass + Profile grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
                    {/* Trial Pass card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <IdCard className="w-5 h-5 text-amber-600" />
                            <h2 className="font-bold text-slate-900 dark:text-white">Your Trial Pass</h2>
                        </div>

                        <div ref={trialPassRef}>
                            <TrialPass user={trialPassUser} />
                        </div>

                        <Button
                            onClick={handleDownload}
                            disabled={downloading}
                            variant="outline"
                            className="w-full mt-5 h-11 rounded-full font-semibold"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {downloading ? "Preparing…" : "Download Trial Pass"}
                        </Button>

                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                            Present this pass at your zonal trials.
                        </p>
                    </div>

                    {/* Profile info */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ProfileCard
                                icon={<UserIcon className="w-5 h-5" />}
                                label="Full Name"
                                value={user.name || "—"}
                            />
                            <ProfileCard
                                icon={<Phone className="w-5 h-5" />}
                                label="Mobile"
                                value={`+91 ${user.phone}`}
                            />
                            <ProfileCard
                                icon={<Mail className="w-5 h-5" />}
                                label="Email"
                                value={user.email || "—"}
                            />
                            <ProfileCard
                                icon={<MapPin className="w-5 h-5" />}
                                label="Location"
                                value={[user.city, user.state].filter(Boolean).join(", ") || "—"}
                            />
                            <ProfileCard
                                icon={<Trophy className="w-5 h-5" />}
                                label="Playing Role"
                                value={roleLabel}
                            />
                            <ProfileCard
                                icon={<IdCard className="w-5 h-5" />}
                                label="BRPL ID"
                                value={user.id ? `#${user.id.slice(-8).toUpperCase()}` : "—"}
                                mono
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white mb-1">Registration complete</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Your BRPL player profile is active. You&apos;ll be notified when zonal trials open in your state.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>Need help?</span>
                            <Link href="/contact-us" className="text-amber-600 hover:underline font-semibold">
                                Contact support
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Unpaid CTA card */}
                {user.paymentStatus !== "completed" && (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Complete your registration</p>
                            <p className="text-sm text-slate-500">Pay the registration fee to confirm your slot.</p>
                        </div>
                        <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                            <Link href="/login">Continue</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProfileCard({
    icon,
    label,
    value,
    mono,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {label}
                </span>
            </div>
            <p className={`text-base font-semibold text-slate-900 dark:text-white break-words ${mono ? "font-mono" : ""}`}>
                {value}
            </p>
        </div>
    );
}
