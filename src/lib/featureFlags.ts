/**
 * @deprecated Import these helpers from `@/lib/env` instead.
 *
 * This module is kept as a thin re-export so existing call sites (notably the
 * admin bootstrap) keep working. New code should import from `@/lib/env`.
 */

export { isProduction, isStaging } from "./env";
import { env } from "./env";

/** @deprecated Use `env.ALLOW_DEFAULT_ADMIN` directly. */
export function defaultAdminEnabled(): boolean {
    return Boolean(env.ALLOW_DEFAULT_ADMIN);
}

export const REGISTRATION_FEE_PAISE = 1499 * 100;
export const REGISTRATION_FEE_RUPEES = 1499;
export const REGISTRATION_FEE_CURRENCY = "INR";
