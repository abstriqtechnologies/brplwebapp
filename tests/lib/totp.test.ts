import { describe, it, expect } from "vitest";
import { generateTotpSecret, verifyTotp, otpauthUrl } from "@/lib/totp";
import speakeasy from "speakeasy";

describe("totp", () => {
    it("verifies a valid code for a generated secret", () => {
        const secret = generateTotpSecret();
        const code = speakeasy.totp({ secret, encoding: "base32" });
        expect(verifyTotp(secret, code)).toBe(true);
    });

    it("rejects an invalid code", () => {
        const secret = generateTotpSecret();
        expect(verifyTotp(secret, "000000")).toBe(false);
    });

    it("rejects malformed input", () => {
        const secret = generateTotpSecret();
        expect(verifyTotp(secret, "abc")).toBe(false);
        expect(verifyTotp("", "123456")).toBe(false);
    });

    it("builds an otpauth URL with issuer", () => {
        const url = otpauthUrl("SECRET", "admin@brpl.com");
        expect(url).toMatch(/^otpauth:\/\/totp\//);
        expect(url).toContain("issuer=BRPL%20Admin");
        expect(url).toContain("secret=SECRET");
    });
});