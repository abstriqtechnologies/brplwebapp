export function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export function openLink(href: string) {
    if (typeof window === "undefined") return;
    window.open(href, "_blank", "noopener,noreferrer");
}

export function formatCurrencyINR(value: number | undefined | null) {
    if (value === undefined || value === null) return "Rs. 0";
    return "Rs. " + Number(value).toLocaleString("en-IN");
}
