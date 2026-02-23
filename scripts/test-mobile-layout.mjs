import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();

const mustContain = (label, source, regex) => {
    if (!regex.test(source)) {
        throw new Error(`Missing expected rule: ${label}`);
    }
};

const readText = async (relativePath) => {
    const fullPath = path.join(projectRoot, relativePath);
    return readFile(fullPath, 'utf8');
};

const resolvePrimaryHtmlPath = async () => {
    try {
        await readText('index.html');
        return 'index.html';
    } catch (error) {
        await readText('index2.html');
        return 'index2.html';
    }
};

try {
    const htmlPath = await resolvePrimaryHtmlPath();
    const [html, css, js] = await Promise.all([
        readText(htmlPath),
        readText('css/style.css'),
        readText('js/app.js')
    ]);

    mustContain(
        'viewport meta tag',
        html,
        /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1\.0">/i
    );

    mustContain('dynamic viewport css variable', css, /--app-dvh:\s*100dvh;/);
    mustContain('safe area top variable', css, /--safe-top:\s*env\(safe-area-inset-top,\s*0px\);/);
    mustContain('mobile fullscreen media query', css, /@media\s*\(max-width:\s*768px\)\s*\{/);
    mustContain('mobile body zero padding', css, /@media\s*\(max-width:\s*768px\)[\s\S]*?body\s*\{\s*padding:\s*0;\s*\}/);
    mustContain('mobile container full height', css, /@media\s*\(max-width:\s*768px\)[\s\S]*?\.container\s*\{[\s\S]*?min-height:\s*var\(--app-dvh\);/);
    mustContain(
        'mobile tab content safe-area padding',
        css,
        /@media\s*\(max-width:\s*768px\)[\s\S]*?\.tab-content\s*\{[\s\S]*?var\(--safe-bottom\)/
    );

    mustContain('viewport sizing setup function', js, /function\s+setupMobileViewportSizing\s*\(/);
    mustContain('viewport css var update in js', js, /setProperty\('--app-dvh',\s*`\$\{height\}px`\)/);
    mustContain('viewport sizing called inside app init', js, /initializeMetaModelApp[\s\S]*setupMobileViewportSizing\(\)/);
    mustContain(
        'app init wired for dynamic script load path',
        js,
        /document\.addEventListener\('DOMContentLoaded',\s*initializeMetaModelApp[\s\S]*queueMicrotask\(initializeMetaModelApp\)|document\.addEventListener\('DOMContentLoaded',\s*initializeMetaModelApp[\s\S]*setTimeout\(initializeMetaModelApp,\s*0\)/,
    );

    console.log(`PASS: mobile fullscreen and viewport rules verified (${htmlPath}).`);
} catch (error) {
    console.error('FAIL:', error.message);
    process.exitCode = 1;
}
