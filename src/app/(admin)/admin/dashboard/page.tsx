"use client";

import { LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
    superadmin: "Super Admin",
    subadmin: "Sub Admin",
    seo_content: "SEO Content",
};

export default function AdminDashboardPage() {
    const { me, logout } = useAdminAuth();
    const email = me?.email || "—";
    const role = me?.role || "subadmin";
    const roleLabel = ROLE_LABEL[role] ?? role;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 text-center">
                <img
                    src="/logo.webp"
                    alt="BRPL"
                    className="mx-auto h-16 w-16 object-contain"
                />
                <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    BRPL Admin
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Signed in as
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200 break-all">
                    {email}
                </p>
                <span className="mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {roleLabel}
                </span>
                <div className="mt-6">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            void logout();
                        }}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
