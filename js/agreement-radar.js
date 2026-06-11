(function initAgreementRadar(global) {
  'use strict';

  if (global.AgreementRadar) return;

  var STYLE_ID = 'agreement-radar-style';
  var SEGMENT_ORDER = ['camera', 'sequence', 'trigger', 'protection', 'mechanism', 'detailed'];
  var SEGMENT_META = Object.freeze({
    camera: { label: 'Camera / Physical', color: '#0ea5e9' },
    sequence: { label: 'Steps / Sequence', color: '#14b8a6' },
    trigger: { label: 'Trigger', color: '#f59e0b' },
    protection: { label: 'Protection', color: '#a855f7' },
    mechanism: { label: 'Mechanism', color: '#ec4899' },
    detailed: { label: 'Detailed Action', color: '#22c55e' }
  });

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.agreement-radar { display:grid; gap:10px; align-items:center; justify-items:center; }',
      '.agreement-radar[data-mode="compact"] { gap:8px; }',
      '.agreement-radar__svg { display:block; width:100%; max-width:360px; height:auto; }',
      '.agreement-radar__arc { stroke-linecap:round; transition: opacity 180ms ease, filter 180ms ease; }',
      '.agreement-radar__arc--inactive { opacity:0.28; }',
      '.agreement-radar__arc--active { opacity:1; filter: drop-shadow(0 0 5px rgba(34,197,94,0.22)); }',
      '.agreement-radar__arc--hidden { opacity:0.12; stroke-dasharray:7 5; }',
      '.agreement-radar__center { fill:#ffffff; stroke:#bfdbfe; stroke-width:2; }',
      '.agreement-radar__center-label { font:700 12px "Segoe UI",Arial,sans-serif; fill:#1e3a5f; text-anchor:middle; dominant-baseline:middle; }',
      '.agreement-radar[data-mode="expanded"] .agreement-radar__center-label, .agreement-radar[data-mode="static"] .agreement-radar__center-label { font-size:14px; }',
      '.agreement-radar__legend { list-style:none; margin:0; padding:0; width:100%; display:grid; gap:6px; }',
      '.agreement-radar[data-mode="compact"] .agreement-radar__legend { grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }',
      '.agreement-radar__legend-item { display:flex; align-items:center; gap:6px; border:1px solid #dbeafe; background:#f8fbff; border-radius:10px; padding:5px 7px; min-height:34px; }',
      '.agreement-radar__legend-item[data-hidden="true"] { opacity:0.55; border-style:dashed; }',
      '.agreement-radar__dot { width:10px; height:10px; border-radius:50%; flex:0 0 10px; }',
      '.agreement-radar__legend-text { display:grid; gap:1px; min-width:0; }',
      '.agreement-radar__legend-label { font:700 12px "Segoe UI",Arial,sans-serif; color:#1e3a5f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.agreement-radar__legend-chip { font:600 11px "Segoe UI",Arial,sans-serif; color:#4a647d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'
    ].join('');
    document.head.appendChild(style);
  }

  function toPolar(cx, cy, r, angleDeg) {
    var angle = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + (r * Math.cos(angle)),
      y: cy + (r * Math.sin(angle))
    };
  }

  function arcPath(cx, cy, innerR, outerR, startAngle, endAngle) {
    var startOuter = toPolar(cx, cy, outerR, startAngle);
    var endOuter = toPolar(cx, cy, outerR, endAngle);
    var startInner = toPolar(cx, cy, innerR, endAngle);
    var endInner = toPolar(cx, cy, innerR, startAngle);
    var largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', startOuter.x, startOuter.y,
      'A', outerR, outerR, 0, largeArc, 1, endOuter.x, endOuter.y,
      'L', startInner.x, startInner.y,
      'A', innerR, innerR, 0, largeArc, 0, endInner.x, endInner.y,
      'Z'
    ].join(' ');
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function shortenChip(value) {
    var text = normalizeText(value);
    if (!text) return '—';
    var words = text.split(' ').filter(Boolean).slice(0, 2);
    var compact = words.join(' ');
    return compact.length > 20 ? compact.slice(0, 20) + '…' : compact;
  }

  function normalizeSegments(source, targetType) {
    var map = Object.create(null);
    (Array.isArray(source) ? source : []).forEach(function (segment) {
      if (!segment || !segment.id) return;
      map[segment.id] = segment;
    });

    return SEGMENT_ORDER.map(function (id) {
      var incoming = map[id] || {};
      var defaultVisible = id === 'camera' || id === 'sequence' || id === 'detailed' || targetType === 'unconscious';
      return {
        id: id,
        label: incoming.label || SEGMENT_META[id].label,
        color: incoming.color || SEGMENT_META[id].color,
        active: !!incoming.active,
        visible: typeof incoming.visible === 'boolean' ? incoming.visible : defaultVisible,
        chip: shortenChip(incoming.chip)
      };
    });
  }

  function buildRadar(rootNode, options) {
    injectStyleOnce();

    var mode = options.mode || 'compact';
    var targetType = options.targetType === 'unconscious' ? 'unconscious' : 'conscious';
    var size = mode === 'compact' ? 200 : 330;
    var outerR = size * 0.46;
    var innerR = size * 0.30;
    var centerR = size * 0.21;
    var step = 360 / SEGMENT_ORDER.length;
    var segments = normalizeSegments(options.segments, targetType);

    rootNode.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'agreement-radar';
    wrapper.setAttribute('data-mode', mode);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('class', 'agreement-radar__svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.ariaLabel || 'Agreement Radar');

    segments.forEach(function (segment, index) {
      var start = -90 + (index * step);
      var end = start + step - 3;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(size / 2, size / 2, innerR, outerR, start, end));
      path.setAttribute('fill', segment.color);
      path.setAttribute('class', 'agreement-radar__arc ' + (segment.visible ? (segment.active ? 'agreement-radar__arc--active' : 'agreement-radar__arc--inactive') : 'agreement-radar__arc--hidden'));
      var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = segment.label + ': ' + segment.chip;
      path.appendChild(title);
      svg.appendChild(path);
    });

    var center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    center.setAttribute('class', 'agreement-radar__center');
    center.setAttribute('cx', String(size / 2));
    center.setAttribute('cy', String(size / 2));
    center.setAttribute('r', String(centerR));
    svg.appendChild(center);

    var centerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerLabel.setAttribute('x', String(size / 2));
    centerLabel.setAttribute('y', String(size / 2));
    centerLabel.setAttribute('class', 'agreement-radar__center-label');
    centerLabel.textContent = normalizeText(options.centerLabel) || 'ZIP Verb';
    svg.appendChild(centerLabel);

    wrapper.appendChild(svg);

    var legend = document.createElement('ul');
    legend.className = 'agreement-radar__legend';

    segments.forEach(function (segment) {
      var item = document.createElement('li');
      item.className = 'agreement-radar__legend-item';
      item.setAttribute('data-hidden', segment.visible ? 'false' : 'true');

      var dot = document.createElement('span');
      dot.className = 'agreement-radar__dot';
      dot.style.background = segment.color;
      dot.style.opacity = segment.visible ? '1' : '0.4';

      var textWrap = document.createElement('span');
      textWrap.className = 'agreement-radar__legend-text';

      var label = document.createElement('span');
      label.className = 'agreement-radar__legend-label';
      label.textContent = segment.label;

      var chip = document.createElement('span');
      chip.className = 'agreement-radar__legend-chip';
      chip.textContent = segment.chip;

      textWrap.appendChild(label);
      textWrap.appendChild(chip);
      item.appendChild(dot);
      item.appendChild(textWrap);
      legend.appendChild(item);
    });

    wrapper.appendChild(legend);
    rootNode.appendChild(wrapper);
  }

  function createRadar(rootNode, initialOptions) {
    if (!rootNode) {
      throw new Error('AgreementRadar.createRadar requires a root node');
    }

    var state = {
      options: Object.assign({}, initialOptions || {})
    };

    function render() {
      buildRadar(rootNode, state.options);
    }

    render();

    return {
      update: function update(nextOptions) {
        state.options = Object.assign({}, state.options, nextOptions || {});
        render();
      },
      destroy: function destroy() {
        rootNode.innerHTML = '';
      }
    };
  }

  global.AgreementRadar = {
    createRadar: createRadar,
    SEGMENT_ORDER: SEGMENT_ORDER,
    SEGMENT_META: SEGMENT_META
  };
})(window);
