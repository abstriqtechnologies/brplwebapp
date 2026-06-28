export interface SectionConfig {
  type: string;
  label: string;
  maxItems: number;
}

export interface PageConfig {
  label: string;
  sections: SectionConfig[];
}

export const PAGE_REGISTRY: Record<string, PageConfig> = {
  home: {
    label: "Home",
    sections: [
      { type: "hero-banner", label: "Hero Banner", maxItems: 1 },
      { type: "who-we-are", label: "Who We Are", maxItems: 1 },
      { type: "trust-bar", label: "Trust Bar / Stats", maxItems: 1 },
      { type: "event-gallery", label: "Event Gallery", maxItems: 1 },
      { type: "ambassadors", label: "Ambassadors", maxItems: 1 },
      { type: "teams-slider", label: "Teams Slider", maxItems: 1 },
      { type: "broadcasting", label: "Broadcasting Partners", maxItems: 1 },
    ],
  },
  "about-us": {
    label: "About Us",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "about-text", label: "About BRPL", maxItems: 1 },
      { type: "mission-vision", label: "Mission & Vision", maxItems: 1 },
      { type: "team-grid", label: "Meet Our Team", maxItems: 1 },
    ],
  },
  teams: {
    label: "Teams",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "generic-content", label: "Teams Content", maxItems: 1 },
    ],
  },
  career: {
    label: "Career",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "generic-content", label: "Career Content", maxItems: 1 },
    ],
  },
  "contact-us": {
    label: "Contact Us",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "faqs-page": {
    label: "FAQs",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "events-page": {
    label: "Events",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  partners: {
    label: "Partners",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "blog-index": {
    label: "Blog",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "news-index": {
    label: "News",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "privacy-page": {
    label: "Privacy Policy",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Privacy Content", maxItems: 1 },
    ],
  },
  "terms-page": {
    label: "Terms & Conditions",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Terms Content", maxItems: 1 },
    ],
  },
  "rule-book": {
    label: "Rule Book",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Rule Book Content", maxItems: 1 },
    ],
  },
  "registration-page": {
    label: "Registration",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
};

export const SECTION_TYPES = [
  "hero-banner",
  "who-we-are",
  "about-text",
  "mission-vision",
  "team-grid",
  "trust-bar",
  "event-gallery",
  "ambassadors",
  "teams-slider",
  "broadcasting",
  "generic-content",
  "legal-content",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];
