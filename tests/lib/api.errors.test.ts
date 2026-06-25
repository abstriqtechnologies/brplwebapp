import { describe, it, expect } from "vitest";
import {
    AppError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    UnauthorizedError,
    UpstreamError,
    ValidationError,
    isAppError,
} from "@/lib/api/errors";

describe("AppError hierarchy", () => {
    it("BadRequestError → 400 / BAD_REQUEST", () => {
        const e = new BadRequestError("missing field");
        expect(e.status).toBe(400);
        expect(e.code).toBe("BAD_REQUEST");
        expect(e.message).toBe("missing field");
        expect(isAppError(e)).toBe(true);
    });

    it("ValidationError carries details", () => {
        const details = { field: "phone", reason: "required" };
        const e = new ValidationError(details);
        expect(e.status).toBe(400);
        expect(e.code).toBe("VALIDATION_ERROR");
        expect(e.details).toEqual(details);
    });

    it("UnauthorizedError → 401", () => {
        const e = new UnauthorizedError();
        expect(e.status).toBe(401);
        expect(e.code).toBe("UNAUTHORIZED");
    });

    it("ForbiddenError → 403", () => {
        const e = new ForbiddenError("nope");
        expect(e.status).toBe(403);
        expect(e.code).toBe("FORBIDDEN");
    });

    it("NotFoundError → 404", () => {
        const e = new NotFoundError("user not found");
        expect(e.status).toBe(404);
        expect(e.code).toBe("NOT_FOUND");
    });

    it("ConflictError → 409", () => {
        const e = new ConflictError("already exists");
        expect(e.status).toBe(409);
        expect(e.code).toBe("CONFLICT");
    });

    it("RateLimitError → 429 with retryAfterSec", () => {
        const e = new RateLimitError(42);
        expect(e.status).toBe(429);
        expect(e.code).toBe("RATE_LIMITED");
        expect(e.retryAfterSec).toBe(42);
        expect(e.details).toEqual({ retryAfterSec: 42 });
    });

    it("UpstreamError → 502 with cause", () => {
        const cause = new Error("Razorpay down");
        const e = new UpstreamError("payment failed", { cause });
        expect(e.status).toBe(502);
        expect(e.code).toBe("UPSTREAM_ERROR");
        expect(e.cause).toBe(cause);
    });

    it("isAppError returns false for plain Error", () => {
        const e = new Error("plain");
        expect(isAppError(e)).toBe(false);
    });

    it("isAppError returns false for non-Error values", () => {
        expect(isAppError(null)).toBe(false);
        expect(isAppError(undefined)).toBe(false);
        expect(isAppError("string")).toBe(false);
        expect(isAppError(42)).toBe(false);
    });

    it("AppError preserves stack trace via Error.captureStackTrace", () => {
        const e = new AppError("INTERNAL", 500, "oops");
        expect(e.stack).toBeDefined();
        expect(e.name).toBe("AppError");
    });
});
