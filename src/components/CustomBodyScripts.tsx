"use client";

import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DATA_ATTR = "data-custom-body-script";

/**
 * Injects admin-configured scripts into document.body.
 * Note: dynamically-created <noscript> can render raw text in SPA apps, so we skip it.
 */
export function CustomBodyScripts() {
    const { settings } = useSiteSettings();
    const injectedRef = useRef<string>("");

    useEffect(() => {
        const raw = settings.customBodyScripts?.trim() || "";

        const existing = document.body.querySelectorAll(`[${DATA_ATTR}="true"]`);
        existing.forEach((el) => el.remove());
        injectedRef.current = "";

        if (!raw) return;

        if (injectedRef.current === raw) return;
        injectedRef.current = raw;

        const container = document.createElement("div");
        container.innerHTML = raw;
        const added: HTMLElement[] = [];

        Array.from(container.childNodes).forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const oldEl = node as HTMLElement;
            const tag = oldEl.tagName.toLowerCase();
            if (tag === "script") {
                const newEl = document.createElement(oldEl.tagName);
                newEl.setAttribute(DATA_ATTR, "true");
                const script = newEl as HTMLScriptElement;
                const oldScript = oldEl as HTMLScriptElement;
                if (oldScript.src) {
                    script.src = oldScript.src;
                    if (oldScript.async) script.async = true;
                    if (oldScript.defer) script.defer = true;
                } else {
                    script.textContent = oldScript.textContent || "";
                }
                document.body.appendChild(newEl);
                added.push(newEl);
            }
            // Avoid rendering visible garbage text/tokens from dynamic <noscript> and other markup.
        });

        return () => {
            added.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            injectedRef.current = "";
        };
    }, [settings.customBodyScripts]);

    return null;
}

export default CustomBodyScripts;
