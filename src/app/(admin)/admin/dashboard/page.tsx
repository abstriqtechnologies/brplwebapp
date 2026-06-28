"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminDashboardPage() {
    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
            <AdminSidebar />
            <main className="flex-1 p-8">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Welcome back. Pick a section from the sidebar to get started.
                </p>
            </main>
        </div>
    );
}