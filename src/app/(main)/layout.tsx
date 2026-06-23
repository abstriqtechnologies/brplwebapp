import ClientProviders from "@/components/ClientProviders";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <ClientProviders>{children}</ClientProviders>;
}
