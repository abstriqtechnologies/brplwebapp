export const isProduction = () => process.env.NODE_ENV === "production";
export const isStaging = (): boolean => (process.env.NODE_ENV as string | undefined) === "staging";

/** Only allow the default-admin seed outside production unless explicitly enabled. */
export function defaultAdminEnabled(): boolean {
    if (!isProduction()) return true;
    return process.env.ALLOW_DEFAULT_ADMIN === "1";
}

export const REGISTRATION_FEE_PAISE = 1499 * 100;
export const REGISTRATION_FEE_RUPEES = 1499;
export const REGISTRATION_FEE_CURRENCY = "INR";
