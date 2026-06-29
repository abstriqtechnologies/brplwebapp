import "server-only";
import { connectDB } from "@/lib/mongodb";
import SitePage, { SITE_PAGE_KEYS } from "@/models/SitePage";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";

/**
 * Seeds the SitePage collection with initial empty sections for all registered pages.
 * This creates a DB entry for each page so the admin can start editing immediately.
 * It is idempotent — existing entries are not overwritten.
 */
export async function seedPages() {
  await connectDB();

  for (const key of SITE_PAGE_KEYS) {
    const config = PAGE_REGISTRY[key];
    if (!config) continue;
    const existing = await SitePage.findOne({ key });
    if (existing) continue;

    await SitePage.create({
      key,
      title: config.label,
      sections: config.sections.map((sc, i) => ({
        _id: `new-${sc.type}-${i}`,
        type: sc.type,
        order: i,
        title: sc.label,
        active: true,
      })),
      meta: {},
    });
  }

  console.log(`Seeded ${Object.keys(PAGE_REGISTRY).length} pages`);
}
