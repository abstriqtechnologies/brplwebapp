"use client";
import React from "react";
import Link from "next/link";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getImageUrl } from "@/utils/imageHelper";

const Footer: React.FC = () => {
  const { settings } = useSiteSettings();
  const socialImageSrc = (image: string) => {
    if (!image) return "";
    if (image.startsWith("http") || image.startsWith("blob:")) return image;
    if (image.startsWith("uploads/")) return getImageUrl(image);
    return image.startsWith("/") ? image : "/" + image;
  };

  return (
    <footer className="relative w-full bg-[#1e2042] text-white mt-0 overflow-hidden font-sans">

      {/* Player Images - Absolute Positioned */}
      <div className="absolute left-0 bottom-28 z-0 hidden xl:block pointer-events-none">
        <img src="/foot1.webp" alt="Player Left" className="h-[200px] object-contain opacity-80" loading="lazy" />
      </div>
      <div className="absolute right-0 bottom-28 z-0 hidden xl:block pointer-events-none">
        <img src="/foot2.webp" alt="Player Right" className="h-[200px] object-contain opacity-80" loading="lazy" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 lg:px-10 py-12 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 text-sm">

          {/* Teams Column */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[18px] font-bold text-[#FFC928] mb-2">Teams</h3>
              <div className="h-[2px] w-[60px] bg-white/20"></div>
            </div>
            <ul className="space-y-3">
              {[
                "North East Panthers",
                "Central Strikers",
                "Western Heroes",
                "Northern Dabanggs",
                "Southern Lions",
                "Eastern Rhions",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 group cursor-pointer hover:translate-x-1 transition-transform">
                  <span className="text-[#FFC928] text-[8px]">●</span>
                  <Link href="/teams" className="text-gray-200 hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* BRPL - T10 Column */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[18px] font-bold text-[#FFC928] mb-2">BRPL - T10</h3>
              <div className="h-[2px] w-[80px] bg-white/20"></div>
            </div>
            <ul className="space-y-3">
              {[
                { name: "About Us", path: "/about-us" },
                { name: "Videos", path: "#" },
                { name: "Blog", path: "/blog" },
                { name: "News", path: "/news" },
                { name: "Events", path: "/events" }
              ].map((item) => (
                <li key={item.name} className="flex items-center gap-2 group cursor-pointer hover:translate-x-1 transition-transform">
                  <span className="text-[#FFC928] text-[8px]">●</span>
                  <Link href={item.path} className="text-gray-200 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            {/* Store Buttons */}
            <div className="flex gap-3 mt-4">
              <img src="/ios-app.webp" alt="ios-app" className="w-25 h-12" loading="lazy" />
              <img src="/google-store.webp" alt="android-app" className="w-22 h-12" loading="lazy" />
            </div>
          </div>

          {/* BRPL Guidelines Column */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[18px] font-bold text-[#FFC928] mb-2">BRPL Guidelines</h3>
              <div className="h-[2px] w-[120px] bg-white/20"></div>
            </div>
            <ul className="space-y-3">
              {[
                { name: "Privacy & Policy", path: "/privacy-policy" },
                { name: "Terms & Condition", path: "/terms-and-conditions" },
                { name: "Rule Book", path: "/rule-book" },
              ].map((item) => (
                <li key={item.name} className="flex items-center gap-2 group cursor-pointer hover:translate-x-1 transition-transform">
                  <span className="text-[#FFC928] text-[8px]">●</span>
                  <Link href={item.path} className="text-gray-200 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[18px] font-bold text-[#FFC928] mb-2">Contact</h3>
              <div className="h-[2px] w-[60px] bg-white/20"></div>
            </div>
            <ul className="space-y-3">
              {[
                { name: "Contact Us", path: "/contact-us" },
                { name: "News", path: "/news" }
              ].map((item) => (
                <li key={item.name} className="flex items-center gap-2 group cursor-pointer hover:translate-x-1 transition-transform">
                  <span className="text-[#FFC928] text-[8px]">●</span>
                  <Link href={item.path} className="text-gray-200 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-2">
              <h4 className="text-[#FFC928] text-sm font-semibold mb-3">Follow Us</h4>
              <div className="flex items-center gap-3">
                {settings.socialLinks.filter((l) => l.url).map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
                    aria-label={link.name}
                  >
                    <img src={socialImageSrc(link.image)} alt={link.name} className="w-4 h-4 object-contain" loading="lazy" decoding="async" />
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom copyright bar */}
      <div className="w-full bg-black text-center py-8 text-[13px] text-white">
        <span>
          © Copyright {new Date().getFullYear()} | All Rights Reserved by Beyond Reach Premier League
        </span>
      </div>
    </footer>
  );
};

export default Footer;
