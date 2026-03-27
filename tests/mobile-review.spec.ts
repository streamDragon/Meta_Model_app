import { test } from 'playwright/test';
import { runMobileReview, seedMobileReviewState, type MobileReviewRoute } from './helpers/mobile-review';

const reviewRoutes: MobileReviewRoute[] = [
  {
    id: 'home',
    name: 'home stays usable on mobile',
    path: '/',
    tab: 'home',
    headingSelectors: ['article h2', '#app-sticky-current-title', 'header h1', '#home .mobile-feed-launchpad-title'],
    mainSelectors: ['article[aria-label]', '#home article', '#home .product-family-card', '#mobile-feed-home:not([hidden])'],
    primarySelectors: ['article button', '#home .product-tool-entry', '#home button'],
  },
  {
    id: 'categories',
    name: 'categories entry stays usable on mobile',
    path: '/feature/categories',
    tab: 'categories',
    headingSelectors: ['#categories-container h2'],
    mainSelectors: ['#categories-container .categories-glossary-intro', '#categories-container .categories-glossary-ordered-list'],
    primarySelectors: [
      '#categories-container [data-breen-pattern-link]',
      '#categories-container .categories-glossary-chip',
      '#categories-container .categories-glossary-ordered-list summary',
    ],
  },
  {
    id: 'sentence-map',
    name: 'sentence map stays usable on mobile',
    path: '/feature/sentence-map',
    tab: 'sentence-map',
    headingSelectors: ['#sentence-map h2'],
    mainSelectors: [
      '#sentence-map .meta-feature-shell__frame',
      '#sentence-map [data-feature-enter="sentence-map"]',
      '#sentence-map .practice-intro-card',
      '#sentence-map-app .sentence-map-overview-grid',
      '#sentence-map-app .sentence-map-case-selector',
      '#sentence-map-app .sentence-map-stepper-block',
      '#sentence-map-app .sentence-map-empty',
    ],
    primarySelectors: [
      '#sentence-map [data-feature-enter="sentence-map"]',
      '#sentence-map-app .sentence-map-case-card',
      '#sentence-map-app [data-action="next-case"]',
      '#sentence-map-app button',
      '#sentence-map button',
    ],
  },
];

test.describe('mobile product review', () => {
  test.beforeEach(async ({ page }) => {
    await seedMobileReviewState(page);
  });

  for (const route of reviewRoutes) {
    test(route.name, async ({ page }, testInfo) => {
      await runMobileReview(page, testInfo, route);
    });
  }
});
