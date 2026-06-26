/**
 * Helper for page-level handlers that need to redirect to /login when a
 * stale JWT is detected (cookie valid but user missing in DB).
 *
 * IMPORTANT: This helper is invoked from Server Components. Next.js forbids
 * cookie mutation in Server Components — `cookies().delete()` throws at
 * runtime with "Cookies can only be modified in a Server Action or Route
 * Handler." The stale cookie is cleared by the middleware on the *next*
 * request (after the browser follows this redirect to /login) via the
 * `expired` / `user_missing` branches of `src/middleware.ts`. The page-level
 * redirect just needs to break the loop.
 *
 * Usage:
 *   const session = await getAuthSession();
 *   if (!session) return staleJwtRedirect("/checkout");
 */

import "server-only";
import { redirect } from "next/navigation";

export async function staleJwtRedirect(pathname: string): Promise<never> {
    redirect(`/login?next=${pathname}`);
}
