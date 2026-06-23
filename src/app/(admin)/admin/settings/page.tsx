"use client";

import { CmsForm } from "@/components/admin/CmsForm";
import { NavbarLinksEditor } from "@/components/admin/NavbarLinksEditor";
import { FooterLinksEditor } from "@/components/admin/FooterLinksEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getSettings, updateSettings } from "@/apihelper/admin";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
    return (
        <CmsForm
            title="Site Settings"
            description="Global site settings, branding, navbar/footer configuration, and registration details."
            getData={getSettings}
            saveData={updateSettings}
            fields={[
                { name: "siteName", label: "Site Name", type: "text", required: true },
                { name: "tagline", label: "Tagline", type: "text" },
                { name: "contactEmail", label: "Contact Email", type: "email" },
                { name: "contactPhone", label: "Contact Phone", type: "tel" },
                { name: "contactPhoneSecondary", label: "Contact Phone (Secondary)", type: "tel" },
                { name: "address", label: "Address", type: "textarea" },
                { name: "heroImage", label: "Hero Image URL", type: "url" },
                { name: "heroVideoUrl", label: "Hero Video URL", type: "url" },
                { name: "primaryColor", label: "Primary Color (hex)", type: "text", placeholder: "#f59e0b" },
                { name: "registrationFee", label: "Registration Fee (Rs.)", type: "number" },
                { name: "registrationDeadline", label: "Registration Deadline (text)", type: "text", placeholder: "2026-12-31" },
                { name: "trialStartDate", label: "Trial Start (text)", type: "text", placeholder: "2026-12-31" },
                { name: "trialEndDate", label: "Trial End (text)", type: "text", placeholder: "2026-12-31" },
                { name: "logoUrl", label: "Logo URL", type: "text", placeholder: "/logo.webp" },
                { name: "footerLogoUrl", label: "Footer Logo URL", type: "text" },
                { name: "faviconUrl", label: "Favicon URL", type: "text", placeholder: "/favicon.ico" },
                { name: "appleTouchIconUrl", label: "Apple Touch Icon URL", type: "text" },
                { name: "ogImage", label: "Default OG Image URL", type: "text" },
                { name: "twitterHandle", label: "Twitter Handle", type: "text", placeholder: "@brpl" },
                { name: "homeSeoTitle", label: "Home SEO Title", type: "text" },
                { name: "homeSeoDescription", label: "Home SEO Description", type: "textarea" },
                { name: "homeSeoKeywords", label: "Home SEO Keywords (comma-separated)", type: "text" },
                { name: "headerCtaText", label: "Header CTA Text", type: "text", placeholder: "Register Now" },
                { name: "headerCtaLink", label: "Header CTA Link", type: "text", placeholder: "/registration" },
                { name: "footerAboutText", label: "Footer About Text", type: "textarea" },
                { name: "mapEmbedUrl", label: "Map Embed URL", type: "text" },
                { name: "whatsappNumber", label: "WhatsApp Number (no +)", type: "text", placeholder: "918130955866" },
                { name: "floatingRegisterText", label: "Floating Register Button Text", type: "text" },
                { name: "floatingRegisterLink", label: "Floating Register Button Link", type: "text" },
            ]}
        >
            {(data) => (
                <div className="space-y-4">
                    <SocialsEditor data={data} />
                    <NavbarLinksEditor initial={data.navbarLinks || []} />
                    <FooterLinksEditor initial={data.footerLinks || []} />
                    <CustomScriptsEditor data={data} />
                </div>
            )}
        </CmsForm>
    );
}

function SocialsEditor({ data }: { data: any }) {
    const [socials, setSocials] = useState<Record<string, string>>(data.socials || {});
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateSettings({ socials });
            if (res.ok) toast({ title: "Success", description: "Socials saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Social Media Links</CardTitle>
                <Button onClick={save} disabled={saving} size="sm" className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save socials
                </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["instagram", "facebook", "twitter", "youtube", "linkedin", "whatsapp"] as const).map((k) => (
                    <div key={k}>
                        <Label className="mb-2 block capitalize">{k}</Label>
                        <Input
                            value={socials[k] || ""}
                            onChange={(e) => setSocials({ ...socials, [k]: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function CustomScriptsEditor({ data }: { data: any }) {
    const [head, setHead] = useState<string>(data.customHeadScripts || "");
    const [body, setBody] = useState<string>(data.customBodyScripts || "");
    const [savingHead, setSavingHead] = useState(false);
    const [savingBody, setSavingBody] = useState(false);

    const saveHead = async () => {
        setSavingHead(true);
        try {
            const res = await updateSettings({ customHeadScripts: head });
            if (res.ok) toast({ title: "Success", description: "Head scripts saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSavingHead(false);
        }
    };

    const saveBody = async () => {
        setSavingBody(true);
        try {
            const res = await updateSettings({ customBodyScripts: body });
            if (res.ok) toast({ title: "Success", description: "Body scripts saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed" });
        } finally {
            setSavingBody(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Custom Head & Body Scripts</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                    Paste analytics, chat widgets, or other tags. Be careful: these are rendered into the live site.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label>Custom Head Scripts</Label>
                        <Button
                            onClick={saveHead}
                            disabled={savingHead}
                            size="sm"
                            className="bg-amber-500 text-black hover:bg-amber-400"
                        >
                            {savingHead ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save head
                        </Button>
                    </div>
                    <Textarea
                        rows={8}
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
                        placeholder='<!-- e.g. <script>...</script> -->'
                        className="font-mono text-xs"
                    />
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label>Custom Body Scripts</Label>
                        <Button
                            onClick={saveBody}
                            disabled={savingBody}
                            size="sm"
                            className="bg-amber-500 text-black hover:bg-amber-400"
                        >
                            {savingBody ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save body
                        </Button>
                    </div>
                    <Textarea
                        rows={8}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder='<!-- e.g. <noscript>...</noscript> -->'
                        className="font-mono text-xs"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
