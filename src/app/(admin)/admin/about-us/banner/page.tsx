"use client";

import { SectionForm } from "@/components/admin/SectionForm";
import { getAboutSection, updateAboutSection } from "@/apihelper/admin";

export default function AboutBannerPage() {
    return (
        <SectionForm
            title="About Us — Banner"
            description="Top banner for the About Us page."
            loadData={() => getAboutSection("banner")}
            saveData={(b) => updateAboutSection("banner", b)}
            fields={[
                { name: "title", label: "Title", type: "text" },
                { name: "subtitle", label: "Subtitle", type: "textarea" },
                { name: "image", label: "Image URL", type: "url" },
            ]}
        />
    );
}
