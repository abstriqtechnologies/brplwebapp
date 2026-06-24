"use client";

import { SectionForm } from "@/components/admin/SectionForm";
import { getAboutSection, updateAboutSection } from "@/apihelper/admin";

export default function MissionVisionPage() {
    return (
        <SectionForm
            title="Mission & Vision"
            description="Mission and vision statements for the league."
            loadData={() => getAboutSection("mission-vision")}
            saveData={(b) => updateAboutSection("mission-vision", b)}
            fields={[
                { name: "missionTitle", label: "Mission Title", type: "text" },
                { name: "missionBody", label: "Mission Body", type: "textarea", rows: 5 },
                { name: "visionTitle", label: "Vision Title", type: "text" },
                { name: "visionBody", label: "Vision Body", type: "textarea", rows: 5 },
                { name: "image", label: "Image URL", type: "url", image: true },
            ]}
        />
    );
}
