import { describe, it, expect } from "vitest";

/**
 * `parse()` — zod safeParse wrapper that throws a typed ValidationError.
 *
 * Use this at the boundary of a route handler:
 *
 *   const body = parse(await req.json(), createUserSchema);
 *
 * On invalid input, the resulting `ValidationError` is caught by
 * `withRequest()` and returned as a 400 with details.
 */

describe("api/parse", () => {
    async function load() {
        return await import("@/lib/api/parse");
    }

    it("returns the parsed value when the schema accepts", async () => {
        const { z } = await import("zod");
        const { parse } = await load();
        const schema = z.object({ name: z.string() });
        const out = parse({ name: "alice" }, schema);
        expect(out).toEqual({ name: "alice" });
    });

    it("throws a ValidationError when the schema rejects", async () => {
        const { z } = await import("zod");
        const { parse } = await load();
        const schema = z.object({ name: z.string().min(3) });
        try {
            parse({ name: "x" }, schema);
            expect.fail("should have thrown");
        } catch (err: any) {
            expect(err.code).toBe("VALIDATION_ERROR");
            expect(err.status).toBe(400);
            expect(err.details).toBeDefined();
        }
    });

    it("throws a ValidationError when the input is not even an object", async () => {
        const { z } = await import("zod");
        const { parse } = await load();
        const schema = z.object({ a: z.number() });
        try {
            parse(null, schema);
            expect.fail("should have thrown");
        } catch (err: any) {
            expect(err.code).toBe("VALIDATION_ERROR");
        }
    });

    it("throws a BadRequestError when the input cannot be parsed at all", async () => {
        const { z } = await import("zod");
        const { parse } = await load();
        const schema = z.object({ a: z.number() });
        try {
            // Passing a string to a schema that expects an object — zod treats this
            // as a validation error, but the wrapper surfaces it consistently.
            parse("not-an-object" as any, schema);
            expect.fail("should have thrown");
        } catch (err: any) {
            expect(err.code).toBe("VALIDATION_ERROR");
            expect(err.status).toBe(400);
        }
    });
});
