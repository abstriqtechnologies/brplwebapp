import React from 'react';
import PageBanner from '@/components/PageBanner';
import { getSiteContext } from '@/lib/siteContext';
import { SiteContextProvider } from '@/components/SiteContextProvider';

export const dynamic = "force-dynamic";

export default async function TypesOfPartners() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-white font-sans text-slate-800">
                <PageBanner pageKey="typesOfPartners" title="Types of Partners" currentPage="Types of Partners" />

                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                        {/* Brpl Sponsors Column */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 shadow-sm">
                            <h2 className="text-3xl font-bold text-[#111a45] mb-6 border-b-4 border-yellow-400 pb-2 inline-block">
                                Brpl Sponsors
                            </h2>
                            <div className="space-y-6">
                                <p className="text-lg text-slate-600">
                                    Our sponsors are integral to the success of the league, providing crucial support and resources.
                                </p>
                                {/* Placeholder for Sponsor Logos/List */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Sponsor 1</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Sponsor 2</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Sponsor 3</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Sponsor 4</div>
                                </div>
                            </div>
                        </div>

                        {/* Brpl Partners Column */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 shadow-sm">
                            <h2 className="text-3xl font-bold text-[#111a45] mb-6 border-b-4 border-yellow-400 pb-2 inline-block">
                                Brpl Partners
                            </h2>
                            <div className="space-y-6">
                                <p className="text-lg text-slate-600">
                                    Our strategic partners help us reach new heights and deliver an exceptional experience.
                                </p>
                                {/* Placeholder for Partner Logos/List */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Partner 1</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Partner 2</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Partner 3</div>
                                    <div className="h-32 bg-white rounded border flex items-center justify-center text-slate-400 font-medium">Partner 4</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}
