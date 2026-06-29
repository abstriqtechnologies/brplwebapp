import mongoose, { Schema, Model, Document } from "mongoose";

/**
 * Single doc collection holding all About-Us CMS content (banner,
 * about-Brpl body, mission & vision, meet-our-team). Admin endpoints
 * read/write fields on this single record.
 */

export interface IAboutStat {
    label: string;
    value: string;
    order?: number;
}

export interface IAboutCms extends Document {
    _id: mongoose.Types.ObjectId;

    banner: {
        title?: string;
        subtitle?: string;
        image?: string;
    };

    aboutBrpl: {
        title?: string;
        body?: string;
        image?: string;
        stats?: IAboutStat[];
    };

    missionVision: {
        missionTitle?: string;
        missionBody?: string;
        visionTitle?: string;
        visionBody?: string;
        image?: string;
    };

    meetOurTeam: {
        title?: string;
        subtitle?: string;
        image?: string;
        body?: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const AboutCmsSchema = new Schema<IAboutCms>(
    {
        banner: {
            title: String,
            subtitle: String,
            image: String,
        },
        aboutBrpl: {
            title: String,
            body: String,
            image: String,
            stats: [
                {
                    label: { type: String, required: true },
                    value: { type: String, required: true },
                    order: { type: Number, default: 0 },
                },
            ],
        },
        missionVision: {
            missionTitle: String,
            missionBody: String,
            visionTitle: String,
            visionBody: String,
            image: String,
        },
        meetOurTeam: {
            title: String,
            subtitle: String,
            image: String,
            body: String,
        },
    },
    { timestamps: true }
);

const AboutCms: Model<IAboutCms> =
    (mongoose.models.AboutCms as Model<IAboutCms>) ||
    mongoose.model<IAboutCms>("AboutCms", AboutCmsSchema);

export default AboutCms;