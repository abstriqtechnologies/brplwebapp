"use client";

import { useEffect, useRef } from "react";
import { useSiteContext } from "@/components/SiteContextProvider";

const DATA_ATTR = "data-custom-head-script";

/**
 * Injects admin-configured scripts (e.g. Google Analytics, Search Console) into document.head.
 * Scripts are parsed from the stored HTML string and appended so they execute.
 */
export function CustomHeadScripts() {
    const { siteSettings } = useSiteContext();
    const s = siteSettings as any;
    const injectedRef = useRef<string>("");

    useEffect(() => {
        const raw = s.customHeadScripts?.trim() || "";

        // Remove any previously injected scripts/elements
        const existing = document.head.querySelectorAll(`[${DATA_ATTR}="true"]`);
        existing.forEach((el) => el.remove());
        injectedRef.current = "";

        if (!raw) return;

        // Avoid re-injecting the same content (e.g. after refetch)
        if (injectedRef.current === raw) return;
        injectedRef.current = raw;

        const container = document.createElement("div");
        container.innerHTML = raw;
        const scriptNodes = container.childNodes;
        const added: HTMLElement[] = [];

        scriptNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const oldEl = node as HTMLElement;
                if (oldEl.tagName.toLowerCase() === 'noscript') return;
                
                const newEl = document.createElement(oldEl.tagName);
                newEl.setAttribute(DATA_ATTR, "true");

                // Copy all attributes
                Array.from(oldEl.attributes).forEach((attr) => {
                    newEl.setAttribute(attr.name, attr.value);
                });

                newEl.innerHTML = oldEl.innerHTML;
                document.head.appendChild(newEl);
                added.push(newEl);
            }
        });

        return () => {
            added.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            injectedRef.current = "";
        };
    }, [s.customHeadScripts]);

    return null;
}

export default CustomHeadScripts;
