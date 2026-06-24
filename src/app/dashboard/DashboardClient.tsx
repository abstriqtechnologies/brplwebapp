"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, LogOut, Trophy, IdCard, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/apihelper/api";
import { formatCurrencyINR } from "@/utils/adminExport";
import { formatDate } from "@/utils/adminDate";
import { toast } from "@/components/ui/use-toast";

type Me = {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
    createdAt?: string;
};

export default function DashboardClient() {
    const router = useRouter();
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await api.get<{ user: Me | null }>("/api/auth/me");
            if (res.ok && res.data?.user) {
                setMe(res.data.user);
            } else {
                router.replace("/auth?next=/dashboard");
            }
            setLoading(false);
        })();
    }, [router]);

    const handleDownload = async () => {
        if (!me) return;
        setDownloading(true);
        try {
            const r = await fetch(`/api/admin/users/${me.id}/invoice`, { credentials: "same-origin" });
            if (!r.ok) throw new Error("Failed");
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BRPL-Receipt-${(me.name || me.phone).replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast({ variant: "destructive", title: "Download failed" });
        } finally {
            setDownloading(false);
        }
    };

    const handleLogout = async () => {
        await api.post("/api/auth/logout");
        router.replace("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }
    if (!me) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign out
                    </Button>
                </div>

                <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-8 text-black shadow-xl">
                    <p className="text-sm uppercase tracking-widest opacity-80 mb-2">Welcome</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-1">{me.name || "Player"}</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <Trophy className="w-4 h-4" />
                        <span className="font-semibold capitalize">{me.role || "Player"}</span>
                        {me.paymentStatus === "completed" && (
                            <>
                                <span className="opacity-50">•</span>
                                <Badge className="bg-black/20 text-black border-black/30">Paid</Badge>
                            </>
                        )}
                        {me.paymentStatus !== "completed" && (
                            <>
                                <span className="opacity-50">•</span>
                                <Badge className="bg-red-500/30 text-white border-red-300/40">Unpaid</Badge>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field icon={<IdCard className="w-5 h-5" />} label="BRPL ID" value={`#${me.id.slice(-8).toUpperCase()}`} mono />
                    <Field icon={<Phone className="w-5 h-5" />} label="Mobile" value={`+91 ${me.phone}`} />
                    <Field icon={<Mail className="w-5 h-5" />} label="Email" value={me.email || "—"} />
                    <Field
                        icon={<MapPin className="w-5 h-5" />}
                        label="Location"
                        value={[me.city, me.state].filter(Boolean).join(", ") || "—"}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Status</p>
                            <Badge className={me.paymentStatus === "completed" ? "bg-green-500" : "bg-orange-500"}>
                                {me.paymentStatus || "pending"}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount</p>
                            <p className="text-lg font-bold">{formatCurrencyINR(me.amount ?? 1499)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Payment ID</p>
                            <p className="font-mono text-sm break-all">{me.paymentId || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Order ID</p>
                            <p className="font-mono text-sm break-all">{me.orderId || "—"}</p>
                        </div>
                        {me.paymentStatus === "completed" && (
                            <div className="md:col-span-2 pt-2">
                                <Button
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    className="bg-amber-500 text-black hover:bg-amber-400"
                                >
                                    {downloading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    {downloading ? "Preparing..." : "Download Receipt PDF"}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {me.paymentStatus !== "completed" && (
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">Complete your registration</p>
                                <p className="text-sm text-slate-500">Pay the registration fee to confirm your slot.</p>
                            </div>
                            <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                                <Link href="/auth?mode=register">Continue</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function Field({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                    {icon}
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</span>
                </div>
                <p className={`text-base font-semibold break-words ${mono ? "font-mono" : ""}`}>{value}</p>
            </CardContent>
        </Card>
    );
}
