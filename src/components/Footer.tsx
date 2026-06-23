"use client";
import React from "react";
import Link from "next/link";
import { useSiteContext } from "@/components/SiteContextProvider";
import { getImageUrl } from "@/utils/imageHelper";

const Footer: React.FC = () => {
  const { siteSettings, socialLinks, footerLinks } = useSiteContext();
  const s = siteSettings as any;
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

          {footerLinks.map((group: any) => (
            <div key={group.heading} className="flex flex-col gap-6">
              <div>
                <h3 className="text-[18px] font-bold text-[#FFC928] mb-2">{group.heading}</h3>
                <div className="h-[2px] w-[60px] bg-white/20"></div>
              </div>
              <ul className="space-y-3">
                {(group.links || []).map((l: any) => (
                  <li key={l.label} className="flex items-center gap-2 group cursor-pointer hover:translate-x-1 transition-transform">
                    <span className="text-[#FFC928] text-[8px]">●</span>
                    <Link href={l.path} className="text-gray-200 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Contact info + socials strip */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="flex flex-col gap-2 text-gray-200">
            {s.contactPhone && (
              <div>
                <span className="text-[#FFC928] font-semibold mr-2">Phone:</span>
                <a href={`tel:${s.contactPhone.replace(/\D/g, "").replace(/^/, "+")}`} className="hover:text-white transition-colors">
                  {s.contactPhone}
                </a>
              </div>
            )}
            {s.contactEmail && (
              <div>
                <span className="text-[#FFC928] font-semibold mr-2">Email:</span>
                <a href={`mailto:${s.contactEmail}`} className="hover:text-white transition-colors">
                  {s.contactEmail}
                </a>
              </div>
            )}
            {s.contactAddress && (
              <div>
                <span className="text-[#FFC928] font-semibold mr-2">Address:</span>
                <span>{s.contactAddress}</span>
              </div>
            )}
            {s.mapEmbedUrl && (
              <div>
                <a href={s.mapEmbedUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">
                  View on Map
                </a>
              </div>
            )}
          </div>
          <div className="flex md:justify-end items-start gap-3">
            {socialLinks.filter((l: any) => l.url).map((link: any) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label={link.name}
              >
                <img src={socialImageSrc(link.image)} alt={link.name} className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
              </a>
            ))}
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
