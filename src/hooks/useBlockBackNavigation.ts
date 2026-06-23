"use client";

import { useEffect } from "react";

/**
 * Traps the user on the current page by blocking browser back/forward navigation.
 * Use for sensitive flows (e.g. payment) where leaving mid-flow would break state.
 *
 * Implementation: pushes a new history state on mount, then re-pushes on every
 * popstate event (which fires on back/forward). The user can still close the tab
 * or use in-page links.
 */
export function useBlockBackNavigation() {
    useEffect(() => {
        // Push a duplicate state so the back button has somewhere to "go" — which we then intercept
        window.history.pushState(null, "", window.location.href);

        const handlePopState = () => {
            // User pressed back/forward — re-push to keep them on this page
            window.history.pushState(null, "", window.location.href);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);
}
