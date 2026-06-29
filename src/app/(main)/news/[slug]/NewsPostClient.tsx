"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import api from "@/apihelper/api";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import { getImageUrl } from "@/utils/imageHelper";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { SafeHtml } from "@/components/SafeHtml";

interface NewsPostData {
    _id: string;
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    featuredImage: string;
    content: string;
    enableSchema: boolean;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

interface NewsListItem {
    _id: string;
    title: string;
    slug: string;
    featuredImage: string;
    createdAt: string;
}

const SITE_NAME = "Beyond Reach Premier League";
const RECENT_POSTS_COUNT = 5;

export default function NewsPostClient({ slug }: { slug: string }) {
    const [post, setPost] = useState<NewsPostData | null>(null);
    const [recentPosts, setRecentPosts] = useState<NewsListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        Promise.all([
            api.get(`/api/news/slug/${slug}`),
            api.get("/api/news"),
        ])
            .then(([postRes, listRes]) => {
                if (cancelled) return;
                if (postRes.data?.success && postRes.data.data) {
                    setPost(postRes.data.data);
                } else {
                    setError(true);
                }
                if (listRes.data?.success && Array.isArray(listRes.data.data)) {
                    const others = listRes.data.data
                        .filter((p: NewsListItem) => p.slug !== slug)
                        .slice(0, RECENT_POSTS_COUNT);
                    setRecentPosts(others);
                }
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-[#111a45]" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-[#111a45] mb-4">Post not found</h1>
                    <Link href="/news" className="text-[#111a45] hover:text-[#FFC928] underline">
                        Back to News
                    </Link>
                </div>
            </div>
        );
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const canonicalUrl = `${origin}/news/${post.slug}`;
    const title = post.metaTitle?.trim() || post.title;
    const description = post.metaDescription?.trim() || post.title;
    const imageUrl = post.featuredImage
        ? (post.featuredImage.startsWith("http") ? post.featuredImage : getImageUrl(post.featuredImage))
        : undefined;

    const articleSchema = post.enableSchema
        ? {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: description,
              image: imageUrl ? [imageUrl] : undefined,
              datePublished: post.createdAt,
              dateModified: post.updatedAt || post.createdAt,
              author: {
                  "@type": "Organization",
                  name: SITE_NAME,
              },
              publisher: {
                  "@type": "Organization",
                  name: SITE_NAME,
                  logo: {
                      "@type": "ImageObject",
                      url: `${origin}/logo.webp`,
                  },
              },
              mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": canonicalUrl,
              },
          }
        : null;

    return (
        <>
            <SEO
                title={title}
                description={description}
                image={imageUrl}
                url={canonicalUrl}
                breadcrumbCurrentName={post.title}
            />
            {articleSchema && (
                <Helmet>
                    <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
                </Helmet>
            )}

            <div className="min-h-screen bg-white text-gray-900 pt-14 pb-12 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href="/news"
                        className="inline-flex items-center text-[#111a45] hover:text-[#FFC928] mb-6 md:mb-8 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to News
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                        <div className="lg:col-span-2">
                            <article>
                                <header className="mb-6 md:mb-8">
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#111a45] mb-4">
                                        {post.title}
                                    </h1>
                                    <p className="flex items-center gap-2 text-slate-500 text-sm md:text-base">
                                        <Calendar className="w-4 h-4 shrink-0" />
                                        {new Date(post.createdAt).toLocaleDateString("en-IN", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </p>
                                </header>

                                {post.featuredImage && (
                                    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 mb-6 md:mb-8">
                                        <img
                                            src={imageUrl || post.featuredImage}
                                            alt={post.title}
                                            className="w-full h-auto object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                )}

                                <SafeHtml
                                    html={decodeHtmlEntities(post.content || "")}
                                    className="prose prose-lg prose-slate max-w-none prose-headings:text-[#111a45] prose-headings:font-display prose-a:text-[#111a45] prose-a:font-semibold hover:prose-a:text-[#FFC928] prose-img:rounded-xl"
                                />
                            </article>
                        </div>

                        <div className="lg:col-span-1">
                            <aside className="lg:sticky lg:top-[9rem] lg:z-10 lg:self-start">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100">
                                        <h2 className="text-lg font-bold text-[#111a45]">Recent News</h2>
                                    </div>
                                    <ul className="divide-y divide-slate-100">
                                        {recentPosts.length === 0 ? (
                                            <li className="px-5 py-4 text-sm text-slate-500">No other news yet.</li>
                                        ) : (
                                            recentPosts.map((item) => {
                                                const thumbUrl = item.featuredImage
                                                    ? (item.featuredImage.startsWith("http") ? item.featuredImage : getImageUrl(item.featuredImage))
                                                    : "";
                                                return (
                                                    <li key={item._id}>
                                                        <Link
                                                            href={`/news/${item.slug}`}
                                                            className="flex gap-3 px-5 py-4 hover:bg-slate-50 transition-colors group"
                                                        >
                                                            <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                                                                {thumbUrl ? (
                                                                    <img
                                                                        src={thumbUrl}
                                                                        alt=""
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                        loading="lazy"
                                                                        decoding="async"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[#111a45]/40 text-xs font-semibold">BRPL</div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                                <span className="text-sm font-medium text-[#111a45] group-hover:text-[#FFC928] line-clamp-2 transition-colors">
                                                                    {item.title}
                                                                </span>
                                                                <span className="text-xs text-slate-500 mt-0.5">
                                                                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                                                                        year: "numeric",
                                                                        month: "short",
                                                                        day: "numeric",
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                );
                                            })
                                        )}
                                    </ul>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
