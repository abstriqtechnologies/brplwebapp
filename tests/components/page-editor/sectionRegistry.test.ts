import { describe, it, expect } from "vitest";

// Mock next/dynamic — just return the imported module as a component
// so tests don't need a Next.js runtime.
import dynamic from "next/dynamic";

describe("Section Registry", () => {
  it("should have all required section types", async () => {
    const { SECTION_REGISTRY } = await import(
      "@/components/admin/page-editor/sectionRegistry"
    );
    const required = [
      "hero-banner",
      "who-we-are",
      "about-text",
      "mission-vision",
      "trust-bar",
    ];
    for (const type of required) {
      expect(SECTION_REGISTRY[type]).toBeDefined();
      expect(SECTION_REGISTRY[type].editor).toBeDefined();
      expect(SECTION_REGISTRY[type].defaultData).toBeDefined();
    }
  });

  it("each section should have defaultData matching its fields", async () => {
    const { SECTION_REGISTRY } = await import(
      "@/components/admin/page-editor/sectionRegistry"
    );
    const about = SECTION_REGISTRY["about-text"];
    expect(about.defaultData).toHaveProperty("title");
    expect(about.defaultData).toHaveProperty("description");
    expect(about.defaultData).toHaveProperty("image");
  });
});
