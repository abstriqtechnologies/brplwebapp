"use client";

import { useEffect, useState } from "react";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
    interface Window {
        Razorpay?: any;
    }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<boolean>((resolve) => {
        const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
        if (existing) {
            // If the tag is in the DOM, its load/error event has already
            // fired by the time we get here — `addEventListener` won't
            // catch a past event, so we'd hang forever. Resolve based on
            // current state instead: window.Razorpay set → success;
            // otherwise remove the stale tag and try again.
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            existing.remove();
        }
        const script = document.createElement("script");
        script.src = RAZORPAY_SCRIPT;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
    return scriptPromise;
}

export function useRazorpayScript() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let mounted = true;
        loadRazorpayScript().then((ok) => {
            if (mounted) setReady(ok);
        });
        return () => {
            mounted = false;
        };
    }, []);
    return ready;
}
