"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Users,
    Settings,
    UserCheck,
    UserX,
    LayoutDashboard,
    CreditCard,
    X,
    Briefcase,
    Link as LinkIcon,
    QrCode,
    HelpCircle,
    Shield,
    BookOpen,
    ChevronRight,
    Info,
    Share2,
    Mail,
    ImageIcon,
    FileText,
    Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RoleName = "superadmin" | "subadmin" | "seo_content";

type NavChild = { label: string; path: string };
type NavItem = {
    icon: any;
    label: string;
    path: string;
    children?: NavChild[];
};

const ALL_ITEMS: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: UserCheck, label: "Paid Users", path: "/admin/paid-users" },
    { icon: UserX, label: "Unpaid Users", path: "/admin/unpaid-users" },
    { icon: CreditCard, label: "Coupons", path: "/admin/coupons" },
    { icon: LinkIcon, label: "Coupon Usage", path: "/admin/coupon-usage" },
    { icon: Users, label: "Registered Users", path: "/admin/registered-users" },
    { icon: CreditCard, label: "Events", path: "/admin/events" },
    { icon: CreditCard, label: "Payments", path: "/admin/payments" },
    { icon: Briefcase, label: "Manage Jobs", path: "/admin/jobs" },
    { icon: Users, label: "Ambassadors", path: "/admin/ambassadors" },
    { icon: Users, label: "Teams", path: "/admin/teams" },
    { icon: Users, label: "Partners", path: "/admin/partners" },
    {
        icon: BookOpen,
        label: "Home Page",
        path: "#",
        children: [
            { label: "Banners", path: "/admin/cms/banners" },
            { label: "Who We Are", path: "/admin/cms/who-we-are" },
        ],
    },
    {
        icon: Info,
        label: "About Us",
        path: "#",
        children: [
            { label: "Banner", path: "/admin/about-us/banner" },
            { label: "About BRPL", path: "/admin/about-us/about-brpl" },
            { label: "Mission & Vision", path: "/admin/about-us/mission-vision" },
            { label: "Meet Our Team", path: "/admin/about-us/meet-our-team" },
        ],
    },
    { icon: QrCode, label: "QR Campaigns", path: "/admin/campaigns" },
    { icon: HelpCircle, label: "Manage FAQs", path: "/admin/faqs" },
    { icon: Share2, label: "Social & Contact", path: "/admin/social-contact" },
    { icon: Mail, label: "Contact Us Leads", path: "/admin/contact-us-leads" },
    { icon: ImageIcon, label: "Page Banner", path: "/admin/page-banner" },
    { icon: ImageIcon, label: "Media Library", path: "/admin/media" },
    { icon: Shield, label: "Privacy Policy", path: "/admin/privacy-policy" },
    { icon: FileText, label: "Terms & Conditions", path: "/admin/terms-conditions" },
    { icon: FileText, label: "Rule Book", path: "/admin/rule-book" },
    { icon: FileText, label: "Meta Content", path: "/admin/meta-content" },
    { icon: Newspaper, label: "Blog", path: "/admin/blog" },
    { icon: Newspaper, label: "News Articles", path: "/admin/news" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
    { icon: FileText, label: "Site Pages", path: "/admin/site-pages" },
    {
        icon: Newspaper,
        label: "Registration Page",
        path: "#",
        children: [
            { label: "Latest Videos", path: "/admin/registration-page" },
            { label: "Numbers Speak", path: "/admin/numbers-speak" },
            { label: "Journey Roadmap", path: "/admin/roadmap" },
            { label: "Zone Deadline", path: "/admin/zone-deadline" },
            { label: "Player Stories", path: "/admin/player-stories" },
            { label: "Registration FAQs", path: "/admin/registration-faqs" },
            { label: "Hero Banner", path: "/admin/registration-hero" },
            { label: "Form Banner & Quote", path: "/admin/registration-banner" },
        ],
    },
];

function getFilteredItems(role: RoleName | undefined): NavItem[] {
    if (role === "superadmin" || role === "subadmin") return ALL_ITEMS;

    // seo_content gets CMS-only items
    const cmsLabels = new Set([
        "Home Page",
        "About Us",
        "Manage FAQs",
        "Manage Jobs",
        "QR Campaigns",
        "Ambassadors",
        "Teams",
        "Partners",
        "Social & Contact",
        "Page Banner",
        "Privacy Policy",
        "Terms & Conditions",
        "Rule Book",
        "Meta Content",
        "Blog",
        "News Articles",
        "Registration Page",
        "Site Pages",
    ]);
    return ALL_ITEMS.filter((it) => cmsLabels.has(it.label));
}

export function AdminSidebar({
    isOpen,
    onClose,
    role,
}: {
    isOpen: boolean;
    onClose: () => void;
    role: RoleName | undefined;
}) {
    const pathname = usePathname() || "";
    const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
    const items = getFilteredItems(role);

    const toggleMenu = (label: string) => {
        setOpenMenus((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={`${isOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20"
                    } border-r border-border transition-all duration-300 flex flex-col fixed h-full z-30 bg-white dark:bg-slate-900`}
            >
                <div className="p-6 flex items-center justify-between border-b border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <img src="/logo.webp" alt="BRPL Logo" className="w-12 h-12 object-contain shrink-0" />
                        {isOpen && (
                            <span className="text-lg font-bold truncate">BRPL Admin</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 py-6 px-3 overflow-y-auto">
                    <nav className="space-y-1">
                        {items.map((item) => {
                            const active =
                                item.path !== "#" && pathname === item.path;
                            const childActive = item.children?.some((c) => pathname === c.path);
                            const expanded = openMenus.has(item.label) || (childActive ?? false);

                            if (item.children) {
                                return (
                                    <div key={item.label} className="space-y-1">
                                        <button
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                            onClick={() => toggleMenu(item.label)}
                                            aria-expanded={expanded}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5 shrink-0" />
                                                {isOpen && <span className="truncate">{item.label}</span>}
                                            </div>
                                            {isOpen && (
                                                <ChevronRight
                                                    className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                                                />
                                            )}
                                        </button>
                                        {isOpen && expanded && (
                                            <div className="pl-10 space-y-1">
                                                {item.children.map((child) => {
                                                    const childIsActive = pathname === child.path;
                                                    return (
                                                        <Link
                                                            key={child.path}
                                                            href={child.path}
                                                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${childIsActive
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                                                }`}
                                                            onClick={() => window.innerWidth < 768 && onClose()}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    onClick={() => window.innerWidth < 768 && onClose()}
                                >
                                    <item.icon className="w-5 h-5 shrink-0" />
                                    {isOpen && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
