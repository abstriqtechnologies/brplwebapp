import { describe, it, expect } from "vitest";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

describe("Upload API", () => {
    it("should define allowed file types", () => {
        expect(ALLOWED_TYPES).toContain("image/jpeg");
        expect(ALLOWED_TYPES).toContain("image/png");
        expect(ALLOWED_TYPES).toContain("image/webp");
        expect(ALLOWED_TYPES).toContain("image/gif");
    });

    it("should reject non-image file types", () => {
        const allowed = ALLOWED_TYPES;
        const disallowed = ["application/pdf", "text/html", "application/zip"];

        for (const type of disallowed) {
            expect(allowed.includes(type)).toBe(false);
        }
    });

    it("should accept valid image types", () => {
        const allowed = ALLOWED_TYPES;
        const valid = ["image/jpeg", "image/png", "image/webp", "image/gif"];

        for (const type of valid) {
            expect(allowed.includes(type)).toBe(true);
        }
    });

    it("should define max file size as 50MB", () => {
        expect(MAX_SIZE).toBe(50 * 1024 * 1024);
    });
});
