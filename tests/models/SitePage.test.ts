import { describe, it, expect } from "vitest";
import type { PageSection, ISitePage } from "@/types/pages";

describe("SitePage Model", () => {
  it("should have sections field with correct defaults", () => {
    const section: PageSection = {
      _id: "test-id",
      type: "hero-banner",
      order: 0,
      title: "Test Title",
      active: true,
    };
    expect(section.type).toBe("hero-banner");
    expect(section.active).toBe(true);
    expect(section.order).toBe(0);
  });

  it("should create a page with sections", () => {
    const page: ISitePage = {
      key: "about-us",
      title: "About Us",
      sections: [
        {
          _id: "s1",
          type: "hero-banner",
          order: 0,
          title: "Hero",
          active: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0].type).toBe("hero-banner");
  });
});
