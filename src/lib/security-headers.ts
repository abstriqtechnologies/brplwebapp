/**
 * Security headers for `next.config.mjs`.
 *
 * Extracted into a testable module so we can assert the shape and contents.
 * `nextHeadersConfig()` returns the array suitable for the `headers()` field
 * of next.config — `next.config.mjs` re-exports from here.
 */

import { isProduction, isDev } from "@/lib/env";

export type Header = { key: string; value: string };
export type HeaderRule = {
    source: string;
    locale?: boolean;
    headers: Header[];
};

/**
 * The default security headers applied to every route.
 *
 * Production-only headers (HSTS) are included only when `NODE_ENV=production`.
 */
export function defaultSecurityHeaders(): Header[] {
    const headers: Header[] = [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        {
            key: "Content-Security-Policy",
            value: buildCsp(),
        },
    ];
    if (isProduction()) {
        headers.push({
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
        });
    }
    return headers;
}

/**
 * Content Security Policy.
 *
 * Strict by default. Allowed exceptions:
 *   - `script-src`: 'unsafe-inline' for Next.js bootstrap + Razorpay inline.
 *                   'unsafe-eval' is added in development ONLY — Next.js's
 *                   React Refresh runtime uses `eval()` to enable HMR, and
 *                   without it `next dev` throws `EvalError` on every page.
 *                   Production builds don't ship React Refresh, so we keep
 *                   'unsafe-eval' out of prod to preserve strict CSP.
 *   - `frame-src`:  Razorpay checkout iframe.
 *   - `img-src`:    'self', data: (for inline images), and any https source
 *                   (CMS uploads may live on CDNs).
 *   - `connect-src`: Razorpay + SMSIndiaHub webhook targets.
 *
 * NOTE: this is a starting point. After deployment, monitor CSP violations
 * (`report-uri` / `report-to`) and tighten further. For the first rollout we
 * don't enable `report-only` — we enforce immediately.
 */
function buildCsp(): string {
    // Next.js's React Refresh runtime uses eval() to enable HMR. In dev only,
    // allow it; in prod the runtime is not shipped, so we keep the strict CSP.
    const scriptSrc = [
        "'self'",
        "'unsafe-inline'",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        ...(isDev() ? ["'unsafe-eval'"] : []),
    ];

    const directives = [
        "default-src 'self'",
        // Razorpay scripts: checkout.js itself + the risk-detection bundle
        // it loads from cdn.razorpay.com. Without cdn.razorpay.com in
        // script-src, the risk bundle is blocked and the checkout fails.
        `script-src ${scriptSrc.join(" ")}`,
        // cdn.razorpay.com also serves inline styles for the checkout.
        "style-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        // Razorpay's checkout iframe.
        "frame-src https://checkout.razorpay.com https://api.razorpay.com",
        // Razorpay APIs (incl. analytics/telemetry endpoints).
        "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://lumberjack-metrics.razorpay.com",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ];
    return directives.join("; ");
}

/**
 * Full `headers()` config for next.config.mjs: the security set + the
 * existing cache-control rules for static assets.
 */
export function nextHeadersConfig(): HeaderRule[] {
    const cacheControl = [
        {
            source: "/:path*.(png|jpg|jpeg|webp|avif|svg|ico|gif)",
            locale: false,
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
            source: "/uploads/:path*",
            locale: false,
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
            source: "/_next/static/:path*",
            locale: false,
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
        {
            source: "/fonts/:path*",
            locale: false,
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
    ];
    return [{ source: "/:path*", headers: defaultSecurityHeaders() }, ...cacheControl];
}
