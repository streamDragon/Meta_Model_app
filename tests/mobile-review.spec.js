const { test } = require('playwright/test');
const { runMobileReview, seedMobileReviewState } = require('./helpers/mobile-review');

const reviewRoutes = [
  {
    id: 'home',
    name: 'home stays usable on mobile',
    path: '/',
    tab: 'home',
    headingSelectors: ['header h1', '#home .mobile-feed-launchpad-title'],
    mainSelectors: ['#home .product-family-card', '#home .product-tool-entry', '#mobile-feed-home:not([hidden])'],
    primarySelectors: ['#home [data-nav-key="sentenceMap"]', '#home [data-nav-key="categories"]', '#home .product-tool-entry'],
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
      '#sentence-map-app .sentence-map-overview-grid',
      '#sentence-map-app .sentence-map-case-selector',
      '#sentence-map-app .sentence-map-stepper-block',
      '#sentence-map-app .sentence-map-empty',
    ],
    primarySelectors: [
      '#sentence-map-app .sentence-map-case-card',
      '#sentence-map-app [data-action="next-case"]',
      '#sentence-map-app button',
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
