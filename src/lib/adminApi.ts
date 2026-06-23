import { NextResponse } from "next/server";
import { getAdminSession, type AdminSession } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";

export type RoleName = "superadmin" | "subadmin" | "seo_content";

export function ok<T>(data: T, init?: ResponseInit) {
    return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
    return NextResponse.json({ ok: false, error }, { status });
}

export async function requireAdmin(): Promise<AdminSession | NextResponse> {
    const session = await getAdminSession();
    if (!session) {
        return fail("Unauthorized", 401);
    }
    return session;
}

export async function requireAdminDb() {
    const session = await requireAdmin();
    if (session instanceof NextResponse) return session;
    await connectDB();
    return session;
}

export function isSuperAdmin(session: AdminSession) {
    return session.role === "superadmin";
}

/** Roles allowed for this endpoint. superadmin always passes. */
export function hasRole(session: AdminSession, allowed: RoleName[]) {
    if (session.role === "superadmin") return true;
    return allowed.includes(session.role);
}

export function badRequest(message: string) {
    return fail(message, 400);
}

export function notFound(message = "Not found") {
    return fail(message, 404);
}

export function serverError(err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal error";
    return fail(message, 500);
}
