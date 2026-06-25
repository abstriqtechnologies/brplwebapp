import { describe, it, expect } from "vitest";

/**
 * Admin password policy.
 *
 * Rules:
 *   - At least 12 characters.
 *   - At least one lowercase letter.
 *   - At least one uppercase letter.
 *   - At least one digit.
 *   - Not in a small list of well-known breached passwords.
 *
 * Returns null when valid; otherwise returns a human-readable error message.
 */

import { validatePassword } from "@/lib/password-policy";

describe("password policy", () => {
    describe("length", () => {
        it("rejects passwords shorter than 12 characters", () => {
            const result = validatePassword("Short1!");
            expect(result).toMatch(/12 characters/);
        });
        it("accepts passwords exactly 12 characters long", () => {
            expect(validatePassword("GoodPass123!")).toBeNull();
        });
    });

    describe("character classes", () => {
        it("rejects a password with no lowercase letter", () => {
            const result = validatePassword("ALLUPPERCASE1!");
            expect(result).toMatch(/lowercase/);
        });
        it("rejects a password with no uppercase letter", () => {
            const result = validatePassword("alllowercase1!");
            expect(result).toMatch(/uppercase/);
        });
        it("rejects a password with no digit", () => {
            const result = validatePassword("NoDigitsHere!!!");
            expect(result).toMatch(/digit/);
        });
    });

    describe("breached/common list", () => {
        it("rejects 'password'", () => {
            expect(validatePassword("password123AA")).toMatch(/common|breached|password/i);
        });
        it("rejects 'qwerty'", () => {
            expect(validatePassword("Qwerty1234567")).toMatch(/common|breached|password/i);
        });
    });

    describe("happy path", () => {
        it("accepts a strong password", () => {
            expect(validatePassword("Tr0ub4dor&3xx")).toBeNull();
        });
        it("accepts a passphrase-style strong password", () => {
            expect(validatePassword("correct-horse-battery-staple-9X")).toBeNull();
        });
    });
});
