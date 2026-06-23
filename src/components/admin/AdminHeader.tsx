"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function AdminHeader({
    onToggleSidebar,
    email,
    onLogout,
}: {
    onToggleSidebar: () => void;
    email?: string;
    onLogout: () => void;
}) {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
                <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-4">
                <Link
                    href="/admin/profile"
                    className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
                >
                    <span className="text-sm text-slate-700 dark:text-slate-200 hidden sm:block">
                        {email || "admin@brpl.com"}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-medium">
                        {(email || "A").charAt(0).toUpperCase()}
                    </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={onLogout} title="Sign Out">
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
        </header>
    );
}
