"use client";

import { CmsForm } from "@/components/admin/CmsForm";
import { getSocialContact, updateSocialContact } from "@/apihelper/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function SocialContactPage() {
    return (
        <CmsForm
            title="Social & Contact"
            description="Public contact details and social media links."
            getData={getSocialContact}
            saveData={updateSocialContact}
            fields={[
                { name: "contactEmail", label: "Contact Email", type: "email" },
                { name: "contactPhone", label: "Contact Phone", type: "tel" },
                { name: "address", label: "Address", type: "textarea" },
            ]}
        >
            {(data) => <SocialsEditor data={data} />}
        </CmsForm>
    );
}

function SocialsEditor({ data }: { data: any }) {
    const [socials, setSocials] = useState<Record<string, string>>(data.socials || {});
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateSocialContact({ socials });
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
