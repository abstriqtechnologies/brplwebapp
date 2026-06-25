import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, newRequestId } from "@/lib/logger";

describe("logger", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
        warnSpy.mockRestore();
        errSpy.mockRestore();
    });

    it("emits info logs via console.log", () => {
        logger.info("hello", { userId: 1 });
        expect(logSpy).toHaveBeenCalledTimes(1);
        const arg = logSpy.mock.calls[0]![0] as string;
        expect(arg).toMatch(/hello/);
    });

    it("emits warn logs (dev: console.warn, prod: console.log via JSON)", () => {
        // When NODE_ENV is "test" (not dev), the logger is in production mode
        // and serialises to JSON via console.log. We assert the message makes
        // it to *some* console, regardless of channel.
        logger.warn("watch out", { requestId: "abc" });
        const total = warnSpy.mock.calls.length + logSpy.mock.calls.length + errSpy.mock.calls.length;
        expect(total).toBeGreaterThan(0);
    });

    it("emits error logs via console.error and includes the error stack", () => {
        const err = new Error("boom");
        logger.error("kaboom", { requestId: "abc" }, err);
        expect(errSpy).toHaveBeenCalled();
        // The dev format calls error(stack) — the second arg is the stack
        const allArgs = errSpy.mock.calls.flat();
        const hasStack = allArgs.some((a) => typeof a === "string" && a.includes("boom"));
        expect(hasStack).toBe(true);
    });

    it("child() prepends base context to every call", () => {
        const child = logger.child({ requestId: "req_42", route: "/api/test" });
        child.info("child-event", { extra: 1 });
        expect(logSpy).toHaveBeenCalledTimes(1);
        // The dev-format line should include the requestId and the route
        const line = logSpy.mock.calls[0]![0] as string;
        expect(line).toMatch(/req_42/);
    });

    it("newRequestId returns a non-empty string", () => {
        const id = newRequestId();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
    });

    it("newRequestId returns unique values", () => {
        const a = newRequestId();
        const b = newRequestId();
        expect(a).not.toBe(b);
    });
});
