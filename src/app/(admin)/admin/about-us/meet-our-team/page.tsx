"use client";

import { SectionForm } from "@/components/admin/SectionForm";
import { getAboutSection, updateAboutSection } from "@/apihelper/admin";

export default function MeetOurTeamPage() {
    return (
        <SectionForm
            title="Meet Our Team"
            description="About Us page team introduction block."
            loadData={() => getAboutSection("meet-our-team")}
            saveData={(b) => updateAboutSection("meet-our-team", b)}
            fields={[
                { name: "title", label: "Title", type: "text" },
                { name: "subtitle", label: "Subtitle", type: "text" },
                { name: "image", label: "Image URL", type: "url" },
                { name: "body", label: "Body", type: "textarea", rows: 6 },
            ]}
        />
    );
}
