const { expect } = require('playwright/test');

const APP_READY_TIMEOUT_MS = 45_000;
const ALLOWED_FIXED_IDS = ['app-sticky-banner', 'app-version-floating', 'boot-failsafe-banner'];
const ALLOWED_FIXED_CLASS_SNIPPETS = ['app-sticky-banner', 'app-version-floating'];
const KNOWN_CLOSE_SELECTORS = [
  '#comicPreviewClose:visible',
  '#app-overlay-root:not(.hidden) [data-overlay-close]:visible',
  '#triples-radar-overlay [data-tr-action="close-overlay"]:visible',
  '#question-drill-feedback-modal-continue:visible',
  '.prism-guide-overlay:not(.hidden) [data-prism-guide-close]:visible',
  '#cbcal-modal-close:visible',
];

async function seedMobileReviewState(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('mm_onboarding_dismissed_v1', '1');
  });
}

async function dismissKnownInterrupters(page) {
  const onboarding = page.locator('#mm-onboarding').first();
  if (await onboarding.isVisible().catch(() => false)) {
    const dismissButton = page
      .locator('#mm-onboarding [data-ob-dismiss]:visible, #mm-ob-explore-btn:visible')
      .first();

    if (await dismissButton.isVisible().catch(() => false)) {
      await dismissButton.click();
      await expect(onboarding).toBeHidden({ timeout: 10_000 });
    }
  }

  for (const selector of KNOWN_CLOSE_SELECTORS) {
    const closeButton = page.locator(selector).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }
  }
}

async function waitForRouteReady(page, route) {
  await page.waitForLoadState('domcontentloaded');

  await page.waitForFunction(
    (tab) => {
      const splash = document.getElementById('splash-screen');
      const splashHidden =
        !splash ||
        splash.hidden ||
        splash.classList.contains('hidden') ||
        getComputedStyle(splash).display === 'none' ||
        getComputedStyle(splash).visibility === 'hidden';

      if (typeof window.navigateTo !== 'function' || !splashHidden) {
        return false;
      }

      if (tab === 'home') {
        return document.body?.dataset?.activeTab === 'home';
      }

      const section = document.getElementById(tab);
      if (!section) return false;

      const style = getComputedStyle(section);
      const rect = section.getBoundingClientRect();
      return (
        document.body?.dataset?.activeTab === tab &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    },
    route.tab,
    { timeout: APP_READY_TIMEOUT_MS }
  );

  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
}

async function detectBlockingOverlay(page) {
  return page.evaluate(
    ({ allowedIds, allowedClassSnippets }) => {
      const allNodes = Array.from(document.body.querySelectorAll('*'));

      for (const node of allNodes) {
        if (!(node instanceof HTMLElement)) continue;

        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const id = String(node.id || '');
        const className = typeof node.className === 'string' ? node.className : '';

        if (
          node.hidden ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.pointerEvents === 'none' ||
          Number(style.opacity || '1') === 0
        ) {
          continue;
        }

        if (style.position !== 'fixed') continue;
        if (allowedIds.includes(id)) continue;
        if (allowedClassSnippets.some((snippet) => className.includes(snippet))) continue;
        if (rect.width < window.innerWidth * 0.7) continue;
        if (rect.height < window.innerHeight * 0.55) continue;
        if (rect.top > 8 || rect.left > 8) continue;
        if (rect.right < window.innerWidth - 8 || rect.bottom < window.innerHeight - 8) continue;

        return {
          id,
          className,
          role: node.getAttribute('role') || '',
          text: String(node.textContent || '').trim().slice(0, 120),
        };
      }

      return null;
    },
    {
      allowedIds: ALLOWED_FIXED_IDS,
      allowedClassSnippets: ALLOWED_FIXED_CLASS_SNIPPETS,
    }
  );
}

async function getScrollState(page) {
  return page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    const viewportHeight = window.innerHeight;
    const scrollHeight = root.scrollHeight;
    const needsScroll = scrollHeight > viewportHeight + 24;
    const before = root.scrollTop || window.scrollY || 0;

    if (needsScroll) {
      window.scrollTo(0, Math.min(scrollHeight, Math.round(viewportHeight * 0.8)));
    }

    const after = root.scrollTop || window.scrollY || 0;
    window.scrollTo(0, 0);

    return {
      before,
      after,
      needsScroll,
      scrollHeight,
      viewportHeight,
    };
  });
}

async function captureReviewScreenshot(page, testInfo, routeId) {
  const safeProjectName = String(testInfo.project.name || 'mobile')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  const fileName = `${routeId}-${safeProjectName}-review.png`;

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(fileName),
  });
}

async function waitForAnyVisible(page, selectors, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 5_000 });
      return locator;
    } catch (_error) {
      // Try the next tolerant selector.
    }
  }

  throw new Error(`${label} was not visible. Tried selectors: ${selectors.join(', ')}`);
}

async function runMobileReview(page, testInfo, route) {
  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error?.message || String(error));
  });

  await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  await waitForRouteReady(page, route);
  await dismissKnownInterrupters(page);

  await waitForAnyVisible(page, route.headingSelectors, `${route.id} heading`);
  await waitForAnyVisible(page, route.mainSelectors, `${route.id} main content`);
  await waitForAnyVisible(page, route.primarySelectors, `${route.id} primary interaction`);

  const blockingOverlay = await detectBlockingOverlay(page);
  expect(blockingOverlay, `Blocking overlay detected on ${route.id}`).toBeNull();

  const scrollState = await getScrollState(page);
  if (scrollState.needsScroll) {
    expect(
      scrollState.after,
      `Expected ${route.id} to scroll on mobile when content exceeds the viewport`
    ).toBeGreaterThan(scrollState.before);
  }

  await captureReviewScreenshot(page, testInfo, route.id);
  expect(pageErrors, `Uncaught runtime errors on ${route.id}`).toEqual([]);
}

module.exports = {
  runMobileReview,
  seedMobileReviewState,
};
