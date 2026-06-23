"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/apihelper/api";

export type AdminMe = {
    email: string;
    name?: string;
    role: "superadmin" | "subadmin" | "seo_content";
    sub?: string;
};

export function useAdminAuth() {
    const [me, setMe] = useState<AdminMe | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<AdminMe>("/api/admin/me");
            if (res.ok) {
                setMe(res.data);
            } else if (res.status === 401) {
                setMe(null);
                if (!pathname?.startsWith("/admin/login")) {
                    router.replace(`/admin/login?next=${encodeURIComponent(pathname || "/admin/dashboard")}`);
                }
            } else {
                setMe(null);
            }
        } catch {
            setMe(null);
        } finally {
            setLoading(false);
        }
    }, [pathname, router]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const logout = useCallback(async () => {
        try {
            await api.post("/api/admin/auth/logout");
        } catch {
            /* ignore */
        }
        setMe(null);
        router.replace("/admin/login");
    }, [router]);

    return { me, loading, refresh, logout };
}
