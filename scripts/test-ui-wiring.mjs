import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

const readText = async (relativePath) => readFile(path.join(ROOT, relativePath), 'utf8');

function collectMatches(source, regex, groupIndex = 1) {
    const out = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
        out.push(match[groupIndex]);
    }
    return out;
}

function unique(values) {
    return [...new Set(values)];
}

try {
    const [html, appJs] = await Promise.all([
        readText('index.html'),
        readText('js/app.js')
    ]);

    const tabIds = unique(collectMatches(
        html,
        /<button\b[^>]*class="[^"]*\btab-btn\b[^"]*"[^>]*data-tab="([^"]+)"/gi
    ));
    const sectionIds = new Set(collectMatches(html, /<section\b[^>]*id="([^"]+)"/gi));
    const missingTabTargets = tabIds.filter((id) => !sectionIds.has(id));

    const onclickCalls = collectMatches(html, /onclick="([^"]+)"/gi);
    const inlineFunctionNames = unique(onclickCalls
        .map((expr) => String(expr || '').trim())
        .filter((expr) => expr && !expr.startsWith('window.'))
        .map((expr) => {
            const match = expr.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
            return match ? match[1] : '';
        })
        .filter(Boolean));

    const missingInlineFns = inlineFunctionNames.filter((fnName) => {
        const pattern = new RegExp(`\\b(?:async\\s+)?function\\s+${fnName}\\s*\\(`);
        return !pattern.test(appJs);
    });

    const allIds = collectMatches(html, /\bid="([^"]+)"/gi);
    const duplicateIds = unique(allIds.filter((id, index) => allIds.indexOf(id) !== index));

    const scriptQueueExpected = [
        'js/hebrew-sanitize.js',
        'js/wr2w-path-core.js',
        'js/triples-radar-core.js',
        'js/app.js',
        'js/triples-radar.js'
    ];
    const missingScripts = scriptQueueExpected.filter(
        (scriptPath) => !html.includes(`'${scriptPath}'`) && !html.includes(`"${scriptPath}"`)
    );

    const failures = [];
    if (!tabIds.length) failures.push('No .tab-btn[data-tab] buttons found in index.html');
    if (missingTabTargets.length) failures.push(`Tabs without matching <section id>: ${missingTabTargets.join(', ')}`);
    if (missingInlineFns.length) failures.push(`Inline onclick functions missing in js/app.js: ${missingInlineFns.join(', ')}`);
    if (duplicateIds.length) failures.push(`Duplicate HTML ids detected: ${duplicateIds.join(', ')}`);
    if (missingScripts.length) failures.push(`Missing expected scriptQueue entries: ${missingScripts.join(', ')}`);

    if (failures.length) {
        console.error('FAIL: UI wiring sanity test failed.');
        failures.forEach((line) => console.error(`- ${line}`));
        process.exitCode = 1;
    } else {
        console.log(`PASS: UI wiring sanity verified (${tabIds.length} tabs, ${inlineFunctionNames.length} inline handlers).`);
    }
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
}
