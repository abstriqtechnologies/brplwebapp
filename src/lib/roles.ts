// Shared between client and server — DO NOT import mongoose here.

export const USER_ROLES = ["batsman", "bowler", "allrounder", "wicketkeeper"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
    batsman: "Batsman",
    bowler: "Bowler",
    allrounder: "All-Rounder",
    wicketkeeper: "Wicket-Keeper",
};
