import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // 301: any old CMS-customized headerCtaLink: "/registration" continues to land on /login.
    // After Task 13 migrates the DB, no row will point here. Removed in Task 14 (Phase E).
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl, { status: 301 });
}
