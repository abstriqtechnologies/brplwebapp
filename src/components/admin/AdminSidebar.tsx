"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Ticket, PenSquare, LogOut, PanelLeftClose, PanelLeftOpen, Link2, Search, FileText, Newspaper, Brain, TicketCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Players", href: "/admin/players", icon: Users },
    { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    { label: "Referral", href: "/admin/referrals", icon: Link2 },
    { label: "Blogs", href: "/admin/blogs", icon: PenSquare },
    { label: "News", href: "/admin/news", icon: Newspaper },
    { label: "Pages", href: "/admin/pages", icon: FileText },
    { label: "Seo", href: "/admin/seo", icon: Search },
    { label: "Legal", href: "/admin/legal", icon: FileText },
    { label: "AI Context", href: "/admin/ai-context", icon: Brain },
    { label: "AI Leads", href: "/admin/ai-leads", icon: Users },
    { label: "AI Tickets", href: "/admin/ai-tickets", icon: TicketCheck },
];

/**
 * Shared sidebar for /admin/* pages. Includes the brand block with collapse
 * toggle, nav items, and a logout button pinned to the bottom.
 */
export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const logout = async () => {
        try {
            await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" });
        } finally {
            router.replace("/admin/login");
            router.refresh();
        }
    };

    return (
        <aside
            className={cn(
                "shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-[width] duration-200 ease-in-out",
                collapsed ? "w-16" : "w-52",
            )}
        >
            <div
                className={cn(
                    "p-2.5 flex items-center min-h-[64px] gap-2",
                    collapsed ? "justify-center" : "justify-between",
                )}
            >
                <img
                    src="/logo.webp"
                    alt="BRPL"
                    className={cn("object-contain", collapsed ? "h-8 w-8" : "max-w-[120px] h-auto")}
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
            </div>

            <Separator />

            <nav className="flex-1 px-2 py-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            title={collapsed ? item.label : undefined}
                            onMouseEnter={() => router.prefetch(item.href)}
                            onFocus={() => router.prefetch(item.href)}
                            className={cn(
                                "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                                collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 py-2",
                                isActive
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-2 py-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                    variant="outline"
                    className={cn("w-full", collapsed ? "" : "justify-start")}
                    onClick={() => {
                        void logout();
                    }}
                    title={collapsed ? "Logout" : undefined}
                    aria-label="Logout"
                >
                    <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
                    {!collapsed && <span>Logout</span>}
                </Button>
            </div>
        </aside>
    );
}
