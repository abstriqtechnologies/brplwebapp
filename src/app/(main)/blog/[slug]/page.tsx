import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import BlogPostClient from "./BlogPostClient";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    await connectDB();
    const post = await BlogPost.findOne({ slug }).lean();
    if (!post) return { title: "Post Not Found" };
    return {
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.excerpt || "",
        openGraph: {
            title: post.metaTitle || post.title,
            description: post.metaDescription || post.excerpt || "",
            ...(post.heroImage ? { images: [post.heroImage] } : {}),
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <BlogPostClient slug={slug} />
        </SiteContextProvider>
    );
}
