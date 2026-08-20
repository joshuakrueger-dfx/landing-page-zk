import { expect, test } from '@playwright/test';
import { VIEWS, projectsForView } from '../scripts/lib/pages.mjs';
import { installVisualDeterminism, settle, openAllFaq } from './helpers.mjs';

const STATE_SETUP = {
  faqOpen: openAllFaq,
};

test.describe('visual regression', () => {
  for (const view of VIEWS) {
    test(`${view.slug}`, async ({ page }, testInfo) => {
      test.skip(
        !projectsForView(view).includes(testInfo.project.name),
        `view "${view.slug}" does not apply to ${testInfo.project.name}`,
      );

      await installVisualDeterminism(page);
      await page.goto(view.path, { waitUntil: 'load' });
      await settle(page);

      if (view.state) {
        await STATE_SETUP[view.state](page);
        // A second settle() after state setup empirically ended the 30px
        // fullPage height oscillation (2 consecutive red runs, then 3 green);
        // the cause is unproven. The call includes a full scroll + rest.
        // The wait in openAllFaq covers the reflow right after opening,
        // not this later pass.
        await settle(page);
      }

      // The page has no <video>/<canvas> and no non-deterministic media, so the
      // full-page shot needs no masking.
      await expect(page).toHaveScreenshot(`${view.slug}.png`, { fullPage: true });
    });
  }
});
