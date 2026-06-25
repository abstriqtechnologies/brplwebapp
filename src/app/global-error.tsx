"use client";

/**
 * Root error boundary — catches anything not caught by route-level
 * `error.tsx` files. Must be a client component (Next.js requirement) and
 * must include its own `<html>` and `<body>` because it replaces the root
 * layout when triggered.
 *
 * The `digest` Next.js provides is the request ID; we surface it so users
 * can quote it in support tickets.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // The actual server-side log happens in withRequest's catch block
        // for route handlers. For client-side throws we log here.
        // eslint-disable-next-line no-console
        console.error("[global-error]", error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8fafc",
                    color: "#0f172a",
                }}
            >
                <div style={{ maxWidth: 480, padding: "2rem", textAlign: "center" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            fontSize: 28,
                            marginBottom: 16,
                        }}
                        aria-hidden
                    >
                        !
                    </div>
                    <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
                    <p style={{ color: "#475569", margin: "0 0 24px" }}>
                        An unexpected error occurred. Please try again.
                    </p>
                    {error.digest && (
                        <p
                            style={{
                                fontSize: 12,
                                color: "#94a3b8",
                                marginBottom: 24,
                                fontFamily: "monospace",
                            }}
                        >
                            Reference: {error.digest}
                        </p>
                    )}
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button
                            onClick={reset}
                            style={{
                                background: "#f59e0b",
                                color: "#000",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: 999,
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                        <Link
                            href="/"
                            style={{
                                background: "transparent",
                                color: "#0f172a",
                                border: "1px solid #cbd5e1",
                                padding: "10px 20px",
                                borderRadius: 999,
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            Go home
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}