/**
 * `parse()` — thin wrapper around zod's `safeParse`.
 *
 * On success: returns the validated (and possibly coerced) value.
 * On failure: throws a `ValidationError` (a typed `AppError` with code
 * `VALIDATION_ERROR` and status 400). Caught by `withRequest()` and
 * returned as a 400 JSON envelope with details.
 *
 * Use at the input boundary of every route handler that takes a JSON body:
 *
 *   const body = parse(await req.json(), createUserSchema);
 *
 * This makes validation a typed step (the resulting `body` is the inferred
 * zod type, so downstream code gets autocomplete + compile-time checks)
 * and centralises the error shape.
 */

import type { ZodSchema } from "zod";
import { ValidationError } from "./errors";

export function parse<T>(input: unknown, schema: ZodSchema<T>): T {
    const result = schema.safeParse(input);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}
