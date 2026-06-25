/** @type {import('next').NextConfig} */
const nextConfig = {
  // Modern image formats served automatically by next/image
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year - images are content-hashed
  },

  // Security headers + cache-control.
  //
  // The canonical source of truth lives in `src/lib/security-headers.ts`
  // (which is unit-tested). The config below mirrors it — keep the two in
  // sync when adding/removing headers.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const securityHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "frame-src https://checkout.razorpay.com https://api.razorpay.com",
          "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com",
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
        ].join("; "),
      },
      ...(isProd
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
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
  },

  // Production source maps off (smaller bundles)
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,

  // Use SWC minification (default in Next 14, but explicit)
  swcMinify: true,

  // Tree-shake lucide-react etc.
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
      preventFullImport: true,
    },
  },
};

export default nextConfig;
