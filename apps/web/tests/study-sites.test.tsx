import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STUDY_SITES, studySiteFor } from "@/data/study-sites";
import StudySite from "@/components/library/StudySite";

describe("study site map", () => {
  it("maps the two subject codes to their sites", () => {
    expect(studySiteFor(["ME46018"])?.url).toBe("https://me46018-x7k2q.vercel.app");
    expect(studySiteFor(["ME46020"])?.url).toBe("https://me46020-fea9q.vercel.app");
  });

  it("ignores case, spaces and empty codes, and returns null for other subjects", () => {
    expect(studySiteFor([null, " me 46018 "])?.code).toBe("ME46018");
    expect(studySiteFor(["ME26011", undefined])).toBeNull();
    expect(studySiteFor([])).toBeNull();
  });

  it("only lists https urls", () => {
    for (const s of STUDY_SITES) expect(s.url).toMatch(/^https:\/\/[a-z0-9-]+\.vercel\.app$/);
  });
});

describe("StudySite card", () => {
  const site = STUDY_SITES[0];

  it("always shows the link card, opening in a new tab without referrer", () => {
    const html = renderToStaticMarkup(<StudySite site={site} />);
    expect(html).toContain(`href="${site.url}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Open in new tab");
  });

  it("does not load the iframe until the details is opened", () => {
    const html = renderToStaticMarkup(<StudySite site={site} />);
    expect(html).toContain("<details");
    expect(html).not.toContain("<iframe");
  });

  it("shows only the link card when frame is false", () => {
    const html = renderToStaticMarkup(<StudySite site={{ ...site, frame: false }} />);
    expect(html).toContain("Open in new tab");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<iframe");
  });
});
