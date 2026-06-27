"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, IdCard, Trophy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminUser, downloadUserInvoice } from "@/apihelper/admin";
import { downloadBlob, formatCurrencyINR } from "@/utils/adminExport";
import { formatDate } from "@/utils/adminDate";
import { toast } from "@/components/ui/use-toast";

const ROLE_LABELS: Record<string, string> = {
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

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.userId as string;
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await getAdminUser(id);
                if (res.ok && res.data) {
                    setUser(res.data);
                } else {
                    toast({ variant: "destructive", title: "Error", description: "User not found" });
                    router.replace("/admin/players");
                }
            } catch {
                toast({ variant: "destructive", title: "Error", description: "Failed to load user" });
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router]);

    const handleDownload = async () => {
        if (!user) return;
        setDownloading(true);
        try {
            const blob = await downloadUserInvoice(user._id);
            downloadBlob(blob, `Invoice-${(user.name || "user").replace(/\s+/g, "_")}.pdf`);
            toast({ title: "Success", description: "Invoice downloaded" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Download failed" });
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-12 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
    }
    if (!user) {
        return <div className="text-center py-12 text-slate-500">User not found</div>;
    }

    const roleColor = ROLE_COLOR[user.role] || "from-slate-500 to-slate-700";
    const roleLabel = ROLE_LABELS[user.role] || "Player";

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <Link href="/admin/players" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                Back to users
            </Link>

            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleColor} p-6 sm:p-8 text-white shadow-2xl`}>
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-widest text-white/80 mb-2">User profile</p>
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">{user.name || "Player"}</h1>
                        <div className="flex items-center gap-2 text-white/90 flex-wrap">
                            <Trophy className="w-4 h-4" />
                            <span className="font-semibold">{roleLabel}</span>
                            {user.paymentStatus === "completed" && (
                                <>
                                    <span className="opacity-60">•</span>
                                    <Badge className="bg-white/20 text-white border-white/30">Paid</Badge>
                                </>
                            )}
                            {user.paymentStatus !== "completed" && (
                                <>
                                    <span className="opacity-60">•</span>
                                    <Badge className="bg-orange-500/30 text-white border-orange-300/40">Unpaid</Badge>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField icon={<IdCard className="w-5 h-5" />} label="BRPL ID" value={user._id ? `#${user._id.toString().slice(-8).toUpperCase()}` : "—"} mono />
                <ProfileField icon={<Phone className="w-5 h-5" />} label="Mobile" value={user.phone ? `+91 ${user.phone}` : "—"} />
                <ProfileField icon={<Mail className="w-5 h-5" />} label="Email" value={user.email || "—"} />
                <ProfileField icon={<MapPin className="w-5 h-5" />} label="Location" value={[user.city, user.state].filter(Boolean).join(", ") || "—"} />
                <ProfileField icon={<Trophy className="w-5 h-5" />} label="Playing Role" value={roleLabel} />
                <ProfileField icon={<IdCard className="w-5 h-5" />} label="Registered" value={formatDate(user.createdAt, true)} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Status</p>
                        <Badge className={user.paymentStatus === "completed" ? "bg-green-500" : "bg-orange-500"}>
                            {user.paymentStatus || "pending"}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount</p>
                        <p className="text-lg font-bold">{formatCurrencyINR(user.amount)}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Payment ID</p>
                        <p className="font-mono text-sm break-all">{user.paymentId || "—"}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Order ID</p>
                        <p className="font-mono text-sm break-all">{user.orderId || "—"}</p>
                    </div>
                    {user.paymentStatus === "completed" && (
                        <div className="md:col-span-2 pt-2">
                            <Button onClick={handleDownload} disabled={downloading} className="bg-amber-500 text-black hover:bg-amber-400">
                                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                {downloading ? "Preparing..." : "Download Invoice PDF"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ProfileField({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
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
