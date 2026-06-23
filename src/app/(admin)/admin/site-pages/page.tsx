"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { getSitePage, updateSitePage } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";

// Mirror of SITE_PAGE_KEYS from the SitePage model. We redefine here to avoid
// pulling mongoose into a client component.
const SITE_PAGE_KEYS = [
    "about-us",
    "teams",
    "career",
    "contact-us",
    "events-page",
    "partners",
    "registration-page",
    "types-of-partners",
    "blog-index",
    "news-index",
    "privacy-page",
    "terms-page",
    "rule-book",
    "faqs-page",
] as const;

type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

const TITLES: Record<SitePageKey, string> = {
    "about-us": "About Us",
    "teams": "Teams",
    "career": "Career",
    "contact-us": "Contact Us",
    "events-page": "Events Page",
    "partners": "Partners",
    "registration-page": "Registration Page",
    "types-of-partners": "Types of Partners",
    "blog-index": "Blog Index",
    "news-index": "News Index",
    "privacy-page": "Privacy Policy",
    "terms-page": "Terms & Conditions",
    "rule-book": "Rule Book",
    "faqs-page": "FAQs Page",
};

type FormState = {
    title: string;
    subtitle: string;
    heroImage: string;
    body: string;
    ctaText: string;
    ctaLink: string;
};

const EMPTY_FORM: FormState = {
    title: "",
    subtitle: "",
    heroImage: "",
    body: "",
    ctaText: "",
    ctaLink: "",
};

export default function SitePagesAdmin() {
    const [activeKey, setActiveKey] = useState<SitePageKey>(SITE_PAGE_KEYS[0]);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadPage = async (key: SitePageKey) => {
        setLoading(true);
        try {
            const res = await getSitePage(key);
            if (res.ok && res.data) {
                setForm({
                    title: res.data.title || "",
                    subtitle: res.data.subtitle || "",
                    heroImage: res.data.heroImage || "",
                    body: res.data.body || "",
                    ctaText: res.data.ctaText || "",
                    ctaLink: res.data.ctaLink || "",
                });
            } else {
                setForm({ ...EMPTY_FORM, title: TITLES[key] });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to load page" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPage(activeKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey]);

    const set = (k: keyof FormState, v: string) => setForm({ ...form, [k]: v });

    const save = async () => {
        setSaving(true);
        try {
            const payload = {
                title: form.title,
                subtitle: form.subtitle,
                heroImage: form.heroImage,
                body: form.body,
                ctaText: form.ctaText,
                ctaLink: form.ctaLink,
            };
            const res = await updateSitePage(activeKey, payload);
            if (res.ok) {
                toast({ title: "Success", description: `${TITLES[activeKey]} saved` });
                // Re-fetch the latest doc to keep the form in sync
                await loadPage(activeKey);
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
            }
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Site Pages</h1>
                <p className="text-slate-500 mt-1">
                    Edit titles, hero images, and body content for all simple content pages.
                </p>
            </div>

            <Tabs
                value={activeKey}
                onValueChange={(v) => setActiveKey(v as SitePageKey)}
            >
                <Card>
                    <CardHeader className="overflow-x-auto pb-0">
                        <TabsList className="flex flex-wrap h-auto bg-transparent p-0 gap-1">
                            {SITE_PAGE_KEYS.map((k) => (
                                <TabsTrigger
                                    key={k}
                                    value={k}
                                    className="data-[state=active]:bg-amber-500 data-[state=active]:text-black border border-transparent data-[state=active]:border-amber-500"
                                >
                                    {TITLES[k]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardHeader>
                </Card>

                {SITE_PAGE_KEYS.map((k) => (
                    <TabsContent key={k} value={k} className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{TITLES[k]}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="p-8 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {k !== activeKey ? null : (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="md:col-span-2">
                                                        <Label className="mb-1 block">Title</Label>
                                                        <Input
                                                            value={form.title}
                                                            onChange={(e) => set("title", e.target.value)}
                                                            placeholder="Page title"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <Label className="mb-1 block">Subtitle</Label>
                                                        <Input
                                                            value={form.subtitle}
                                                            onChange={(e) => set("subtitle", e.target.value)}
                                                            placeholder="Optional subtitle"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <Label className="mb-1 block">Hero Image URL</Label>
                                                        <Input
                                                            value={form.heroImage}
                                                            onChange={(e) => set("heroImage", e.target.value)}
                                                            placeholder="https://..."
                                                        />
                                                    </div>
                                                    {form.heroImage && (
                                                        <div className="md:col-span-2">
                                                            <img
                                                                src={form.heroImage}
                                                                alt=""
                                                                className="max-h-40 rounded border"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Label className="mb-1 block">CTA Text</Label>
                                                        <Input
                                                            value={form.ctaText}
                                                            onChange={(e) => set("ctaText", e.target.value)}
                                                            placeholder="Learn more"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="mb-1 block">CTA Link</Label>
                                                        <Input
                                                            value={form.ctaLink}
                                                            onChange={(e) => set("ctaLink", e.target.value)}
                                                            placeholder="/somewhere"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <Label className="mb-1 block">Body</Label>
                                                        <Textarea
                                                            rows={10}
                                                            value={form.body}
                                                            onChange={(e) => set("body", e.target.value)}
                                                            placeholder="Page body content..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end">
                                                    <Button
                                                        onClick={save}
                                                        disabled={saving}
                                                        className="bg-amber-500 text-black hover:bg-amber-400"
                                                    >
                                                        {saving ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4 mr-2" />
                                                        )}
                                                        Save {TITLES[activeKey]}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
