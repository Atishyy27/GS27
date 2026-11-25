import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Runs against the production build with GS27_MOCK=1 (no Supabase). Third-party study sites are stubbed here;
// live-frame.spec.ts checks the real ones.
const SHOTS = "e2e-shots";
mkdirSync(SHOTS, { recursive: true });

const sizes = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "360", width: 360, height: 740 },
];

test.beforeEach(async ({ page }) => {
  if (test.info().title.includes("never loads")) return;
  await page.route(/https:\/\/me46\d{3}-[a-z0-9]+\.vercel\.app\/.*/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<body style='font-family:sans-serif;padding:24px'><h1>Stub study site</h1><p>Stand-in for the course site.</p></body>" }));
});

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const size of sizes) {
  test.describe(`subject page at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("ME46018: link card, lazy iframe, syllabus, past questions", async ({ page }) => {
      await page.goto("/mock/subject/ME46018");
      await expect(page.getByRole("heading", { name: "Automobile Engineering study site" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Open in new tab/ })).toHaveAttribute("href", "https://me46018-x7k2q.vercel.app");
      await expect(page.locator("iframe")).toHaveCount(0);
      await page.getByText("Study here").click();
      await expect(page.locator("iframe")).toHaveAttribute("src", "https://me46018-x7k2q.vercel.app");
      await expect(page.frameLocator("iframe").getByText("Stub study site")).toBeVisible();
      await expect(page.getByLabel("Syllabus").getByText("Unit 5", { exact: true })).toBeVisible();
      await expect(page.getByText("Repeat x2").first()).toBeVisible();
      await expect(page.getByText("must never show")).toHaveCount(0);
      expect(await noSideScroll(page)).toBe(true);
      await page.screenshot({ path: `${SHOTS}/subject-${size.name}.jpg`, type: "jpeg", quality: 55, fullPage: true });
    });

    test("ME46020: study card, no syllabus", async ({ page }) => {
      await page.goto("/mock/subject/ME46020");
      await expect(page.getByRole("heading", { name: "Finite Element Analysis study site" })).toBeVisible();
      await expect(page.getByLabel("Syllabus")).toHaveCount(0);
      expect(await noSideScroll(page)).toBe(true);
    });

    test("empty subject: empty state, no study card", async ({ page }) => {
      await page.goto("/mock/subject/ZZ00000?mode=empty");
      await expect(page.getByText("No past questions yet.")).toBeVisible();
      await expect(page.getByLabel("Study site")).toHaveCount(0);
      await expect(page.getByLabel("Syllabus")).toHaveCount(0);
      expect(await noSideScroll(page)).toBe(true);
      await page.screenshot({ path: `${SHOTS}/subject-empty-${size.name}.jpg`, type: "jpeg", quality: 55, fullPage: true });
    });

    test("mocked 500: error lines, not the empty state; study card still works", async ({ page }) => {
      await page.goto("/mock/subject/ME46018?mode=error");
      await expect(page.getByText("Could not load past questions")).toBeVisible();
      await expect(page.getByText("Could not load the syllabus")).toBeVisible();
      await expect(page.getByText("No past questions yet.")).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Open in new tab/ })).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/subject-error-${size.name}.jpg`, type: "jpeg", quality: 55, fullPage: true });
    });
  });
}

test("slow response still renders", async ({ page }) => {
  await page.goto("/mock/subject/ME46018?mode=slow");
  await expect(page.getByLabel("Syllabus").getByText("Unit 1", { exact: true })).toBeVisible();
});

test("frame off: link card only", async ({ page }) => {
  await page.goto("/mock/subject/ME46018?frame=0");
  await expect(page.getByRole("link", { name: /Open in new tab/ })).toBeVisible();
  await expect(page.getByText("Study here")).toHaveCount(0);
});

test("iframe that never loads: note points to the new tab", async ({ page }) => {
  test.setTimeout(60_000);
  await page.route(/https:\/\/me46\d{3}-[a-z0-9]+\.vercel\.app\/.*/, async (route) => {
    await new Promise((r) => setTimeout(r, 25_000));
    await route.abort();
  });
  await page.goto("/mock/subject/ME46018");
  await page.getByText("Study here").click();
  await expect(page.getByText("Taking long to load")).toBeVisible({ timeout: 20_000 });
});
