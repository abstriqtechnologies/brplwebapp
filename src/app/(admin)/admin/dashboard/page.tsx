"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Users,
    UserCheck,
    UserX,
    TrendingUp,
    Briefcase,
    QrCode,
    HelpCircle,
    Info,
    Share2,
    ImageIcon,
    FileText,
    LayoutDashboard,
    Shield,
    BookOpen,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import { getDashboardStats, getDashboardCharts, getAdminRecords } from "@/apihelper/admin";
import { formatDate } from "@/utils/adminDate";
import { toast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const SEO_MODULES = [
    { title: "Home Page CMS", icon: LayoutDashboard, path: "/admin/cms/banners", color: "bg-yellow-100 text-yellow-600", desc: "Manage banners and Who We Are section." },
    { title: "About Us CMS", icon: Info, path: "/admin/about-us/about-brpl", color: "bg-rose-100 text-rose-600", desc: "Edit About Us page content & team." },
    { title: "Manage FAQs", icon: HelpCircle, path: "/admin/faqs", color: "bg-orange-100 text-orange-600", desc: "Add or update frequently asked questions." },
    { title: "Manage Jobs", icon: Briefcase, path: "/admin/jobs", color: "bg-green-100 text-green-600", desc: "Update and post new career opportunities." },
    { title: "QR Campaigns", icon: QrCode, path: "/admin/campaigns", color: "bg-indigo-100 text-indigo-600", desc: "Handle QR code marketing campaigns." },
    { title: "Ambassadors", icon: Users, path: "/admin/ambassadors", color: "bg-purple-100 text-purple-600", desc: "Manage brand ambassadors." },
    { title: "Teams", icon: Users, path: "/admin/teams", color: "bg-pink-100 text-pink-600", desc: "Update team members and profiles." },
    { title: "Partners", icon: Users, path: "/admin/partners", color: "bg-teal-100 text-teal-600", desc: "Manage partner logos and details." },
    { title: "Social & Contact", icon: Share2, path: "/admin/social-contact", color: "bg-blue-100 text-blue-600", desc: "Update social media links & contacts." },
    { title: "Page Banner", icon: ImageIcon, path: "/admin/page-banner", color: "bg-cyan-100 text-cyan-600", desc: "Update banners for inner pages." },
    { title: "Privacy Policy", icon: Shield, path: "/admin/privacy-policy", color: "bg-slate-100 text-slate-600", desc: "Update privacy guidelines." },
    { title: "Terms & Conditions", icon: FileText, path: "/admin/terms-conditions", color: "bg-gray-100 text-gray-600", desc: "Update terms of service." },
];

export default function AdminDashboardPage() {
    const { me } = useAdminAuth();
    const role = me?.role || "subadmin";

    const [stats, setStats] = useState({ paidCount: 0, unpaidCount: 0, totalRevenue: 0, totalUsers: 0 });
    const [chartData, setChartData] = useState<{ name: string; users: number; revenue: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    useEffect(() => {
        if (role === "seo_content") {
            setIsLoading(false);
            return;
        }
        (async () => {
            await Promise.all([fetchStats(), fetchUsers()]);
        })();
    }, [role]);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const [statsRes, chartsRes] = await Promise.all([
                getDashboardStats(),
                getDashboardCharts(),
            ]);
            if (statsRes.ok && statsRes.data) {
                setStats(statsRes.data.stats);
            }
            if (chartsRes.ok && chartsRes.data) {
                setChartData(chartsRes.data);
            }
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "Error", description: "Failed to load stats" });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await getAdminRecords(1, 5, "", "users");
            if (res.ok && res.data) {
                setUsers(res.data.items);
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load users" });
        } finally {
            setIsLoadingUsers(false);
        }
    };

    if (role === "seo_content") {
        return (
            <div className="space-y-8 animate-fade-in pb-10">
                <div className="bg-gradient-to-r from-emerald-900 to-teal-800 p-8 rounded-2xl text-white shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">Content Manager Dashboard</h1>
                            <p className="text-emerald-100/80">Manage the website&apos;s content, campaigns, and structural information.</p>
                        </div>
                        <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-sm font-bold tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" /> SEO CONTENT
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {SEO_MODULES.map((m) => (
                        <Card key={m.title} className="hover:shadow-lg transition-all hover:-translate-y-1 group">
                            <Link href={m.path} className="block w-full h-full">
                                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                                    <div className={`p-3 rounded-xl mr-4 ${m.color} group-hover:scale-110 transition-transform`}>
                                        <m.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-lg font-bold leading-tight">{m.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-500 mt-2">{m.desc}</p>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const isSuperAdmin = role === "superadmin";

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className={`bg-gradient-to-r ${isSuperAdmin ? "from-slate-900 to-slate-800" : "from-blue-900 to-indigo-800"} p-8 rounded-2xl text-white shadow-xl`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            {isSuperAdmin ? "Super Admin Control Center" : "Subadmin Portal"}
                        </h1>
                        <p className={isSuperAdmin ? "text-slate-400" : "text-blue-100/80"}>
                            {isSuperAdmin
                                ? "Welcome back. You have full system access."
                                : "Welcome back. Monitor user registrations and system metrics in real-time."}
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <span className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-sm font-bold tracking-wider">
                            SYSTEM MASTER
                        </span>
                    )}
                </div>
            </div>

            {isSuperAdmin && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickLink href="/admin/players" label="Manage Players" iconBg="bg-blue-100 text-blue-600" icon={Users} />
                    <QuickLink href="/admin/campaigns" label="QR Campaigns" iconBg="bg-purple-100 text-purple-600" icon={QrCode} />
                    <QuickLink href="/admin/jobs" label="Manage Jobs" iconBg="bg-green-100 text-green-600" icon={Briefcase} />
                    <QuickLink href="/admin/partners" label="Partner Requests" iconBg="bg-orange-100 text-orange-600" icon={Users} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Users" value={stats.totalUsers} icon={Users} accent="slate" loading={isLoading} />
                <StatCard label="Paid Members" value={stats.paidCount} icon={UserCheck} accent="green" loading={isLoading} />
                <StatCard label="Pending / Unpaid" value={stats.unpaidCount} icon={UserX} accent="orange" loading={isLoading} />
                <StatCard
                    label="Total Revenue"
                    value={stats.totalRevenue}
                    icon={TrendingUp}
                    accent="blue"
                    loading={isLoading}
                    format={(n) => `Rs. ${n.toLocaleString()}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Growth Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="dashUsersArea" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="users" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#dashUsersArea)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Revenue Stream</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <Tooltip cursor={{ fill: "transparent" }} />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">New Registrations</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-auto max-h-[700px]">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {users.slice(0, 8).map((u) => (
                                    <div key={u._id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {(u.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">{u.name || "Player"}</p>
                                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400">{formatDate(u.createdAt)}</span>
                                    </div>
                                ))}
                                {users.length === 0 && (
                                    <div className="p-8 text-center text-slate-500">No recent users</div>
                                )}
                            </div>
                        </CardContent>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/admin/players">View All Players</Link>
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold">Recent Registered Users</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/players">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingUsers ? (
                        <div className="text-center py-8 text-slate-500 animate-pulse">Loading users...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Mobile</TableHead>
                                        <TableHead>Registered At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-slate-500 h-24">No users found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        users.map((u, i) => (
                                            <TableRow key={u._id}>
                                                <TableCell className="font-medium">{i + 1}</TableCell>
                                                <TableCell>{u.name || "N/A"}</TableCell>
                                                <TableCell>{u.email || "N/A"}</TableCell>
                                                <TableCell>{u.phone || "N/A"}</TableCell>
                                                <TableCell>{formatDate(u.createdAt, true)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function QuickLink({ href, label, icon: Icon, iconBg }: { href: string; label: string; icon: any; iconBg: string }) {
    return (
        <Link href={href} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-all flex items-center gap-3 group">
            <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{label}</span>
        </Link>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
    loading,
    format,
}: {
    label: string;
    value: number;
    icon: any;
    accent: "slate" | "green" | "orange" | "blue";
    loading: boolean;
    format?: (n: number) => string;
}) {
    const accentClass = {
        slate: "border-t-slate-500",
        green: "border-t-green-500",
        orange: "border-t-orange-500",
        blue: "border-t-blue-500",
    }[accent];
    const iconWrap = {
        slate: "bg-slate-100 text-slate-600",
        green: "bg-green-100 text-green-600",
        orange: "bg-orange-100 text-orange-600",
        blue: "bg-blue-100 text-blue-600",
    }[accent];

    return (
        <Card className={`border-t-4 ${accentClass}`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                        <h3 className={`text-3xl font-bold mt-2 ${accent === "green" ? "text-green-600" : accent === "orange" ? "text-orange-600" : accent === "blue" ? "text-blue-700" : "text-slate-900 dark:text-white"}`}>
                            {loading ? "..." : format ? format(value) : value.toLocaleString()}
                        </h3>
                    </div>
                    <div className={`p-2 rounded-lg ${iconWrap}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}
