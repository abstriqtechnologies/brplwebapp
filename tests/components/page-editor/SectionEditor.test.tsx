import { describe, it, expect } from "vitest";

describe("SectionEditor", () => {
  it("should map section type to correct editor component from registry", async () => {
    const { SECTION_REGISTRY } = await import(
      "@/components/admin/page-editor/sectionRegistry"
    );

    const hero = SECTION_REGISTRY["hero-banner"];
    expect(hero).toBeDefined();
    expect(hero.editor).toBeDefined();
    expect(hero.defaultData).toEqual({
      title: "Page Title",
      subtitle: "",
      image: "/tenis.webp",
      imageMobile: "",
      ctaText: "",
      ctaLink: "",
    });
  });

  it("should render SectionEditor for known section type", async () => {
    const { SECTION_REGISTRY } = await import(
      "@/components/admin/page-editor/sectionRegistry"
    );

    const aboutEntry = SECTION_REGISTRY["about-text"];
    expect(aboutEntry).toBeDefined();
    expect(aboutEntry.editor).toBeDefined();
    expect(aboutEntry.defaultData).toHaveProperty("title");
    expect(aboutEntry.defaultData).toHaveProperty("description");
    expect(aboutEntry.defaultData).toHaveProperty("image");
  });

  it("all core editors should be registered in SECTION_REGISTRY", async () => {
    const { SECTION_REGISTRY } = await import(
      "@/components/admin/page-editor/sectionRegistry"
    );

    const coreSections = [
      "hero-banner",
      "who-we-are",
      "about-text",
      "mission-vision",
      "generic-content",
      "legal-content",
    ];

    for (const type of coreSections) {
      const entry = SECTION_REGISTRY[type];
      expect(entry).toBeDefined();
      expect(entry.editor).toBeDefined();
      expect(entry.defaultData).toBeDefined();
    }
  });
});
