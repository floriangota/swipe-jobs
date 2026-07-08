/**
 * Sanitize-on-write for user free text (CLAUDE.md / docs/security.md: "sanitize free
 * text (bio, description, chat) on write"). Used for chat messages, worker bios,
 * employer/listing descriptions, and report details.
 *
 * Text is plain end to end: React renders it as text nodes (auto-escaped;
 * `dangerouslySetInnerHTML` is lint-banned), so HTML/script is inert — it shows as
 * literal characters. What escaping can't neutralize is what this strips: control
 * characters that corrupt rendering/logs, and zero-width/bidi characters used for
 * spoofing. Newlines are kept (multi-line text is legitimate).
 */

// The strip lists are built from code points so this source file contains none of the
// invisible characters itself.
function charRange(from: number, to: number): string {
  let out = "";
  for (let code = from; code <= to; code++) out += String.fromCharCode(code);
  return out;
}

// C0 controls (except tab 0x09, LF 0x0A, CR 0x0D), DEL, and C1 controls.
const CONTROL_CHARS = new RegExp(
  "[" +
    charRange(0x00, 0x08) +
    charRange(0x0b, 0x0c) +
    charRange(0x0e, 0x1f) +
    charRange(0x7f, 0x9f) +
    "]",
  "g",
);

// Zero-width chars (U+200B–200F), bidi overrides (U+202A–202E), word joiners /
// invisible operators (U+2060–2064), BOM (U+FEFF).
const INVISIBLE_CHARS = new RegExp(
  "[" +
    charRange(0x200b, 0x200f) +
    charRange(0x202a, 0x202e) +
    charRange(0x2060, 0x2064) +
    String.fromCharCode(0xfeff) +
    "]",
  "g",
);

export function sanitizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
