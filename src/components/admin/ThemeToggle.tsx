"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEME_OPTIONS, iconForTheme } from "./themeToggle.helpers";

const ICONS = {
    Sun,
    Moon,
    Monitor,
} as const;

/**
 * Light/Dark/System toggle rendered next to the Logout button in the
 * admin sidebar. Trigger uses shadcn Button size="icon" (h-10 w-10, 40x40)
 * to match the sibling Logout button's default size (h-10) so both stay
 * the same height in the flex row.
 */
export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const Icon = ICONS[iconForTheme(theme)];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Toggle theme"
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(value as Theme)}
                >
                    {THEME_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}