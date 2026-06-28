import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";
import { AdminHomeShell } from "@/components/admin/AdminHomeShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getAdminSession();
    if (!session) {
        redirect("/admin/login?next=/admin/dashboard");
    }
    return <AdminHomeShell>{children}</AdminHomeShell>;
}
