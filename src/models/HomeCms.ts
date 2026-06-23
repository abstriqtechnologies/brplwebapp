import mongoose, { Schema, Model, Document } from "mongoose";

export interface IHomeBanner {
    title?: string;
    subtitle?: string;
    image?: string;
    videoUrl?: string;
    ctaText?: string;
    ctaLink?: string;
    order?: number;
}

export interface IWhoWeArePoint {
    icon?: string;
    title: string;
    description: string;
    order?: number;
}

export interface IHomeCms extends Document {
    _id: mongoose.Types.ObjectId;

    banners: IHomeBanner[];

    whoWeAre: {
        title?: string;
        subtitle?: string;
        body?: string;
        image?: string;
        points?: IWhoWeArePoint[];
    };

    trustBar: { label: string; value: string; icon?: string; order?: number }[];

    broadcastingPartners: { name: string; logo: string; website?: string; order?: number }[];

    createdAt: Date;
    updatedAt: Date;
}

const HomeCmsSchema = new Schema<IHomeCms>(
    {
        banners: [
            {
                title: String,
                subtitle: String,
                image: String,
                videoUrl: String,
                ctaText: String,
                ctaLink: String,
                order: { type: Number, default: 0 },
            },
        ],
        whoWeAre: {
            title: String,
            subtitle: String,
            body: String,
            image: String,
            points: [
                {
                    icon: String,
                    title: { type: String, required: true },
                    description: { type: String, required: true },
                    order: { type: Number, default: 0 },
                },
            ],
        },
        trustBar: [
            {
                label: { type: String, required: true },
                value: { type: String, required: true },
                icon: String,
                order: { type: Number, default: 0 },
            },
        ],
        broadcastingPartners: [
            {
                name: { type: String, required: true },
                logo: { type: String, required: true },
                website: String,
                order: { type: Number, default: 0 },
            },
        ],
    },
    { timestamps: true }
);

const HomeCms: Model<IHomeCms> =
    (mongoose.models.HomeCms as Model<IHomeCms>) ||
    mongoose.model<IHomeCms>("HomeCms", HomeCmsSchema);

export default HomeCms;
