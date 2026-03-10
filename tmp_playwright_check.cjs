const { chromium } = require('playwright');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function waitForApp(page) {
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForFunction(() => window.MetaAppShell && typeof window.MetaAppShell.openHomeMenu === 'function' && typeof window.navigateTo === 'function');
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const results = [];

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await waitForApp(desktop);
    await desktop.evaluate(() => window.MetaAppShell.openHomeMenu());
    await desktop.locator('.home-shell-menu-clone').waitFor();
    await desktop.locator('.home-shell-menu-clone [data-global-feature-menu-select="in-app"]').selectOption('tab:practice-question');
    await desktop.waitForFunction(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab') === 'practice-question');
    await desktop.locator('#question-drill-start-session').click();
    await desktop.locator('#question-drill-options .question-drill-option').first().waitFor();

    const desktopQuestion = await desktop.evaluate(() => ({
        gridCols: getComputedStyle(document.querySelector('.question-drill-live-grid')).gridTemplateColumns.trim().split(/\s+/).length,
        hasTargetBar: Boolean(document.querySelector('#question-drill-target-bar')) && !document.querySelector('#question-drill-target-bar').classList.contains('hidden'),
        badgeCount: document.querySelectorAll('#question-drill-options .question-drill-option-category').length,
        hudVisible: Boolean(document.querySelector('#question-drill-game-hud')) && !document.querySelector('#question-drill-game-hud').classList.contains('hidden')
    }));

    assert(desktopQuestion.gridCols === 2, `desktop question-drill grid expected 2 columns, got ${desktopQuestion.gridCols}`);
    assert(desktopQuestion.hasTargetBar, 'desktop question-drill target bar should be visible');
    assert(desktopQuestion.badgeCount === 0, `desktop question-drill should not render category badges, got ${desktopQuestion.badgeCount}`);
    assert(desktopQuestion.hudVisible, 'desktop question-drill HUD should be visible');
    results.push({ scope: 'desktop-question', ...desktopQuestion });

    await desktop.evaluate(() => window.navigateTo('categories'));
    await desktop.waitForFunction(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab') === 'categories');
    await desktop.locator('.glossary-card').first().waitFor();

    const duplicatePillCards = await desktop.evaluate(() => Array.from(document.querySelectorAll('.glossary-card')).filter((card) => {
        const pills = Array.from(card.querySelectorAll('.glossary-pills .glossary-pill-en'))
            .map((el) => (el.textContent || '').trim())
            .filter(Boolean);
        return new Set(pills).size !== pills.length;
    }).length);

    assert(duplicatePillCards === 0, `found ${duplicatePillCards} glossary cards with duplicate English pills`);
    results.push({ scope: 'desktop-categories', duplicatePillCards });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await waitForApp(mobile);
    await mobile.evaluate(() => window.MetaAppShell.openHomeMenu());
    await mobile.locator('.home-shell-menu-clone').waitFor();
    await mobile.locator('.home-shell-menu-clone [data-global-feature-menu-select="in-app"]').selectOption('tab:practice-question');
    await mobile.waitForFunction(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab') === 'practice-question');
    await mobile.locator('#question-drill-start-session').click();
    await mobile.locator('#question-drill-options .question-drill-option').first().waitFor();

    const mobileQuestion = await mobile.evaluate(() => ({
        gridCols: getComputedStyle(document.querySelector('.question-drill-live-grid')).gridTemplateColumns.trim().split(/\s+/).length,
        hasTargetBar: Boolean(document.querySelector('#question-drill-target-bar')) && !document.querySelector('#question-drill-target-bar').classList.contains('hidden'),
        badgeCount: document.querySelectorAll('#question-drill-options .question-drill-option-category').length
    }));

    assert(mobileQuestion.gridCols === 1, `mobile question-drill grid expected 1 column, got ${mobileQuestion.gridCols}`);
    assert(mobileQuestion.hasTargetBar, 'mobile question-drill target bar should be visible');
    assert(mobileQuestion.badgeCount === 0, `mobile question-drill should not render category badges, got ${mobileQuestion.badgeCount}`);
    results.push({ scope: 'mobile-question', ...mobileQuestion });

    await mobile.evaluate(() => window.navigateTo('practice-radar'));
    await mobile.waitForFunction(() => document.querySelector('.tab-btn.active')?.getAttribute('data-tab') === 'practice-radar');

    const mobileRadar = await mobile.evaluate(() => ({
        buttonCount: document.querySelectorAll('#rapid-pattern-buttons .rapid-pattern-btn').length,
        gridCols: getComputedStyle(document.querySelector('#rapid-pattern-buttons')).gridTemplateColumns.trim().split(/\s+/).length
    }));

    assert(mobileRadar.buttonCount === 15, `mobile radar expected 15 Breen buttons, got ${mobileRadar.buttonCount}`);
    assert(mobileRadar.gridCols === 3, `mobile radar expected 3 columns, got ${mobileRadar.gridCols}`);
    results.push({ scope: 'mobile-radar', ...mobileRadar });

    await browser.close();
    console.log(JSON.stringify({ ok: true, results }, null, 2));
}

run().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
});
