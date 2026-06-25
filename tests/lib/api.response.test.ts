import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ok, fail, noContent, isAppError } from "@/lib/api/response";
import { AppError, RateLimitError, NotFoundError } from "@/lib/api/errors";

describe("api/response helpers", () => {
    let errSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
        errSpy.mockRestore();
    });

    describe("ok()", () => {
        it("builds a 200 JSON success response with ok:true and data", async () => {
            const res = ok({ id: 1, name: "x" });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual({ ok: true, data: { id: 1, name: "x" } });
        });

        it("respects a custom status code", async () => {
            const res = ok({ created: true }, { status: 201 });
            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.data).toEqual({ created: true });
        });

        it("includes requestId when provided", async () => {
            const res = ok({ a: 1 }, { requestId: "req_abc" });
            const body = await res.json();
            expect(body.requestId).toBe("req_abc");
        });
    });

    describe("noContent()", () => {
        it("returns a 204 with no body", () => {
            const res = noContent();
            expect(res.status).toBe(204);
        });
    });

    describe("fail()", () => {
        it("converts a NotFoundError into a 404 JSON response", async () => {
            const res = fail(new NotFoundError("user not found"), "req_1");
            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body).toEqual({
                ok: false,
                code: "NOT_FOUND",
                message: "user not found",
                requestId: "req_1",
            });
        });

        it("attaches Retry-After for RateLimitError", async () => {
            const res = fail(new RateLimitError(30));
            expect(res.status).toBe(429);
            expect(res.headers.get("Retry-After")).toBe("30");
            const body = await res.json();
            expect(body.code).toBe("RATE_LIMITED");
            expect(body.details).toEqual({ retryAfterSec: 30 });
        });

        it("converts an unknown error into a generic 500", async () => {
            const res = fail(new Error("secret stack trace"), "req_xyz");
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body).toEqual({
                ok: false,
                code: "INTERNAL",
                message: "Internal server error",
                requestId: "req_xyz",
            });
            // The original error message is NOT leaked to the client.
            expect(JSON.stringify(body)).not.toContain("secret stack trace");
            // The full error IS logged server-side.
            expect(errSpy).toHaveBeenCalled();
        });

        it("handles non-Error throwables (string, object)", async () => {
            const r1 = fail("plain string error");
            expect(r1.status).toBe(500);
            const r2 = fail({ msg: "weird" });
            expect(r2.status).toBe(500);
        });

        it("handles AppError with details", async () => {
            const e = new AppError("BAD_REQUEST", 400, "bad", { details: { field: "x" } });
            const res = fail(e);
            const body = await res.json();
            expect(body.details).toEqual({ field: "x" });
        });
    });

    describe("isAppError re-export", () => {
        it("is the same function as in errors", () => {
            const e = new AppError("INTERNAL", 500, "x");
            expect(isAppError(e)).toBe(true);
        });
    });
});
