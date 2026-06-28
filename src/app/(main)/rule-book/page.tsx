import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { SafeHtml } from "@/components/SafeHtml";
import { RuleBookStaticContent } from "@/components/RuleBookStaticContent";
import { getSiteContext, getLegal } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";

export const dynamic = "force-dynamic";

/**
 * The Rule Book page. The 700+ lines of fallback content were extracted
 * to `RuleBookStaticContent.tsx` in Phase 3.8 so this file stays small
 * and easy to scan.
 */
export default async function RuleBook() {
    const [ctx, legal] = await Promise.all([
        getSiteContext(),
        getLegal(),
    ]);

    const pageData = ctx.pages["rule-book"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} />
            </SiteContextProvider>
        );
    }

    const rulebookContent = (legal?.rulebook?.content || "").trim();

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
                <SEO
                    title="Rule Book"
                    description="Rule Book of Beyond Reach Premier League (BRPL)."
                />
                <PageBanner pageKey="ruleBook" title="Rule Book" currentPage="Rule Book" />

                <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                    <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                        {rulebookContent ? (
                            <section>
                                <h1 className="text-3xl md:text-4xl font-bold font-display text-[#111a45] mb-8">
                                    {legal?.rulebook?.title || "BRPL Rule Book"}
                                </h1>
                                <SafeHtml
                                    html={decodeHtmlEntities(rulebookContent)}
                                    className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                                />
                            </section>
                        ) : (
                            <RuleBookStaticContent />
                        )}
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}