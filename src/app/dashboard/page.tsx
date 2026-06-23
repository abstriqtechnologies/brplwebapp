"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, MapPin, Mail, Phone, Trophy, User as UserIcon, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
    batsman: "Batsman",
    bowler: "Bowler",
    allrounder: "All-Rounder",
    wicketkeeper: "Wicket-Keeper",
};

const ROLE_COLOR: Record<string, string> = {
    batsman: "from-red-500 to-orange-500",
    bowler: "from-blue-500 to-cyan-500",
    allrounder: "from-purple-500 to-pink-500",
    wicketkeeper: "from-amber-500 to-yellow-500",
};

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (!d.user) {
                    router.replace("/auth");
                    return;
                }
                setUser(d.user);
            })
            .catch(() => router.replace("/auth"))
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/auth");
        } finally {
            setLoggingOut(false);
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

    const roleColor = ROLE_COLOR[user.role] || "from-slate-500 to-slate-700";
    const roleLabel = ROLE_LABEL[user.role] || "Player";

    return (
        <div className="min-h-[80vh] px-4 py-10">
            <div className="max-w-4xl mx-auto">
                {/* Hero card */}
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleColor} p-8 sm:p-10 text-white shadow-2xl`}>
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Welcome back</p>
                            <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">{user.name || "Player"}</h1>
                            <div className="flex items-center gap-2 text-white/90">
                                <Trophy className="w-4 h-4" />
                                <span className="font-semibold">{roleLabel}</span>
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            variant="outline"
                            className="bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-sm w-fit"
                        >
                            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                            {!loggingOut && "Logout"}
                        </Button>
                    </div>
                </div>

                {/* Profile grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileCard icon={<UserIcon className="w-5 h-5" />} label="Full Name" value={user.name || "—"} />
                    <ProfileCard icon={<Phone className="w-5 h-5" />} label="Mobile" value={`+91 ${user.phone}`} />
                    <ProfileCard icon={<Mail className="w-5 h-5" />} label="Email" value={user.email || "—"} />
                    <ProfileCard icon={<MapPin className="w-5 h-5" />} label="Location" value={[user.city, user.state].filter(Boolean).join(", ") || "—"} />
                </div>

                {/* Payment status */}
                <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white mb-1">Registration complete</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Your BRPL player profile is active. You'll be notified when zonal trials open.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-slate-500">
                    Need help? <Link href="/contact-us" className="text-amber-600 hover:underline font-semibold">Contact support</Link>
                </div>
            </div>
        </div>
    );
}

function ProfileCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <p className="text-base font-semibold text-slate-900 dark:text-white break-words">{value}</p>
        </div>
    );
}
