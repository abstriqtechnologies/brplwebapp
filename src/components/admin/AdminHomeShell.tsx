"use client";

import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * Minimal session-gated wrapper for the admin section.
 *
 * Replaces the deleted AdminShell/AdminSidebar/AdminHeader trio. Verifies the
 * admin session via useAdminAuth, then renders children. The actual page
 * content (e.g. /admin/dashboard) owns its own visual chrome — there is no
 * sidebar or admin header.
 */
export function AdminHomeShell({ children }: { children: React.ReactNode }) {
    const { me, refresh } = useAdminAuth();

    useEffect(() => {
        // The (admin) layout already redirects unauthenticated users via
        // getAdminSession(), but the client-side hook needs to hydrate so
        // child pages can read `me` without an extra request.
        if (!me) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <>{children}</>;
}
