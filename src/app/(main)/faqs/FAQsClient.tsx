"use client";

import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import PageBanner from "@/components/PageBanner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
    _id: string;
    question: string;
    answer: string;
}

/** FAQPage schema for search engines (Google FAQ rich results) */
function buildFaqPageSchema(faqs: FAQ[]) {
    if (!faqs.length) return null;
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };
}

const initialFaqs: FAQ[] = [
    {
        _id: "default-1",
        question: "1. Is the fee refundable?",
        answer: "The registration fee is non-refundable as it covers your backend processing and kit costs."
    },
    {
        _id: "default-2",
        question: "2. What if I don't get selected?",
        answer: "Even if you are not selected for this season, your registration remains valuable. When you register for the next season, you will receive an exclusive offer on the registration fee."
    },
    {
        _id: "default-3",
        question: "3. What is the Age Limit?",
        answer: "Open for players aged 18 to 40. Each team will include a minimum of 2 players from the 18–20 age group, with 1 player in the playing XI for every match."
    },
    {
        _id: "default-4",
        question: "4. Can I register now and upload video later?",
        answer: "Yes! You can pay ₹1499 now to book your slot (before they fill up) and upload your trial video anytime within 7 days from your dashboard."
    }
];

const FAQsClient = () => {
    const [faqs] = useState<FAQ[]>(initialFaqs);
    const [isLoading] = useState(false);

    const faqSchema = useMemo(() => buildFaqPageSchema(faqs), [faqs]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {faqSchema && (
                <Helmet>
                    <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
                </Helmet>
            )}
            <PageBanner pageKey="faqs" title="Frequently Asked Questions" currentPage="FAQs" />

            <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12">
                    <h2 className="text-3xl font-extrabold text-[#111a45] mb-8 text-center">
                        Common Questions
                    </h2>

                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : faqs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No FAQs available at the moment.</div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={faq._id} value={`item-${index}`} className="border rounded-lg px-4 bg-slate-50 data-[state=open]:bg-white data-[state=open]:shadow-sm transition-all">
                                    <AccordionTrigger className="text-lg font-semibold text-slate-800 hover:text-yellow-600 text-left">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap p-5">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FAQsClient;