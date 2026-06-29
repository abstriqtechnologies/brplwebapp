/**
 * Public API for per-page SEO overrides.
 *
 * GET /api/seo?path=/about-us  → { title, description, keywords, ... }
 *
 * No auth required — used client-side by the SEO.tsx Helmet component.
 */

import { NextRequest } from "next/server";
import { getSeoAll } from "@/lib/siteContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const path = req.nextUrl.searchParams.get("path")?.toLowerCase().trim() || "";

    if (!path) {
        return Response.json({ ok: false, error: "path query param required" }, { status: 400 });
    }

    const all = await getSeoAll();
    const meta = all?.[path];

    if (!meta) {
        return Response.json({ ok: true, data: null });
    }

    return Response.json({
        ok: true,
        data: {
            title: meta.title || "",
            description: meta.description || "",
            keywords: meta.keywords || "",
            ogTitle: meta.ogTitle || "",
            ogDescription: meta.ogDescription || "",
            ogImage: meta.ogImage || "",
            customHeadScripts: meta.customHeadScripts || "",
        },
    });
}
