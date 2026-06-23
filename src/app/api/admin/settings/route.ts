import SiteSettings from "@/models/SiteSettings";
import { buildSingleDocHandlers } from "@/lib/singleDocCms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { GET, PATCH } = buildSingleDocHandlers(
    () => SiteSettings,
    () => ({ siteName: "Beyond Reach Premier League", registrationFee: 1499 })
);

export { GET, PATCH };