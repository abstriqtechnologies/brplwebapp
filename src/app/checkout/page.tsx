import { redirect } from "next/navigation";
import { verifyPending } from "@/lib/auth/crypto";
import { verifyAuth } from "@/lib/auth/crypto";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { getAuthSession } from "@/lib/session";
import { staleJwtRedirect } from "@/lib/auth/stale-jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import CheckoutClient from "./CheckoutClient";
import { REGISTRATION_AMOUNT_RUPEES } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * Server-side guard for /checkout.
 *
 * Allowed if ANY of:
 *   - Brpl_pending cookie (OTP-verified, not registered)
 *   - Brpl_auth cookie with paid:false (registered but unpaid)
 *
 * Disallowed:
 *   - No cookies at all → /login
 *   - Brpl_auth with paid:true → /dashboard (idempotent)
 */
export default async function CheckoutPage({
    searchParams,
}: {
    searchParams: { next?: string; ref?: string; coupon?: string };
}) {
    const c = await cookies();
    const pendingToken = c.get(COOKIE_NAMES.PENDING)?.value;
    const authToken = c.get(COOKIE_NAMES.AUTH)?.value;

    if (!pendingToken && !authToken) {
        redirect(`/login?next=${encodeURIComponent(checkoutTarget(searchParams))}`);
    }

    // Idempotent guard: paid user landed here by mistake → dashboard.
    if (authToken) {
        const payload = await verifyAuth(authToken);
        if (payload?.paid === true) redirect(safeNext(searchParams.next, "/dashboard"));
    }

    let phone: string | null = null;
    let existingUser: Awaited<ReturnType<typeof loadUser>> = null;

    if (pendingToken) {
        const payload = await verifyPending(pendingToken);
        if (!payload) redirect(`/login?next=${encodeURIComponent(checkoutTarget(searchParams))}`);
        phone = payload.phone;
        existingUser = await loadUser(phone);
    } else if (authToken) {
        const session = await getAuthSession();
        if (!session) {
            // Stale JWT — the cookie is valid but the user is gone. Redirect
            // to /login; the middleware clears the cookie on the next request.
            await staleJwtRedirect(checkoutTarget(searchParams));
            return null; // unreachable
        }
        if (session.paymentStatus === "completed") redirect(safeNext(searchParams.next, "/dashboard"));
        phone = session.phone;
        existingUser = {
            _id: session.sub,
            phone: session.phone,
            name: session.name,
            email: session.email,
            role: session.role,
            state: session.state,
            city: session.city,
        };
    }

    return (
        <CheckoutClient
            phone={phone!}
            next={safeNext(searchParams.next, "/dashboard")}
            registrationFeeRupees={REGISTRATION_AMOUNT_RUPEES}
            existingUser={existingUser}
            initialCouponCode={searchParams.ref ?? searchParams.coupon ?? ""}
        />
    );
}

function checkoutTarget(params: { next?: string; ref?: string; coupon?: string }): string {
    const qs = new URLSearchParams();
    const code = params.ref ?? params.coupon;
    if (code?.trim()) qs.set("ref", code.trim().slice(0, 64));
    const next = safeNext(params.next, "");
    if (next) qs.set("next", next);
    const suffix = qs.toString();
    return suffix ? `/checkout?${suffix}` : "/checkout";
}

function safeNext(next: string | undefined, fallback: string): string {
    if (!next) return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//")) return fallback;
    return next;
}

async function loadUser(phone: string) {
    await connectDB();
    const u = await User.findOne({ phone }).lean();
    if (!u) return null;
    return {
        _id: String(u._id),
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: u.role as string | undefined,
        state: u.state,
        city: u.city,
    };
}
