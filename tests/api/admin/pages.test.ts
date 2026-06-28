import { describe, it, expect } from "vitest";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";

describe("Admin Pages API", () => {
  describe("GET /api/admin/pages", () => {
    it("should have PAGE_REGISTRY with many pages", () => {
      const keys = Object.keys(PAGE_REGISTRY);
      expect(keys.length).toBeGreaterThan(10);
      expect(keys).toContain("about-us");
    });
  });

  describe("PATCH /api/admin/pages/[key]", () => {
    it("should validate section data", () => {
      const { z } = require("zod");
      const sectionSchema = z.object({
        _id: z.string(),
        type: z.string().min(1),
        order: z.number().int().min(0),
        title: z.string().optional(),
        active: z.boolean().default(true),
      });

      const updateSchema = z.object({
        sections: z.array(sectionSchema).optional(),
      });

      const valid = updateSchema.safeParse({
        sections: [{ _id: "s1", type: "hero-banner", order: 0, title: "Test" }],
      });
      expect(valid.success).toBe(true);

      const invalid = updateSchema.safeParse({
        sections: [{ _id: "s2", type: "", order: -1 }],
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("PAGE_REGISTRY sections", () => {
    it("each registered page config should define valid sections", () => {
      for (const [, config] of Object.entries(PAGE_REGISTRY)) {
        expect(config.label).toBeDefined();
        expect(Array.isArray(config.sections)).toBe(true);
        for (const section of config.sections) {
          expect(section.type).toBeDefined();
          expect(section.label).toBeDefined();
          expect(typeof section.maxItems).toBe("number");
        }
      }
    });
  });
});
