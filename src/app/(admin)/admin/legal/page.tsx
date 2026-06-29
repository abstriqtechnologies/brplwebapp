"use client";

import Link from "next/link";
import { FileText, HelpCircle, ChevronRight } from "lucide-react";

const LEGAL_CARDS = [
    {
        icon: FileText,
        title: "Privacy Policy",
        description: "Manage the privacy policy document displayed on the site.",
        href: "/admin/legal/privacy",
        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    {
        icon: FileText,
        title: "Terms & Conditions",
        description: "Manage the terms and conditions document displayed on the site.",
        href: "/admin/legal/terms",
        color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    },
    {
        icon: HelpCircle,
        title: "FAQs",
        description: "Manage frequently asked questions shown on the site.",
        href: "/admin/legal/faqs",
        color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
];

export default function AdminLegalPage() {
    return (
        <main className="p-6 min-w-0">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Legal
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage legal documents and FAQs
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {LEGAL_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}
                                >
                                    <Icon className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {card.title}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {card.description}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
