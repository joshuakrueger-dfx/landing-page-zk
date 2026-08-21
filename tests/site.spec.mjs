import { expect, test } from '@playwright/test';
import { PAGES } from '../scripts/lib/pages.mjs';
import { blockExternalNoise, installVisualDeterminism } from './helpers.mjs';

test.describe('static site smoke checks', () => {
  for (const path of PAGES) {
    test(`${path} loads, renders and has no uncaught script errors`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await blockExternalNoise(page);

      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();

      await expect(page.locator('body')).toBeVisible();

      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);

      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang.trim().length).toBeGreaterThan(0);

      const overflow = await page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const viewportWidth = document.documentElement.clientWidth;
        return documentWidth - viewportWidth;
      });
      expect(overflow).toBeLessThanOrEqual(2);

      expect(pageErrors).toEqual([]);
    });
  }
});

// Classic scrollbars steal ~15px of column width when they appear or vanish
// (fullPage resizes the viewport to the content height). Neutralisation lives
// in installVisualDeterminism; this is the proof it actually took effect.
test.describe('scrollbar neutralization', () => {
  for (const path of PAGES) {
    test(`${path} scrollbar takes no layout width`, async ({ page }) => {
      await installVisualDeterminism(page);

      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('body')).toBeVisible();

      const { gutter, innerWidth, clientWidth } = await page.evaluate(() => {
        const innerWidth = window.innerWidth;
        const clientWidth = document.documentElement.clientWidth;
        return { gutter: innerWidth - clientWidth, innerWidth, clientWidth };
      });
      expect(
        gutter,
        `scrollbar took ${gutter}px of layout width (innerWidth=${innerWidth}, clientWidth=${clientWidth})`,
      ).toBe(0);
    });
  }
});
