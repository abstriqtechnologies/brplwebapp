export interface PageSection {
  _id: string;
  type: string;
  order: number;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageMobile?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  data?: Record<string, any>;
  active: boolean;
}

export interface PageMeta {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface ISitePage {
  key: string;
  title: string;
  subtitle?: string;
  sections: PageSection[];
  meta?: PageMeta;
  createdAt: Date;
  updatedAt: Date;
}
