import { env } from "@/lib/env";

type Lead = { _id: any; name: string; email?: string; phone?: string; message: string; source: string };

/**
 * Best-effort email notification when a contact or partner lead is submitted.
 * The transport (SMTP, SendGrid, SES) is configured via env vars in production.
 * In dev/staging or when no transport is configured, this logs and resolves.
 */
export async function sendContactNotification(lead: Lead): Promise<void> {
    const hasTransport = Boolean(env.SMTP_URL || env.SENDGRID_API_KEY || env.SES_REGION);
    if (!hasTransport) {
        // eslint-disable-next-line no-console
        console.info(
            `[contact] new lead from ${lead.name} (${lead.email ?? "no email"}): ${lead.message.slice(0, 80)}`,
        );
        return;
    }
    // Wire your provider here. Intentionally not shipping a transport that could
    // accidentally send mail from a dev machine.
    // eslint-disable-next-line no-console
    console.info(`[contact] (transport configured) would notify admin of lead ${lead._id.toString()}`);
}
