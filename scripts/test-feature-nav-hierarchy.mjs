import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

const readText = async (relativePath) => readFile(path.join(ROOT, relativePath), 'utf8');

function expectIncludes(source, needle, failures, label) {
    if (!source.includes(needle)) failures.push(label);
}

try {
    const [html, appJs, shellJs, sentenceMapJs, navMapJs, appShellJs] = await Promise.all([
        readText('index.html'),
        readText('js/app.js'),
        readText('js/meta-redesign-shell.js'),
        readText('js/sentence-map.js'),
        readText('js/nav-map.js'),
        readText('js/app-shell.js')
    ]);

    const failures = [];

    expectIncludes(
        html,
        'button class="tab-btn" data-tab="sentence-map"',
        failures,
        'Missing primary tab button for sentence-map in index.html'
    );
    expectIncludes(
        html,
        'button class="tab-btn" data-tab="prismlab"',
        failures,
        'Missing primary tab button for prismlab in index.html'
    );

    expectIncludes(
        appJs,
        "navigateHierarchicalBack('home');",
        failures,
        'Sticky/local back is not wired to hierarchical back in js/app.js'
    );
    expectIncludes(
        appJs,
        "window.navigateHierarchicalBack = navigateHierarchicalBack;",
        failures,
        'Hierarchical back is not exposed globally in js/app.js'
    );
    expectIncludes(
        appJs,
        "featureEntry: 'welcome'",
        failures,
        'Feature launchers are not forcing welcome entry in js/app.js'
    );
    expectIncludes(
        appJs,
        "featureEntry: 'preserve'",
        failures,
        'Preserve-mode navigation hooks are missing in js/app.js'
    );
    expectIncludes(
        appJs,
        "syncManagedFeatureEntryMode(resolvedTab, featureEntry);",
        failures,
        'navigateTo does not sync managed feature entry state in js/app.js'
    );
    expectIncludes(
        appJs,
        "const featureEntry = normalizeFeatureEntryMode(",
        failures,
        'navigateTo does not normalize feature entry mode in js/app.js'
    );
    expectIncludes(
        appJs,
        "const hasHierarchicalBack = canNavigateHierarchicalBack(currentTab);",
        failures,
        'Back controls still appear to rely on non-hierarchical state in js/app.js'
    );

    expectIncludes(
        shellJs,
        "function prepareManagedFeatureEntry(tabName, options)",
        failures,
        'Managed feature entry preparation helper is missing in js/meta-redesign-shell.js'
    );
    expectIncludes(
        shellJs,
        "function canStepBackHierarchy(tabName)",
        failures,
        'Managed feature back capability helper is missing in js/meta-redesign-shell.js'
    );
    expectIncludes(
        shellJs,
        "function stepBackHierarchy(tabName)",
        failures,
        'Managed feature hierarchical back helper is missing in js/meta-redesign-shell.js'
    );
    expectIncludes(
        shellJs,
        "if (typeof window.navigateHierarchicalBack === 'function' && window.navigateHierarchicalBack('home')) return;",
        failures,
        'Feature chrome back is not delegating to hierarchical back in js/meta-redesign-shell.js'
    );
    expectIncludes(
        shellJs,
        "window.MetaFeatureShell = Object.assign(window.MetaFeatureShell || {}, {",
        failures,
        'MetaFeatureShell API is not exposed in js/meta-redesign-shell.js'
    );

    expectIncludes(
        sentenceMapJs,
        "global.__metaFeatureControllers['sentence-map'] = {",
        failures,
        'sentence-map does not register a feature controller in js/sentence-map.js'
    );
    expectIncludes(
        sentenceMapJs,
        "canStepBack() {",
        failures,
        'sentence-map controller is missing canStepBack in js/sentence-map.js'
    );
    expectIncludes(
        sentenceMapJs,
        "restartCurrentCase()",
        failures,
        'sentence-map restart helper is missing in js/sentence-map.js'
    );

    expectIncludes(
        navMapJs,
        "global.navigateTo(entry.tab, { featureEntry: opts.featureEntry || 'welcome' });",
        failures,
        'nav-map tab routing does not force feature welcome entry in js/nav-map.js'
    );
    expectIncludes(
        appShellJs,
        "featureEntry: 'preserve'",
        failures,
        'app-shell resume flow does not preserve feature state in js/app-shell.js'
    );

    if (failures.length) {
        console.error('FAIL: feature navigation hierarchy regression failed.');
        failures.forEach((failure) => console.error(`- ${failure}`));
        process.exitCode = 1;
    } else {
        console.log('PASS: feature navigation hierarchy regression verified.');
    }
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
}
