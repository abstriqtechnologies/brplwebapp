"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export function AdminShell({
    session,
    children,
}: {
    session: { email: string; name?: string; role: "superadmin" | "subadmin" | "seo_content" };
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const router = useRouter();
    const { me, refresh, logout } = useAdminAuth();

    useEffect(() => {
        // Default: open on desktop, closed on mobile
        const update = () => setIsSidebarOpen(window.innerWidth >= 768);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Hydrate useAdminAuth with the SSR session so the first paint matches.
    useEffect(() => {
        if (!me) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const email = me?.email || session.email;
    const role = me?.role || session.role;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative text-slate-900 dark:text-slate-100">
            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                role={role}
            />
            <div
                className={`flex-1 flex flex-col transition-all duration-300 w-full min-w-0 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"
                    }`}
            >
                <AdminHeader
                    onToggleSidebar={() => setIsSidebarOpen((s) => !s)}
                    email={email}
                    onLogout={async () => {
                        await logout();
                        router.replace("/admin/login");
                    }}
                />
                <main className="p-4 md:p-6 min-w-0 flex-1">{children}</main>
            </div>
        </div>
    );
}
