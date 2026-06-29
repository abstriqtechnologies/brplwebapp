import mongoose, { Schema, Model, Document } from "mongoose";

export interface INavbarLink {
    label: string;
    path: string;
    children?: INavbarLink[];
    isExternal?: boolean;
}

export interface IFooterLink {
    label: string;
    path: string;
}

export interface IFooterLinkGroup {
    heading: string;
    links: IFooterLink[];
}

export interface ISiteSettings extends Document {
    _id: mongoose.Types.ObjectId;

    // existing
    siteName: string;
    tagline?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPhoneSecondary?: string;
    address?: string;
    heroImage?: string;
    heroVideoUrl?: string;
    socials?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        youtube?: string;
        linkedin?: string;
        whatsapp?: string;
    };
    primaryColor?: string;
    registrationDeadline?: Date;
    registrationFee?: number;
    trialStartDate?: Date;
    trialEndDate?: Date;

    // new — branding
    logoUrl?: string;
    footerLogoUrl?: string;
    faviconUrl?: string;
    appleTouchIconUrl?: string;
    ogImage?: string;
    twitterHandle?: string;

    // new — home SEO
    homeSeoTitle?: string;
    homeSeoDescription?: string;
    homeSeoKeywords?: string;

    // new — header & nav
    headerCtaText?: string;
    headerCtaLink?: string;
    navbarLinks?: INavbarLink[];

    // new — footer
    footerAboutText?: string;
    footerLinks?: IFooterLinkGroup[];
    mapEmbedUrl?: string;

    // new — CTAs
    whatsappNumber?: string;
    floatingRegisterText?: string;
    floatingRegisterLink?: string;

    // new — scripts
    customHeadScripts?: string;
    customBodyScripts?: string;

    createdAt: Date;
    updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        siteName: { type: String, default: "Brpl" },
        tagline: { type: String },
        contactEmail: { type: String, lowercase: true, trim: true },
        contactPhone: { type: String, trim: true },
        contactPhoneSecondary: { type: String, trim: true },
        address: { type: String },
        heroImage: { type: String },
        heroVideoUrl: { type: String },
        socials: {
            instagram: { type: String },
            facebook: { type: String },
            twitter: { type: String },
            youtube: { type: String },
            linkedin: { type: String },
            whatsapp: { type: String },
        },
        primaryColor: { type: String },
        registrationDeadline: { type: Date },
        registrationFee: { type: Number, default: 1499 },
        trialStartDate: { type: Date },
        trialEndDate: { type: Date },

        logoUrl: { type: String, default: "/logo.webp" },
        footerLogoUrl: { type: String },
        faviconUrl: { type: String, default: "/favicon.ico" },
        appleTouchIconUrl: { type: String },
        ogImage: { type: String },
        twitterHandle: { type: String },

        homeSeoTitle: { type: String, default: "Brpl" },
        homeSeoDescription: { type: String },
        homeSeoKeywords: { type: String },

        headerCtaText: { type: String, default: "Register Now" },
        headerCtaLink: { type: String, default: "/login" },
        navbarLinks: { type: Schema.Types.Mixed },

        footerAboutText: { type: String },
        footerLinks: { type: Schema.Types.Mixed },
        mapEmbedUrl: { type: String },

        whatsappNumber: { type: String, default: "918130955866" },
        floatingRegisterText: { type: String, default: "Register Now" },
        floatingRegisterLink: { type: String, default: "/login" },

        customHeadScripts: { type: String, default: "" },
        customBodyScripts: { type: String, default: "" },
    },
    { timestamps: true }
);

const SiteSettings: Model<ISiteSettings> =
    (mongoose.models.SiteSettings as Model<ISiteSettings>) ||
    mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettings;
