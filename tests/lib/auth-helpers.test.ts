import { describe, it, expect } from "vitest";
import {
    isValidPhone,
    isCompleteOtp,
    formatOtpExpiry,
    PHONE_REGEX,
    REGISTRATION_FEE_DISPLAY,
} from "@/app/auth/auth-helpers";

describe("isValidPhone", () => {
    it("accepts a 10-digit number", () => {
        expect(isValidPhone("9876543210")).toBe(true);
    });
    it("rejects fewer than 10 digits", () => {
        expect(isValidPhone("98765")).toBe(false);
    });
    it("rejects more than 10 digits", () => {
        expect(isValidPhone("98765432101")).toBe(false);
    });
    it("rejects non-numeric characters", () => {
        expect(isValidPhone("98765abcde")).toBe(false);
    });
    it("rejects empty string", () => {
        expect(isValidPhone("")).toBe(false);
    });
    it("exposes the regex for callers that want it", () => {
        expect(PHONE_REGEX.test("9876543210")).toBe(true);
    });
});

describe("isCompleteOtp", () => {
    it("returns true when all 6 boxes are filled with a digit", () => {
        expect(isCompleteOtp(["1", "2", "3", "4", "5", "6"])).toBe(true);
    });
    it("returns false when a box is empty", () => {
        expect(isCompleteOtp(["1", "2", "3", "4", "5", ""])).toBe(false);
    });
    it("returns false when a box has multiple digits", () => {
        expect(isCompleteOtp(["1", "23", "3", "4", "5", "6"])).toBe(false);
    });
    it("returns false when a box has a non-digit", () => {
        expect(isCompleteOtp(["1", "2", "a", "4", "5", "6"])).toBe(false);
    });
    it("returns false for arrays of the wrong length", () => {
        expect(isCompleteOtp(["1", "2", "3"])).toBe(false);
    });
});

describe("formatOtpExpiry", () => {
    it("formats 300 seconds as 5:00", () => {
        expect(formatOtpExpiry(300)).toBe("5:00");
    });
    it("formats 65 seconds as 1:05", () => {
        expect(formatOtpExpiry(65)).toBe("1:05");
    });
    it("formats 0 as 0:00", () => {
        expect(formatOtpExpiry(0)).toBe("0:00");
    });
    it("formats negative as 0:00", () => {
        expect(formatOtpExpiry(-5)).toBe("0:00");
    });
    it("pads single-digit seconds", () => {
        expect(formatOtpExpiry(9)).toBe("0:09");
    });
});

describe("REGISTRATION_FEE_DISPLAY", () => {
    it("renders as ₹1,499", () => {
        expect(REGISTRATION_FEE_DISPLAY).toBe("₹1,499");
    });
});