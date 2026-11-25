import { expect, test } from "@playwright/test";

// The one check against the real third-party sites: do they actually render inside an iframe in Chromium?
for (const code of ["ME46018", "ME46020"]) {
  test(`${code} study site renders inside the iframe`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/mock/subject/${code}`);
    await page.getByText("Study here").click();
    const frame = page.frameLocator("iframe");
    await expect(frame.locator("body")).toBeVisible({ timeout: 30_000 });
    await expect(frame.locator("title, #app, main, body").first()).toBeAttached();
    const html = await frame.locator("body").innerHTML();
    expect(html.length).toBeGreaterThan(200);
  });
}
