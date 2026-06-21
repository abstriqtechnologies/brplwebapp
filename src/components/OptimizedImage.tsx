import React from "react";

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Main image src (JPEG/PNG fallback) */
  src: string;
  /** Optional WebP source for smaller file size and better LCP */
  webpSrc?: string;
  /** Set to true for LCP images (hero, logo) to skip lazy loading and use fetchpriority="high" */
  priority?: boolean;
}

/**
 * Image component for Core Web Vitals: lazy loading by default, optional WebP via <picture>.
 * Use priority={true} only for above-the-fold / LCP images (e.g. first banner, logo).
 */
const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ src, webpSrc, priority = false, loading, decoding = "async", alt = "", ...props }, ref) => {
    const shouldLazy = priority ? "eager" : (loading ?? "lazy");
    const fetchPriority = priority ? "high" : undefined;

    if (webpSrc) {
      return (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            ref={ref}
            src={src}
            alt={alt}
            loading={shouldLazy}
            decoding={decoding}
            fetchPriority={fetchPriority}
            {...props}
          />
        </picture>
      );
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={shouldLazy}
        decoding={decoding}
        fetchPriority={fetchPriority}
        {...props}
      />
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
