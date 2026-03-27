import { expect, type Page, type TestInfo } from 'playwright/test';

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

export type MobileReviewRoute = {
  id: string;
  name: string;
  path: string;
  tab: string;
  headingSelectors: string[];
  mainSelectors: string[];
  primarySelectors: string[];
};

type OverlayProbeResult = {
  id: string;
  className: string;
  role: string;
  text: string;
} | null;

type ScrollState = {
  before: number;
  after: number;
  needsScroll: boolean;
  scrollHeight: number;
  viewportHeight: number;
};

export async function seedMobileReviewState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('mm_onboarding_dismissed_v1', '1');
    window.localStorage.setItem('mm_onboarding_dismissed_v2', '1');
    window.localStorage.setItem('mm_onboarding_done', '1');
    window.localStorage.setItem('onboarding_complete', '1');
  });
}

export async function runMobileReview(page: Page, testInfo: TestInfo, route: MobileReviewRoute): Promise<void> {
  const pageErrors: string[] = [];
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

async function dismissKnownInterrupters(page: Page): Promise<void> {
  const onboardingDismissed = await page.evaluate(() => {
    const overlay = document.getElementById('mm-onboarding');
    if (!overlay) return true;

    const style = getComputedStyle(overlay);
    const rect = overlay.getBoundingClientRect();
    const isVisible =
      !overlay.hidden &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.pointerEvents !== 'none' &&
      rect.width > 0 &&
      rect.height > 0;

    if (!isVisible) return true;

    const dismissButton =
      overlay.querySelector('[data-ob-dismiss]') || document.getElementById('mm-ob-explore-btn');

    if (!(dismissButton instanceof HTMLElement)) {
      return false;
    }

    dismissButton.click();
    return true;
  });

  if (!onboardingDismissed) {
    throw new Error('Onboarding overlay was visible but no dismiss control was available.');
  }

  await page
    .waitForFunction(() => {
      const overlay = document.getElementById('mm-onboarding');
      if (!overlay) return true;

      const style = getComputedStyle(overlay);
      return (
        overlay.hidden ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.pointerEvents === 'none'
      );
    }, null, { timeout: 10_000 })
    .catch(() => {});

  for (const selector of KNOWN_CLOSE_SELECTORS) {
    const closeButton = page.locator(selector).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }
  }
}

async function waitForRouteReady(page: Page, route: MobileReviewRoute): Promise<void> {
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

async function waitForAnyVisible(page: Page, selectors: string[], label: string) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (await candidate.isVisible().catch(() => false)) {
          return candidate;
        }
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`${label} was not visible. Tried selectors: ${selectors.join(', ')}`);
}

async function detectBlockingOverlay(page: Page): Promise<OverlayProbeResult> {
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

async function getScrollState(page: Page): Promise<ScrollState> {
  return page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    const viewportHeight = window.innerHeight;
    const scrollHeight = root.scrollHeight;
    const needsScroll = scrollHeight > viewportHeight + 24;

    window.scrollTo(0, 0);
    const before = root.scrollTop || window.scrollY || 0;

    if (needsScroll) {
      window.scrollTo(
        0,
        Math.min(Math.max(scrollHeight - viewportHeight, 0), Math.round(viewportHeight * 0.8))
      );
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

async function captureReviewScreenshot(page: Page, testInfo: TestInfo, routeId: string): Promise<void> {
  const safeProjectName = String(testInfo.project.name || 'mobile')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  const fileName = `${routeId}-${safeProjectName}-review.png`;

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(fileName),
  });
}
