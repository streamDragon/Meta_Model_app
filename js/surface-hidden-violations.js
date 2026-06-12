(function () {
  'use strict';

  var STYLE_ID = 'surface-hidden-violations-style';
  var STRIP_CLASS = 'surface-hidden-legacy-strip';

  var copy = {
    title: 'גלוי ונסתר בכל הפרה',
    surfaceTitle: 'הפרה עיקרית / גלויה',
    surfaceBody: 'מה שנמצא במילים עצמן: מילה, מבנה או טריגר שאפשר להצביע עליו.',
    hiddenTitle: 'הפרה מסתתרת',
    hiddenBody: 'מה שהמקשיב עשוי להשלים מהטון, מהשלכה או מהמשפט המלא המשתמע.',
    note: 'הנסתר הוא קריאה אפשרית, לא עובדה על האדם. לכן מפרידים: מה נאמר בפועל, ומה אני מוסיף או מפרש?'
  };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.' + STRIP_CLASS + '{margin:16px auto;padding:14px 16px;border:1px solid rgba(37,99,235,.18);border-inline-start:4px solid #2563eb;border-radius:16px;background:rgba(255,255,255,.94);box-shadow:0 12px 28px rgba(15,23,42,.08);font-family:inherit;color:#10243b;max-width:1120px;}',
      '.' + STRIP_CLASS + ' strong{display:block;font-size:1rem;margin-bottom:8px;}',
      '.' + STRIP_CLASS + ' .surface-hidden-legacy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.' + STRIP_CLASS + ' .surface-hidden-legacy-cell{padding:10px 12px;border-radius:12px;background:rgba(241,245,249,.92);border:1px solid rgba(148,163,184,.2);}',
      '.' + STRIP_CLASS + ' .surface-hidden-legacy-cell b{display:block;margin-bottom:4px;color:#1e3a8a;}',
      '.' + STRIP_CLASS + ' p{margin:0;color:#4e647c;line-height:1.65;font-size:.92rem;}',
      '.' + STRIP_CLASS + ' .surface-hidden-legacy-note{margin-top:10px;}',
      '@media(max-width:760px){.' + STRIP_CLASS + ' .surface-hidden-legacy-grid{grid-template-columns:1fr;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function renderStrip(options) {
    var localCopy = Object.assign({}, copy, options || {});
    var section = document.createElement('section');
    section.className = STRIP_CLASS;
    section.setAttribute('data-surface-hidden-strip', '1');
    section.setAttribute('aria-label', localCopy.title);
    section.innerHTML = [
      '<strong>' + localCopy.title + '</strong>',
      '<div class="surface-hidden-legacy-grid">',
      '<div class="surface-hidden-legacy-cell"><b>' + localCopy.surfaceTitle + '</b><p>' + localCopy.surfaceBody + '</p></div>',
      '<div class="surface-hidden-legacy-cell"><b>' + localCopy.hiddenTitle + '</b><p>' + localCopy.hiddenBody + '</p></div>',
      '</div>',
      '<p class="surface-hidden-legacy-note">' + localCopy.note + '</p>'
    ].join('');
    return section;
  }

  function mount(target, options) {
    var host = target || document.querySelector('[data-surface-hidden-host]') || document.querySelector('#trainerContent .container') || document.querySelector('main') || document.body;
    if (!host || host.querySelector('[data-surface-hidden-strip="1"]')) return false;
    injectStyle();
    host.insertBefore(renderStrip(options), host.firstChild);
    return true;
  }

  function describeBreenItem(item) {
    item = item || {};
    var primaryQuestion = '';
    if (item.questions && item.primary_violation && item.questions[item.primary_violation]) {
      primaryQuestion = item.questions[item.primary_violation].question || '';
    }
    return {
      surface: {
        label: copy.surfaceTitle,
        value: item.primary_violation || '',
        question: primaryQuestion
      },
      hidden: {
        label: copy.hiddenTitle,
        value: item.implied_full || '',
        note: copy.note
      }
    };
  }

  function autoMount() {
    if (document.body && document.body.hasAttribute('data-no-surface-hidden')) return true;
    return mount();
  }

  window.MetaSurfaceHiddenViolations = {
    copy: copy,
    describeBreenItem: describeBreenItem,
    renderStrip: renderStrip,
    mount: mount
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function () {
      if (autoMount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 5000);
  }
})();
