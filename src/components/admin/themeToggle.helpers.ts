import type { Theme } from "@/components/theme-provider";

export const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
];

/**
 * Maps a theme value to the icon name shown in the toggle trigger button.
 * Kept as a string return (not a component) so the helper stays pure and
 * testable under the node-only vitest environment.
 */
export function iconForTheme(theme: Theme): "Sun" | "Moon" | "Monitor" {
    switch (theme) {
        case "light":
            return "Sun";
        case "dark":
            return "Moon";
        case "system":
            return "Monitor";
    }
}
