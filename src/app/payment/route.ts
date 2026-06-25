import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * /payment → /checkout (308 permanent).
 *
 * Preserved for 30+ days so any external links continue to work while
 * search engines and analytics pick up the canonical /checkout URL.
 */
export function GET(req: NextRequest) {
    const url = req.nextUrl.clone();
    url.pathname = "/checkout";
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, 308);
}