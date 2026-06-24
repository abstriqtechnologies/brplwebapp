import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-insecure-secret-change-me"
);

const PROTECTED_PATHS = ["/dashboard"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (!PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.next();
    }

    const token = req.cookies.get("brpl_auth")?.value;
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (payload.purpose !== "auth") throw new Error("wrong purpose");
        return NextResponse.next();
    } catch {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        const res = NextResponse.redirect(url);
        res.cookies.delete("brpl_auth");
        return res;
    }
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
