import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

const readText = async (relativePath) => readFile(path.join(ROOT, relativePath), 'utf8');
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

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
    const [html, appJs, pkg, versionManifest] = await Promise.all([
        readText('index.html'),
        readText('js/app.js'),
        readJson('package.json'),
        readJson('version.json')
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

    const htmlVersionMatch = html.match(/\bdata-app-version="([^"]+)"/i);
    const htmlVersion = htmlVersionMatch ? htmlVersionMatch[1].trim() : '';
    const htmlBuildTimeMatch = html.match(/\bdata-build-time="([^"]+)"/i);
    const htmlBuildTime = htmlBuildTimeMatch ? htmlBuildTimeMatch[1].trim() : '';
    const packageVersion = String(pkg?.version || '').trim();
    const manifestVersion = String(versionManifest?.version || '').trim();
    const manifestBuildTime = String(versionManifest?.buildTime || '').trim();

    const floatingVersionPlaceholder = (html.match(/<div\b[^>]*id="app-version-floating"[^>]*>([^<]*)<\/div>/i) || [null, ''])[1].trim();
    const chipVersionPlaceholder = (html.match(/<p\b[^>]*id="app-version-chip"[^>]*>([^<]*)<\/p>/i) || [null, ''])[1].trim();
    const hebrewVersionWord = '\u05d2\u05e8\u05e1\u05d4';

    const likelyMojibakePatterns = [
        /[׳×][\u0080-\u00FF\u0192\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC\u2013-\u2026\u2030\u2039\u203A\u20AC\u2122]/u,
        /[\u05D0-\u05EA][\u0080-\u009F][\u0080-\u00FF\u0192\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC\u2013-\u2026\u2030\u2039\u203A\u20AC\u2122]/u
    ];
    const mojibakeHits = likelyMojibakePatterns
        .map((pattern) => html.match(pattern))
        .filter(Boolean);

    const failures = [];
    if (!tabIds.length) failures.push('No .tab-btn[data-tab] buttons found in index.html');
    if (missingTabTargets.length) failures.push(`Tabs without matching <section id>: ${missingTabTargets.join(', ')}`);
    if (missingInlineFns.length) failures.push(`Inline onclick functions missing in js/app.js: ${missingInlineFns.join(', ')}`);
    if (duplicateIds.length) failures.push(`Duplicate HTML ids detected: ${duplicateIds.join(', ')}`);
    if (missingScripts.length) failures.push(`Missing expected scriptQueue entries: ${missingScripts.join(', ')}`);
    if (!packageVersion) failures.push('package.json version is missing');
    if (!htmlVersion) failures.push('index.html data-app-version is missing');
    if (!htmlBuildTime) failures.push('index.html data-build-time is missing');
    if (!manifestVersion) failures.push('version.json version is missing');
    if (!manifestBuildTime) failures.push('version.json buildTime is missing');
    if (packageVersion && htmlVersion && packageVersion !== htmlVersion) {
        failures.push(`index.html data-app-version (${htmlVersion}) does not match package.json version (${packageVersion})`);
    }
    if (packageVersion && manifestVersion && packageVersion !== manifestVersion) {
        failures.push(`version.json version (${manifestVersion}) does not match package.json version (${packageVersion})`);
    }
    if (htmlBuildTime && manifestBuildTime && htmlBuildTime !== manifestBuildTime) {
        failures.push(`version.json buildTime (${manifestBuildTime}) does not match index.html data-build-time (${htmlBuildTime})`);
    }
    if (!floatingVersionPlaceholder.includes(hebrewVersionWord)) {
        failures.push('Floating version placeholder is missing a clear "גרסה" label');
    }
    if (!chipVersionPlaceholder.includes(hebrewVersionWord)) {
        failures.push('Home version placeholder is missing a clear "גרסה" label');
    }
    if (mojibakeHits.length) {
        failures.push(`Likely mojibake detected in index.html near ${JSON.stringify(mojibakeHits[0][0])}`);
    }

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
