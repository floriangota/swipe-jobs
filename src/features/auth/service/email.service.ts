import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env.server";

type Locale = "sq" | "en";

interface EmailCopy {
  subject: string;
  heading: string;
  body: string;
  cta: string;
  ignore: string;
}

const verificationCopy: Record<Locale, EmailCopy> = {
  sq: {
    subject: "Verifiko email-in tënd — SwipeJobs",
    heading: "Verifiko email-in tënd",
    body: "Faleminderit që u regjistrove në SwipeJobs. Kliko butonin më poshtë për ta verifikuar email-in tënd.",
    cta: "Verifiko email-in",
    ignore: "Nëse nuk je regjistruar ti, mund ta injorosh këtë mesazh.",
  },
  en: {
    subject: "Verify your email — SwipeJobs",
    heading: "Verify your email",
    body: "Thanks for signing up to SwipeJobs. Click the button below to verify your email address.",
    cta: "Verify email",
    ignore: "If you didn't sign up, you can safely ignore this email.",
  },
};

// No user-provided content is interpolated into this HTML (only static copy and
// our own verification URL), so there is no injection surface.
function renderVerificationHtml(copy: EmailCopy, url: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <h1 style="margin:0 0 12px;font-size:20px;color:#1f2430;">${copy.heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5163;">${copy.body}</p>
            <a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${copy.cta}</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8b90a0;">${copy.ignore}</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#a0a4b0;">SwipeJobs · Ferizaj</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Send the app-managed verification email via Resend. */
export async function sendVerificationEmail(
  to: string,
  locale: Locale,
  verifyUrl: string,
): Promise<void> {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = getServerEnv();
  const resend = new Resend(RESEND_API_KEY);
  const copy = verificationCopy[locale];

  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject: copy.subject,
    html: renderVerificationHtml(copy, verifyUrl),
  });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}
