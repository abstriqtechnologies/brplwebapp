/**
 * Helper for page-level handlers that need to redirect to /login when a
 * stale JWT is detected (cookie valid but user missing in DB). The helper
 * deletes the stale cookie so the next request doesn't loop.
 *
 * Usage:
 *   const session = await getAuthSession();
 *   if (!session) return staleJwtRedirect(cookies(), "/checkout");
 */

import "server-only";
import { redirect } from "next/navigation";
import { COOKIE_NAMES } from "./cookies";

export async function staleJwtRedirect(
    cookiesApi: { delete: (name: string) => void },
    pathname: string,
): Promise<never> {
    cookiesApi.delete(COOKIE_NAMES.AUTH);
    redirect(`/login?next=${pathname}`);
}
