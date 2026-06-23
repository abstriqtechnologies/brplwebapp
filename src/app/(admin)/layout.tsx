import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getAdminSession();
    if (!session) {
        redirect("/admin/login?next=/admin/dashboard");
    }
    return <AdminShell session={session}>{children}</AdminShell>;
}
