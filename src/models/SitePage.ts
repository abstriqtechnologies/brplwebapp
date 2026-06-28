import mongoose, { Schema, Model, Document } from "mongoose";
import type { PageSection } from "@/types/pages";

export const SITE_PAGE_KEYS = [
  "home",
  "about-us",
  "teams",
  "career",
  "contact-us",
  "events-page",
  "partners",
  "types-of-partners",
  "blog-index",
  "news-index",
  "privacy-page",
  "terms-page",
  "rule-book",
  "faqs-page",
  "registration-page",
] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface ISitePageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  key: SitePageKey;
  title: string;
  subtitle?: string;
  sections: PageSection[];
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PageSectionSchema = new Schema<PageSection>(
  {
    _id: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    image: { type: String },
    imageMobile: { type: String },
    videoUrl: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    data: { type: Schema.Types.Mixed },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const SitePageSchema = new Schema<ISitePageDocument>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    sections: { type: [PageSectionSchema], default: [] },
    meta: {
      type: new Schema({
        title: { type: String },
        description: { type: String },
        keywords: { type: String },
      }),
      default: {},
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SitePage: Model<ISitePageDocument> =
  (mongoose.models.SitePage as Model<ISitePageDocument>) ||
  mongoose.model<ISitePageDocument>("SitePage", SitePageSchema);

export default SitePage;
