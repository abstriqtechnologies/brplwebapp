import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Single document collection holding every CMS-driven section of the
 * registration page (hero, banner, FAQ, roadmap, numbers-speak, etc.).
 * Admin endpoints read/write fields on this single record.
 */

export interface IVideoItem {
    title?: string;
    url: string;
    thumbnail?: string;
    order?: number;
}

export interface IZoneItem {
    name: string;
    deadline: Date;
    cities?: string[];
}

export interface IPlayerStory {
    name: string;
    role?: string;
    story: string;
    image?: string;
    order?: number;
}

export interface IRegistrationCms extends Document {
    _id: mongoose.Types.ObjectId;

    // Latest Videos
    videos: IVideoItem[];

    // Numbers Speak
    numbersSpeak: { label: string; value: string; icon?: string; order?: number }[];

    // Journey Roadmap
    roadmap: { step: string; description?: string; order?: number }[];

    // Zone deadlines
    zoneDeadlines: IZoneItem[];

    // Player stories
    playerStories: IPlayerStory[];

    // Registration FAQs (separate from global FAQs)
    registrationFaqs: { question: string; answer: string; order?: number }[];

    // Hero
    hero: {
        title?: string;
        subtitle?: string;
        image?: string;
        videoUrl?: string;
        ctaText?: string;
        ctaLink?: string;
    };

    // Banner + Quote
    banner: {
        title?: string;
        subtitle?: string;
        image?: string;
        quote?: string;
        quoteAuthor?: string;
        ctaText?: string;
        ctaLink?: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const RegistrationCmsSchema = new Schema<IRegistrationCms>(
    {
        videos: [
            {
                title: String,
                url: { type: String, required: true },
                thumbnail: String,
                order: { type: Number, default: 0 },
            },
        ],
        numbersSpeak: [
            {
                label: { type: String, required: true },
                value: { type: String, required: true },
                icon: String,
                order: { type: Number, default: 0 },
            },
        ],
        roadmap: [
            {
                step: { type: String, required: true },
                description: String,
                order: { type: Number, default: 0 },
            },
        ],
        zoneDeadlines: [
            {
                name: { type: String, required: true },
                deadline: { type: Date, required: true },
                cities: [String],
            },
        ],
        playerStories: [
            {
                name: { type: String, required: true },
                role: String,
                story: { type: String, required: true },
                image: String,
                order: { type: Number, default: 0 },
            },
        ],
        registrationFaqs: [
            {
                question: { type: String, required: true },
                answer: { type: String, required: true },
                order: { type: Number, default: 0 },
            },
        ],
        hero: {
            title: String,
            subtitle: String,
            image: String,
            videoUrl: String,
            ctaText: String,
            ctaLink: String,
        },
        banner: {
            title: String,
            subtitle: String,
            image: String,
            quote: String,
            quoteAuthor: String,
            ctaText: String,
            ctaLink: String,
        },
    },
    { timestamps: true }
);

const RegistrationCms: Model<IRegistrationCms> =
    (mongoose.models.RegistrationCms as Model<IRegistrationCms>) ||
    mongoose.model<IRegistrationCms>("RegistrationCms", RegistrationCmsSchema);

export default RegistrationCms;