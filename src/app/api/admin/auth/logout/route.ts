import { ok } from "@/lib/adminApi";
import { clearAdminCookie } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
    await clearAdminCookie();
    return ok({ success: true });
}
