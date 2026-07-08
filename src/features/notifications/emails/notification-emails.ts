// M7 transactional emails (new match, new message). Unlike the verification email,
// these interpolate USER-DERIVED strings (counterpart names, a message preview), so
// every dynamic value is HTML-escaped before it enters the template (anti-injection).

export type EmailLocale = "sq" | "en";

export interface RenderedEmail {
  subject: string;
  html: string;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(heading: string, bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  // ctaUrl is always an app-origin URL we build (never user input).
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
          <tr><td>
            <h1 style="margin:0 0 12px;font-size:20px;color:#1f2430;">${heading}</h1>
            ${bodyHtml}
            <a href="${ctaUrl}" style="display:inline-block;margin-top:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${ctaLabel}</a>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#a0a4b0;">SwipeJobs · Ferizaj</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5163;">${text}</p>`;
}

function quote(text: string): string {
  return `<p style="margin:0 0 20px;padding:12px 16px;background:#f4f4f7;border-radius:8px;font-size:14px;line-height:1.5;color:#4b5163;">${text}</p>`;
}

const matchCopy: Record<EmailLocale, { subject: string; heading: string; lead: (n: string, t: string) => string; cta: string }> = {
  sq: {
    subject: "Keni një përputhje të re — SwipeJobs",
    heading: "Përputhje e re!",
    lead: (n, t) => `U përputhët me <strong>${n}</strong> për pozitën <strong>${t}</strong>. Bisedoni dhe merruni vesh për punën.`,
    cta: "Hap bisedën",
  },
  en: {
    subject: "You have a new match — SwipeJobs",
    heading: "It's a match!",
    lead: (n, t) => `You matched with <strong>${n}</strong> for <strong>${t}</strong>. Start chatting and arrange the work.`,
    cta: "Open chat",
  },
};

export function renderNewMatchEmail(
  locale: EmailLocale,
  data: { counterpartName: string; listingTitle: string; url: string },
): RenderedEmail {
  const c = matchCopy[locale];
  const name = escapeHtml(data.counterpartName);
  const title = escapeHtml(data.listingTitle);
  return {
    subject: c.subject,
    html: shell(c.heading, paragraph(c.lead(name, title)), c.cta, data.url),
  };
}

const messageCopy: Record<
  EmailLocale,
  { subject: (n: string) => string; heading: string; lead: (n: string, count: number) => string; cta: string }
> = {
  sq: {
    subject: (n) => `Mesazh i ri nga ${n} — SwipeJobs`,
    heading: "Mesazh i ri",
    lead: (n, count) =>
      count > 1
        ? `Keni <strong>${count}</strong> mesazhe të reja nga <strong>${n}</strong>.`
        : `Keni një mesazh të ri nga <strong>${n}</strong>.`,
    cta: "Lexo mesazhin",
  },
  en: {
    subject: (n) => `New message from ${n} — SwipeJobs`,
    heading: "New message",
    lead: (n, count) =>
      count > 1
        ? `You have <strong>${count}</strong> new messages from <strong>${n}</strong>.`
        : `You have a new message from <strong>${n}</strong>.`,
    cta: "Read message",
  },
};

export function renderNewMessageEmail(
  locale: EmailLocale,
  data: { senderName: string; preview: string; count: number; url: string },
): RenderedEmail {
  const c = messageCopy[locale];
  const name = escapeHtml(data.senderName); // for the HTML body
  const body =
    paragraph(c.lead(name, data.count)) + (data.count === 1 ? quote(escapeHtml(data.preview)) : "");
  return {
    subject: c.subject(data.senderName), // plain-text header — raw, not HTML-escaped
    html: shell(c.heading, body, c.cta, data.url),
  };
}
