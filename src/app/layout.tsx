import type { Metadata } from "next";
import { Inter, Space_Grotesk, Rye } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ClientProviders from "@/components/ClientProviders";
import RootProviders from "@/components/RootProviders";
import { getSiteContext } from "@/lib/siteContext";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-space-grotesk",
    display: "swap",
});

const rye = Rye({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-rye",
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const ctx = await getSiteContext();
    const s = ctx.siteSettings;
    return {
        title: { default: s.homeSeoTitle || s.siteName, template: `%s | ${s.siteName}` },
        description: s.homeSeoDescription,
        keywords: s.homeSeoKeywords,
        icons: {
            icon: s.faviconUrl || "/favicon.ico",
            apple: s.appleTouchIconUrl || undefined,
        },
        openGraph: {
            title: s.homeSeoTitle || s.siteName,
            description: s.homeSeoDescription,
            images: s.ogImage ? [s.ogImage] : undefined,
        },
    };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const siteContext = await getSiteContext();
    return (
        <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${rye.variable}`}>
            <body className={inter.className}>
                <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                    <RootProviders siteContext={siteContext}>
                        <ClientProviders>{children}</ClientProviders>
                    </RootProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
