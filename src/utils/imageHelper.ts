/**
 * Static-only image URL resolver.
 * In the original Vite app, this routed to cloud storage / API URLs.
 * In this static build, all images are local /public assets, so we just
 * normalize the path to ensure it begins with "/".
 */
export const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) {
        return path;
    }
    if (path.startsWith("/")) return path;
    if (path.startsWith("uploads/")) return "/" + path;
    return "/" + path;
};
