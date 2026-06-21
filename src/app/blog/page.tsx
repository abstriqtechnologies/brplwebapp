"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import api from "@/apihelper/api";
import { Loader2, ArrowRight, Calendar } from "lucide-react";
import { getImageUrl } from "@/utils/imageHelper";

interface BlogListItem {
    _id: string;
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    featuredImage: string;
    createdAt: string;
    updatedAt: string;
}

const Blog = () => {
    const [posts, setPosts] = useState<BlogListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.get("/api/blog")
            .then((res) => {
                if (!cancelled && res.data?.success && Array.isArray(res.data.data)) {
                    setPosts(res.data.data);
                }
            })
            .catch(() => {
                if (!cancelled) setPosts([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    };

    const imageUrl = (img: string) => {
        if (!img) return "";
        if (img.startsWith("http")) return img;
        return getImageUrl(img);
    };

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <>
            <SEO
                title="Blog & News"
                description="Latest news and articles from Beyond Reach Premier League (BRPL)."
                url={origin + "/blog"}
            />
            <PageBanner title="Blog & News" currentPage="Blog" pageKey="blog" />
            <div className="container mx-auto px-4 py-12 md:py-16">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-[#111a45]" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-slate-600">
                        <p className="text-xl font-medium">No blogs updated.</p>
                        <p className="mt-2">Check back soon for news and updates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {posts.map((post) => (
                            <Link
                                key={post._id}
                                href={`/blog/${post.slug}`}
                                className="group block rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300"
                            >
                                <div className="aspect-video bg-slate-100 overflow-hidden">
                                    {post.featuredImage ? (
                                        <img
                                            src={imageUrl(post.featuredImage)}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#111a45]/5 text-[#111a45]/40 font-semibold">
                                            BRPL
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <p className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(post.createdAt)}
                                    </p>
                                    <h2 className="text-xl font-bold text-[#111a45] group-hover:text-[#FFC928] transition-colors line-clamp-2">
                                        {post.title}
                                    </h2>
                                    {post.metaDescription && (
                                        <p className="mt-2 text-slate-600 text-sm line-clamp-2">{post.metaDescription}</p>
                                    )}
                                    <span className="inline-flex items-center gap-1 mt-3 text-[#111a45] font-semibold text-sm group-hover:text-[#FFC928] transition-colors">
                                        Read more <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default Blog;
