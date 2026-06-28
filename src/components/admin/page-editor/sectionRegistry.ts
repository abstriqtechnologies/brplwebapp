import dynamic from "next/dynamic";
import type { ComponentType } from "react";

interface SectionRegistryEntry {
  component?: ComponentType<any>;
  editor: ComponentType<any>;
  defaultData: Record<string, any>;
}

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  "hero-banner": {
    editor: dynamic(() => import("./editors/HeroBannerEditor")),
    defaultData: {
      title: "Page Title",
      subtitle: "",
      image: "/tenis.webp",
      imageMobile: "",
      ctaText: "",
      ctaLink: "",
    },
  },
  "who-we-are": {
    editor: dynamic(() => import("./editors/WhoWeAreEditor")),
    defaultData: {
      title: "Beyond Reach Premier League",
      subtitle: "India's Grassroots T10 Cricket League",
      tagline: '"BRPL – Bharat ki League, Bharatiyon ka Sapna"',
      description: "",
      image: "/home2.webp",
      videoUrl: "",
    },
  },
  "about-text": {
    editor: dynamic(() => import("./editors/AboutTextEditor")),
    defaultData: {
      title: "About BRPL",
      description: "",
      image: "/trophy image.webp",
    },
  },
  "mission-vision": {
    editor: dynamic(() => import("./editors/MissionVisionEditor")),
    defaultData: {
      missionTitle: "Our Mission",
      missionDescription: "",
      missionImage: "/about-2.webp",
      visionTitle: "Our Vision",
      visionDescription: "",
      visionImage: "/vision.webp",
    },
  },
  "trust-bar": {
    editor: dynamic(() => import("./editors/TrustBarEditor")),
    defaultData: {
      items: [
        {
          id: "1",
          icon: "Trophy",
          hook: "₹3 Crore",
          descriptor: "TOTAL PRIZE POOL",
        },
        {
          id: "2",
          icon: "Circle",
          hook: "Tennis Ball",
          descriptor: "NO BIG KIT REQUIREMENTS",
        },
      ],
    },
  },
  "generic-content": {
    editor: dynamic(() => import("./editors/GenericContentEditor")),
    defaultData: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
    },
  },
  "legal-content": {
    editor: dynamic(() => import("./editors/LegalContentEditor")),
    defaultData: {
      title: "",
      content: "",
    },
  },
  "event-gallery": {
    editor: dynamic(() => import("./editors/EventGalleryEditor")),
    defaultData: {
      title: "BRPL Event Gallery",
      subtitle: "",
      description: "",
    },
  },
  ambassadors: {
    editor: dynamic(() => import("./editors/AmbassadorsEditor")),
    defaultData: {
      title: "BRPL Ambassadors",
      subtitle: "",
      description: "",
    },
  },
  "teams-slider": {
    editor: dynamic(() => import("./editors/TeamsSliderEditor")),
    defaultData: {
      title: "BRPL Teams",
      subtitle: "",
      description: "",
    },
  },
  broadcasting: {
    editor: dynamic(() => import("./editors/BroadcastingEditor")),
    defaultData: {
      title: "Proposed Broadcasting Partners",
      subtitle: "",
      items: [],
    },
  },
};
