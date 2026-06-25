export type SerializedPost = {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    summary?: string;
    content: string;
    heroImage?: string;
    featuredImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    enableSchema?: boolean;
    isPublished?: boolean;
    authorName?: string;
    authorImage?: string;
    source?: string;
    sourceUrl?: string;
    tags?: string[];
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

export function serializePost(doc: any): SerializedPost {
    if (!doc) return doc;
    const d: any = { ...doc };
    if (d._id) d._id = d._id.toString();
    // Public-API aliases
    d.featuredImage = d.featuredImage || d.heroImage;
    d.metaTitle = d.metaTitle && d.metaTitle.length > 0 ? d.metaTitle : d.title;
    d.metaDescription =
        d.metaDescription && d.metaDescription.length > 0 ? d.metaDescription : d.excerpt || d.summary || "";
    d.isPublished = d.isPublished !== undefined ? d.isPublished : !d.draft;
    return d as SerializedPost;
}
