import { describe, it, expect } from "vitest";

describe("themeToggle helpers", () => {
  it("THEME_OPTIONS lists light, dark, system in that order", async () => {
    const { THEME_OPTIONS } = await import(
      "@/components/admin/themeToggle.helpers"
    );
    expect(THEME_OPTIONS.map((o) => o.value)).toEqual([
      "light",
      "dark",
      "system",
    ]);
    expect(THEME_OPTIONS.map((o) => o.label)).toEqual([
      "Light",
      "Dark",
      "System",
    ]);
  });

  it("iconForTheme returns Sun/Moon/Monitor for light/dark/system", async () => {
    const { iconForTheme } = await import(
      "@/components/admin/themeToggle.helpers"
    );
    expect(iconForTheme("light")).toBe("Sun");
    expect(iconForTheme("dark")).toBe("Moon");
    expect(iconForTheme("system")).toBe("Monitor");
  });
});
