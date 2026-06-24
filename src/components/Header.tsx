"use client";
import Link from "next/link";
import { Phone, Mail, LogIn, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useSiteContext } from "@/components/SiteContextProvider";
import { getImageUrl } from "@/utils/imageHelper";

const Header = () => {
    const { siteSettings, socialLinks, navLinks: contextNavLinks } = useSiteContext();
    const settings = siteSettings as any;
    const [isDesktop, setIsDesktop] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

    const toggleSubmenu = (label: string) => {
        setExpandedMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const socialImageSrc = (image: string) => {
        if (!image) return "";
        if (image.startsWith("http") || image.startsWith("blob:")) return image;
        if (image.startsWith("uploads/")) return getImageUrl(image);
        return image.startsWith("/") ? image : "/" + image;
    };

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 768);
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const blogDropdownLink = {
        label: "Blog",
        path: "/blog",
        isActive: true,
        isExternal: false,
        children: [
            { label: "Blog", path: "/blog" },
            { label: "News", path: "/news" },
        ],
    };

    const staticNavLinks = [
        { label: "Home", path: "/", isActive: true, isExternal: false },
        { label: "About Us", path: "/about-us", isActive: true, isExternal: false },
        { label: "Teams", path: "/teams", isActive: true, isExternal: false },
        { label: "Events", path: "/events", isActive: true, isExternal: false },
        blogDropdownLink,
        { label: "Career", path: "/career", isActive: true, isExternal: false },
        {
            label: "Partners",
            path: "/partners",
            isActive: true,
            isExternal: false,
            children: [
                { label: "BRPL Partner", path: "/partners" },
                { label: "BRPL Sponsors", path: "/types-of-partners" },
            ],
        },
        { label: "FAQs", path: "/faqs", isActive: true, isExternal: false },
        { label: "Registration", path: "/registration", isActive: true, isExternal: false },
        { label: "Contact Us", path: "/contact-us", isActive: true, isExternal: false },
    ];

    const navLinks = (contextNavLinks && contextNavLinks.length > 0 ? contextNavLinks : staticNavLinks).map((l: any) => ({
        ...l,
        isActive: true,
        isExternal: l.isExternal ?? false,
    }));

    return (
        <header className="sticky top-0 z-[100] font-sans shadow-md bg-[#111a45] text-white">
            {/* Desktop Logo - Absolute Left */}
            <div className="hidden lg:flex absolute top-0 bottom-0 left-0 z-30 items-center pl-12">
                <Link href="/" className="flex items-center">
                    <img
                        src={settings.logoUrl || "/logo.webp"}
                        alt="BRPL Logo"
                        className="h-[80px] w-auto object-contain drop-shadow-lg"
                    />
                </Link>
            </div>

            {/* Top Bar - White with Slanted Left Edge */}
            <div className="w-full flex justify-end relative z-20">
                <div
                    className="bg-white text-[#111a45] h-[40px] md:h-[50px] w-full md:w-[85%] lg:w-[75%] flex items-center justify-center md:justify-end px-4 lg:px-12 gap-6"
                    style={{ clipPath: isDesktop ? "polygon(0px 0px, 100% 0px, 100% 100%, 66px 100%)" : "none" }}
                >
                    {/* Contact Info (Hide on small screens) */}
                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 fill-current" />
                            <a href={`tel:${settings.contactPhone.replace(/\D/g, "").replace(/^/, "+")}`} className="text-[13px] font-bold tracking-wide hover:text-blue-600 transition-colors">{settings.contactPhone}</a>
                        </div>
                        <div className="h-4 w-px bg-slate-300" />
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${settings.contactEmail}`} className="text-[13px] font-bold tracking-wide hover:text-blue-600">{settings.contactEmail}</a>
                        </div>
                    </div>

                    {/* Login & Socials */}
                    <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto md:ml-auto">
                        <Link
                            href="/auth?mode=login"
                            className="flex items-center gap-2 font-bold bg-yellow-400 text-slate-900 px-4 py-1.5 rounded-full hover:bg-yellow-500 transition-all shadow-md group text-[13px]"
                        >
                            <LogIn className="w-4 h-4 stroke-[2.5]" />
                            <span className="uppercase tracking-wide">LOGIN</span>
                        </Link>

                        <div className="h-4 w-px bg-slate-300" />

                        <div className="flex items-center gap-3 md:gap-4">
                            {socialLinks.filter((l: any) => l.url).map((link: any) => (
                                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" aria-label={link.name}>
                                    <img src={socialImageSrc(link.image)} alt={link.name} className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar - Logo & Navigation */}
            <div className="h-[70px] md:h-[80px] w-full flex items-center justify-between px-4 lg:pl-12 lg:pr-12 relative z-10 text-white">
                {/* Mobile Logo (Visible only on mobile/tablet) */}
                <Link href="/" className="flex items-center z-30 lg:hidden">
                    <img
                        src={settings.logoUrl || "/logo.webp"}
                        alt="BRPL Logo"
                        className="h-[60px] w-auto object-contain drop-shadow-lg"
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-8 text-[15px] font-semibold tracking-wide ml-auto">
                    {navLinks.filter(link => link.isActive).map((link) => (
                        (link.children || link.subLinks) ? (
                            <div key={link._id || link.label} className="relative group">
                                <button className="hover:text-yellow-400 transition-colors py-1 flex items-center gap-1">
                                    {link.label}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down w-4 h-4"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                <div className="absolute top-full left-0 w-48 bg-[#111a45] shadow-xl border-t-2 border-yellow-400 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top pt-2">
                                    {(link.children || link.subLinks).map((sub: any) => (
                                        <Link key={sub.label} href={sub.path} className="block px-4 py-3 hover:bg-white/10 text-sm">{sub.label}</Link>
                                    ))}
                                </div>
                            </div>
                        ) : link.isExternal ? (
                            <a
                                key={link._id || link.label}
                                href={link.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-yellow-400 transition-colors relative group py-1"
                            >
                                {link.label}
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            </a>
                        ) : (
                            <Link
                                key={link._id || link.label}
                                href={link.path}
                                className="hover:text-yellow-400 transition-colors relative group py-1"
                            >
                                {link.label}
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                            </Link>
                        )
                    ))}
                </nav>

                {/* Mobile Menu Button - Styled as White Card */}
                <button
                    className="lg:hidden bg-white text-[#111a45] hover:bg-gray-100 transition-colors p-2 rounded-lg border-2 border-white/20 shadow-md"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Menu className="w-7 h-7 stroke-[2]" />
                </button>
            </div>

            {/* Mobile Menu Dropdown - Left Aligned List with Separators */}
            {isMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 w-full bg-[#111a45] shadow-xl border-t border-white/10 z-50 px-6 py-4 overflow-y-auto max-h-[calc(100vh-110px)]">
                    <nav className="flex flex-col text-left">
                        {navLinks.filter(link => link.isActive).map((link) => (
                            (link.children || link.subLinks) ? (
                                <div key={link._id || link.label} className="border-b border-white/20 last:border-0">
                                    <button
                                        className="w-full flex justify-between items-center py-4 text-white text-[16px] font-medium focus:outline-none focus:ring-0"
                                        onClick={() => toggleSubmenu(link.label)}
                                    >
                                        <span>{link.label}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${expandedMenus[link.label] ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ${expandedMenus[link.label] ? "max-h-screen opacity-100" : "max-h-0 opacity-0"}`}>
                                        <div className="pl-4 pb-4 border-l border-white/10 ml-1">
                                            {(link.children || link.subLinks).map((sub: any) => (
                                                <Link
                                                    key={sub.label}
                                                    href={sub.path}
                                                    className="block py-2 text-white/80 hover:text-yellow-400 text-sm"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    {sub.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : link.isExternal ? (
                                <a
                                    key={link._id || link.label}
                                    href={link.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block py-4 text-white text-[16px] font-medium hover:text-yellow-400 border-b border-white/20 last:border-0"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link._id || link.label}
                                    href={link.path}
                                    className="block py-4 text-white text-[16px] font-medium hover:text-yellow-400 border-b border-white/20 last:border-0"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            )
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
