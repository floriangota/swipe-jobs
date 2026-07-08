import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  renderNewMatchEmail,
  renderNewMessageEmail,
} from "../emails/notification-emails";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
  });
});

describe("renderNewMatchEmail", () => {
  it("includes the counterpart name and a link to the match", () => {
    const email = renderNewMatchEmail("en", {
      counterpartName: "Café Ballkoni",
      listingTitle: "Barista",
      url: "https://app.example.com/matches/m1",
    });
    expect(email.subject).toContain("match");
    expect(email.html).toContain("Café Ballkoni");
    expect(email.html).toContain("https://app.example.com/matches/m1");
  });

  it("HTML-escapes a malicious counterpart name (anti-injection)", () => {
    const email = renderNewMatchEmail("sq", {
      counterpartName: `<img src=x onerror=alert(1)>`,
      listingTitle: "Barista",
      url: "https://app.example.com/matches/m1",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });
});

describe("renderNewMessageEmail", () => {
  it("shows a single-message preview, escaped", () => {
    const email = renderNewMessageEmail("en", {
      senderName: "Arben S.",
      preview: `<b>hi</b>`,
      count: 1,
      url: "https://app.example.com/matches/m1",
    });
    expect(email.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
    expect(email.html).not.toContain("<b>hi</b>");
    expect(email.subject).toContain("Arben S."); // plain-text subject uses the raw name
  });

  it("collapses to a count for multiple messages (no single preview)", () => {
    const email = renderNewMessageEmail("en", {
      senderName: "Arben S.",
      preview: "should not appear",
      count: 3,
      url: "https://app.example.com/matches/m1",
    });
    expect(email.html).toContain("3");
    expect(email.html).not.toContain("should not appear");
  });
});
