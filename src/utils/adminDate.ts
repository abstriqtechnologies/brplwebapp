export function formatDate(value: string | Date | undefined | null, withTime = false) {
    if (!value) return "-";
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "-";
    if (withTime) {
        return d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(value: string | Date | undefined | null) {
    if (!value) return "-";
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function toDateInput(value: string | Date | undefined | null) {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}
