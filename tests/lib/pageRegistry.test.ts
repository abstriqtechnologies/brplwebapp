import { describe, it, expect } from "vitest";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";

describe("Page Registry", () => {
  it("should have all required pages", () => {
    const keys = Object.keys(PAGE_REGISTRY);
    expect(keys).toContain("home");
    expect(keys).toContain("about-us");
    expect(keys).toContain("contact-us");
    expect(keys).toContain("privacy-page");
    expect(keys).toContain("terms-page");
  });

  it("about-us page should have 4 sections", () => {
    const about = PAGE_REGISTRY["about-us"];
    expect(about.label).toBe("About Us");
    expect(about.sections).toHaveLength(4);
    expect(about.sections[0].type).toBe("hero-banner");
    expect(about.sections[1].type).toBe("about-text");
    expect(about.sections[2].type).toBe("mission-vision");
    expect(about.sections[3].type).toBe("team-grid");
  });

  it("each section config should have type, label, maxItems", () => {
    for (const [, config] of Object.entries(PAGE_REGISTRY)) {
      for (const section of config.sections) {
        expect(section.type).toBeDefined();
        expect(section.label).toBeDefined();
        expect(typeof section.maxItems).toBe("number");
      }
    }
  });
});
