import { describe, it, expect } from "vitest";
import { sanitizeMessageBody } from "../sanitize";

// Test inputs build invisible characters from code points so this file (like the
// sanitizer itself) contains none of them literally.
const ch = (code: number) => String.fromCharCode(code);

describe("sanitizeMessageBody", () => {
  it("passes normal text through, trimmed", () => {
    expect(sanitizeMessageBody("  Hello, kur mund të filloj?  ")).toBe(
      "Hello, kur mund të filloj?",
    );
  });

  it("keeps newlines (multi-line messages) and normalizes CRLF", () => {
    expect(sanitizeMessageBody("line one\r\nline two\rline three")).toBe(
      "line one\nline two\nline three",
    );
  });

  it("caps runs of blank lines", () => {
    expect(sanitizeMessageBody("a\n\n\n\n\n\nb")).toBe("a\n\n\nb");
  });

  it("strips C0/C1 control characters (incl. NUL and ESC)", () => {
    const input = `he${ch(0x00)}llo${ch(0x1b)} wor${ch(0x08)}ld${ch(0x9c)}`;
    expect(sanitizeMessageBody(input)).toBe("hello world");
  });

  it("strips zero-width and bidi-override characters (spoofing vectors)", () => {
    const input = `pa${ch(0x200b)}y ${ch(0x202e)}55${ch(0x202c)} eur${ch(0xfeff)}`;
    // 202C (pop directional formatting) is in the bidi strip range 202A-202E.
    expect(sanitizeMessageBody(input)).toBe("pay 55 eur");
  });

  it("returns an empty string for invisible-only input (service rejects → 400)", () => {
    expect(sanitizeMessageBody(`${ch(0x200b)}${ch(0x00)} \n `)).toBe("");
  });

  it("leaves an XSS payload as inert TEXT — neutralized by React escaping on render", () => {
    // docs/security.md: sanitize on write + escape on render. Messages are plain text;
    // React renders them as text nodes (dangerouslySetInnerHTML is lint-banned), so
    // markup survives as literal characters and never executes. The write-side strip
    // targets what escaping can't fix (control/invisible chars), not HTML.
    const payload = `<script>alert("xss")</script><img src=x onerror=alert(1)>`;
    expect(sanitizeMessageBody(payload)).toBe(payload);
  });

  it("keeps emoji and Albanian diacritics intact", () => {
    expect(sanitizeMessageBody("Përshëndetje 👋 çka bën?")).toBe("Përshëndetje 👋 çka bën?");
  });
});
