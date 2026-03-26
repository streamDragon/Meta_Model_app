export const BREEN_TABLE_LAB_CSS = `
.btl-app{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;color:#14263d;max-width:1288px;margin:0 auto}
.btl-app *{box-sizing:border-box}
.mtp-nav{padding:10px 12px;border-radius:24px;background:rgba(255,255,255,.86);border:1px solid rgba(210,220,233,.88);box-shadow:0 14px 32px rgba(15,23,42,.07)}
.mtp-nav-group{gap:8px}
.mtp-nav a{border-radius:999px;padding:8px 12px;font-weight:800}
.btl-shell{display:grid;gap:14px;background:
  radial-gradient(circle at top right,rgba(88,92,214,.11),transparent 26%),
  radial-gradient(circle at left top,rgba(14,165,233,.08),transparent 28%),
  linear-gradient(180deg,#f5f7fb 0%,#fbfcfe 100%);
  border:1px solid #d9e2ee;border-radius:30px;padding:16px;box-shadow:0 28px 70px rgba(15,23,42,.08)}
.btl-kicker{font-size:.78rem;font-weight:900;letter-spacing:.04em;color:#46617d}
.btl-title{font-size:clamp(1.5rem,2.1vw,2.24rem);line-height:1.06;font-weight:900;margin:0}
.btl-subtitle,.btl-body,.btl-copy{color:#55677c;line-height:1.64}
.btl-btn-row,.btl-pill-row,.btl-chip-row,.btl-stat-row,.btl-header-actions,.btl-option-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.btl-inline-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.btl-inline-actions .btl-btn.is-primary{flex:1 1 160px}
.btl-btn{border:1px solid transparent;border-radius:16px;padding:11px 16px;font:inherit;font-weight:900;cursor:pointer;transition:.18s ease;background:#fff;color:#18324f}
.btl-btn:hover:not(:disabled){transform:translateY(-1px)}
.btl-btn:disabled{opacity:.56;cursor:not-allowed}
.btl-btn.is-primary{background:#1d4ed8;color:#fff;box-shadow:0 14px 26px rgba(29,78,216,.22)}
.btl-btn.is-secondary{background:#eef2f8;border-color:#d7e0eb;color:#13253f}
.btl-btn.is-ghost{background:#fff;border-color:#c9d7ea;color:#244469}
.btl-btn.is-warm{background:#fff8ee;border-color:#fed7aa;color:#9a3412}
.btl-btn.is-danger{background:#fff1f2;border-color:#fecdd3;color:#be123c}
.btl-pill{display:inline-flex;align-items:center;border:1px solid #dbe5f1;background:rgba(255,255,255,.92);border-radius:999px;padding:7px 12px;font-weight:800;font-size:.82rem;color:#42546d}
.btl-pill[data-tone="distortion"]{background:#eef2ff;border-color:#c7d2fe;color:#4338ca}
.btl-pill[data-tone="generalization"]{background:#ecfeff;border-color:#a5f3fc;color:#0f766e}
.btl-pill[data-tone="deletion"]{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.btl-pill[data-tone="extra"]{background:#fff7ed;border-color:#fed7aa;color:#b45309}
.btl-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr);gap:18px;align-items:start}
.btl-hero-copy,.btl-surface,.btl-mode-card,.btl-setup-card,.btl-metric,.btl-results-card,.btl-mini-card,.btl-info-card{display:grid;gap:12px;background:rgba(255,255,255,.94);border:1px solid #dde6f2;border-radius:24px;padding:18px;box-shadow:0 16px 36px rgba(15,23,42,.05)}
.btl-hero-copy{padding:22px}
.btl-hero-copy .btl-copy{font-size:1rem}
.btl-hero-visual{overflow:hidden}
.btl-hero-visual img{display:block;width:100%;height:100%;min-height:320px;object-fit:cover;border-radius:24px}
.btl-hero-figure{display:grid;gap:10px}
.btl-figure-caption{font-size:.86rem;line-height:1.55;color:#5d6f86}
.btl-tag-grid,.btl-mode-grid,.btl-results-grid,.btl-metric-grid,.btl-setup-grid{display:grid;gap:12px}
.btl-tag-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
.btl-tag{border:1px solid #dbe5f1;border-radius:18px;padding:12px;background:#f9fbff;font-weight:800;color:#28415e;text-align:center}
.btl-mode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.btl-mode-card h3,.btl-setup-card h3,.btl-results-card h3,.btl-info-card h3,.btl-mini-card h3{margin:0;font-size:1rem}
.btl-mode-card p,.btl-setup-card p,.btl-results-card p,.btl-info-card p,.btl-mini-card p{margin:0;color:#5a6d84;line-height:1.58}
.btl-mode-card[data-active="1"]{border-color:#8fb7ff;box-shadow:0 0 0 2px rgba(59,130,246,.08),0 16px 36px rgba(15,23,42,.05)}
.btl-mode-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.8rem;color:#64748b;font-weight:800}
.btl-mini-demo{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.8fr);gap:16px}
.btl-mini-list{display:grid;gap:10px}
.btl-mini-list li{color:#42566f;line-height:1.58}

.btl-screen-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.btl-screen-head h2{margin:0;font-size:1.24rem}
.btl-setup-grid{grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr)}
.btl-choice-cluster{display:grid;gap:10px}
.btl-option-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.btl-choice-card{display:grid;gap:6px;text-align:right;border:1px solid #dbe5f1;background:#fff;border-radius:18px;padding:14px;cursor:pointer;transition:.18s ease}
.btl-choice-card:hover{transform:translateY(-1px);border-color:#9ebcf7}
.btl-choice-card[data-selected="1"]{border-color:#1d4ed8;background:#eff6ff;box-shadow:0 0 0 2px rgba(29,78,216,.08)}
.btl-choice-card strong{font-size:.94rem}
.btl-choice-card small{color:#6b7280;line-height:1.45}
.btl-stepper{display:grid;gap:10px}
.btl-stepper .btl-pill{justify-content:center}
.btl-preview{display:grid;gap:14px}
.btl-preview-list{display:grid;gap:8px}
.btl-preview-list li{color:#42566f;line-height:1.5}

.btl-play-shell{display:grid;gap:12px}
.btl-topbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;background:rgba(255,255,255,.95);border:1px solid #dde6f2;border-radius:24px;padding:15px 16px;box-shadow:0 14px 34px rgba(15,23,42,.05)}
.btl-topbar--play{padding:14px 16px}
.btl-topbar h2{margin:0;font-size:1.12rem}
.btl-topbar p{margin:0}
.btl-topbar-main,.btl-topbar-copy{display:grid;gap:8px}
.btl-topbar-note{color:#5a6d84;line-height:1.45}
.btl-status-grid{display:grid;gap:10px;justify-items:end;align-content:start}
.btl-stat-row{justify-content:flex-end}
.btl-stat{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#f8fbff;border:1px solid #dbe5f1;padding:8px 12px;font-weight:800;color:#47586e}
.btl-stat strong{color:#12263f}
.btl-phase-strip{display:flex;flex-wrap:wrap;gap:8px}
.btl-phase{display:inline-flex;align-items:center;justify-content:center;min-width:70px;border:1px solid #dce5f2;background:rgba(255,255,255,.76);padding:7px 12px;border-radius:999px;font-weight:800;color:#54657c}
.btl-phase[data-active="1"]{background:#eef4ff;border-color:#bfd1fb;color:#1e3a8a}
.btl-workbench{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(288px,332px);gap:14px;align-items:stretch}
.btl-focus-panel{display:grid;grid-template-rows:auto 1fr auto;gap:12px;background:
  radial-gradient(circle at top right,rgba(99,102,241,.08),transparent 34%),
  linear-gradient(180deg,rgba(255,252,246,.96) 0%,rgba(255,255,255,.96) 100%);
  border:1px solid #e3dcca;border-radius:28px;padding:16px;box-shadow:0 16px 36px rgba(15,23,42,.06)}
.btl-focus-head{display:grid;gap:6px}
.btl-focus-head h3{margin:0;font-size:1.06rem;line-height:1.34}
.btl-focus-card{display:grid;gap:12px;padding:14px;background:rgba(255,255,255,.78);border:1px solid rgba(222,226,236,.96);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.btl-focus-selection{display:grid;gap:6px;padding:12px 14px;border-radius:18px;background:#fbfdff;border:1px solid #dde6f2}
.btl-focus-selection[data-empty="1"]{background:#fffaf1;border-color:#eed9ab}
.btl-focus-selection strong{font-size:1.06rem;line-height:1.34}
.btl-focus-selection p{margin:0;color:#5f6f82;line-height:1.55}
.btl-focus-label{font-size:.78rem;font-weight:900;color:#6a7788}
.btl-focus-hint{padding:12px 14px;border-radius:18px;background:#f6f8fb;border:1px dashed #cad6e6;color:#4f647d;line-height:1.55;font-weight:700}
.btl-focus-footer{display:grid;gap:10px;margin-top:auto}
.btl-tray{display:grid;grid-template-columns:1fr;gap:8px}
.btl-tray-item{border:1px solid #d6deea;background:#fff;border-radius:16px;padding:12px 13px;font:inherit;font-weight:800;cursor:pointer;transition:.18s ease;text-align:right;color:#17304d}
.btl-tray-item:hover:not(:disabled){transform:translateY(-1px);border-color:#a1bdf6;box-shadow:0 10px 22px rgba(59,130,246,.08)}
.btl-tray-item:disabled{opacity:.6;cursor:not-allowed}
.btl-tray-item[data-selected="1"]{background:#eef4ff;border-color:#8ea7ff;color:#1d4ed8}
.btl-tray-item[data-placed="1"]{background:#fff7e8;border-color:#f1cd87;color:#a16207}
.btl-board-panel{display:grid;gap:12px;align-content:start;background:rgba(255,255,255,.94);border:1px solid #dde6f2;border-radius:28px;padding:14px;box-shadow:0 18px 40px rgba(15,23,42,.06);min-height:100%}
.btl-board-panel-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;align-self:start;flex-wrap:wrap}
.btl-board-panel-head h3{margin:0;font-size:1.06rem}
.btl-board-panel-head p{margin:0;color:#5b6c81;line-height:1.5;font-size:.9rem;max-width:38rem}
.btl-feedback-copy{display:grid;gap:8px}
.btl-feedback{border-radius:18px;padding:12px 14px;font-weight:800;line-height:1.55;border:1px solid}
.btl-feedback[data-tone="info"]{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.btl-feedback[data-tone="success"]{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.btl-feedback[data-tone="warn"]{background:#fff7ed;border-color:#fed7aa;color:#b45309}
.btl-feedback[data-tone="error"]{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
.btl-feedback small{display:block;color:inherit;opacity:.86;font-weight:700}
.btl-choice-inline{display:grid;gap:10px;padding:12px 14px;border:1px dashed #cbd8ea;border-radius:20px;background:#fbfdff}
.btl-choice-inline-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.btl-choice-inline button{border:1px solid #dbe5f1;border-radius:14px;background:#fff;padding:10px 12px;font:inherit;font-weight:800;cursor:pointer}
.btl-choice-inline button:hover:not(:disabled){border-color:#9ebcf7}
.btl-choice-inline button:disabled{opacity:.6;cursor:not-allowed}

.btl-results-grid{grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr)}
.btl-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.btl-metric strong{font-size:1.45rem}
.btl-metric span{font-size:.82rem;color:#64748b;font-weight:800}
.btl-insights{display:grid;gap:10px}
.btl-insights li{color:#42566f;line-height:1.58}

.btl-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;justify-content:center;align-items:flex-start;padding:16px;backdrop-filter:blur(5px)}
.btl-modal{width:min(720px,100%);display:grid;gap:14px;background:linear-gradient(180deg,#fbfdff 0%,#ffffff 100%);border:1px solid #dbe5f1;border-radius:28px;padding:20px;box-shadow:0 30px 72px rgba(15,23,42,.24)}
.btl-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.btl-modal-head h3{margin:0;font-size:1.08rem}
.btl-modal-head p,.btl-modal-body p,.btl-modal-body li{margin:0;color:#53667d;line-height:1.65}
.btl-modal-body{display:grid;gap:12px}

.btl-board{display:grid;gap:12px}
.btl-board__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.btl-board__head h3{margin:0;font-size:1rem}
.btl-board__head p{margin:0;color:#61748c;font-size:.88rem;line-height:1.45}
.btl-board__legend{display:flex;flex-wrap:wrap;gap:8px}
.btl-board__legend span{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-size:.76rem;font-weight:800;border:1px solid}
.btl-board__legend span[data-family="distortion"]{background:#eef2ff;border-color:#c7d2fe;color:#4338ca}
.btl-board__legend span[data-family="generalization"]{background:#ecfeff;border-color:#a5f3fc;color:#0f766e}
.btl-board__legend span[data-family="deletion"]{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.btl-board__legend span[data-family="extra"]{background:#fff7ed;border-color:#fed7aa;color:#b45309}
.btl-board__rows{display:grid;gap:10px}
.btl-board__row{display:grid;grid-template-columns:112px minmax(0,1fr);gap:10px;align-items:stretch}
.btl-board__row-label{display:grid;gap:6px;align-content:center;justify-items:start;border-radius:20px;background:#f5f7fb;border:1px solid #dde6f2;color:#61738a;font-weight:800;font-size:.82rem;padding:12px 14px;text-align:right}
.btl-board__row-label strong{font-size:.9rem;color:#18324f}
.btl-board__row-label small{line-height:1.45}
.btl-board__row-label[data-family="distortion"]{background:linear-gradient(180deg,#f5f3ff 0%,#eef2ff 100%);border-color:#d6d4ff;color:#4c44b8}
.btl-board__row-label[data-family="generalization"]{background:linear-gradient(180deg,#f0fdfa 0%,#ecfeff 100%);border-color:#b8f1ef;color:#0f766e}
.btl-board__row-label[data-family="deletion"]{background:linear-gradient(180deg,#f3fff8 0%,#ecfdf5 100%);border-color:#c5f0d2;color:#166534}
.btl-board__row-label[data-family="extra"]{background:linear-gradient(180deg,#fffaf1 0%,#fff7ed 100%);border-color:#f6d8a8;color:#b45309}
.btl-board__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.btl-board__cell{min-height:90px;border-radius:18px;border:1px solid #dbe5f1;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%);padding:12px;display:grid;align-content:center;gap:8px;text-align:right;color:#13253f;transition:.18s ease;box-shadow:0 8px 20px rgba(15,23,42,.04)}
.btl-board__cell[data-family="distortion"]{box-shadow:inset 0 0 0 1px rgba(99,102,241,.04),0 8px 20px rgba(15,23,42,.04)}
.btl-board__cell[data-family="generalization"]{box-shadow:inset 0 0 0 1px rgba(13,148,136,.04),0 8px 20px rgba(15,23,42,.04)}
.btl-board__cell[data-family="deletion"]{box-shadow:inset 0 0 0 1px rgba(34,197,94,.04),0 8px 20px rgba(15,23,42,.04)}
.btl-board__cell[data-family="extra"]{box-shadow:inset 0 0 0 1px rgba(245,158,11,.04),0 8px 20px rgba(15,23,42,.04)}
.btl-board__cell.is-clickable{cursor:pointer}
.btl-board__cell.is-clickable:hover:not(:disabled){transform:translateY(-1px);border-color:#a5bdf9}
.btl-board__cell.is-active{box-shadow:0 0 0 2px rgba(29,78,216,.08),0 10px 24px rgba(15,23,42,.06)}
.btl-board__cell.is-dimmed{opacity:.48}
.btl-board__cell-top{display:flex;justify-content:flex-start;gap:8px;align-items:center}
.btl-board__badge{font-size:.72rem;font-weight:800;color:#60738b}
.btl-board__cell-main{display:grid;gap:4px}
.btl-board__cell-main strong{font-size:.95rem;line-height:1.35}
.btl-board__cell-main small{color:#66778d;line-height:1.4;font-size:.78rem}
.btl-board__placeholder{font-size:1.18rem;line-height:1;color:#b7c3d1}
.btl-board__cell.is-ghost{background:linear-gradient(180deg,#ffffff 0%,#fafcff 100%);border-style:dashed;border-color:#d8e2ee}
.btl-board__cell.is-prefilled{background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%)}
.btl-board__cell.is-selected,.btl-board__cell.is-active{background:#eef4ff;border-color:#bfd1fb}
.btl-board__cell.is-placed{background:#fffaf0;border-color:#f3ca78}
.btl-board__cell.is-missing{background:#fffaf0;border-style:dashed;border-color:#f3c76b}
.btl-board__cell.is-prompt{background:#fafcff;border-color:#dbe5f1}
.btl-board__cell.is-correct{background:#ecfdf5;border-color:#86efac}
.btl-board__cell.is-incorrect{background:#fef2f2;border-color:#fca5a5}
.btl-board__cell.is-partial{background:#fff7ed;border-color:#fdba74}
.btl-board__cell.is-heat-strong{background:#ecfdf5;border-color:#86efac}
.btl-board__cell.is-heat-medium{background:#fff7ed;border-color:#fdba74}
.btl-board__cell.is-heat-weak{background:#fef2f2;border-color:#fca5a5}
.btl-board__cell.is-heat-neutral{background:#f8fafc;border-color:#dbe5f1}
.btl-board[data-variant="mini"] .btl-board__row{grid-template-columns:86px minmax(0,1fr)}
.btl-board[data-variant="mini"] .btl-board__cell{min-height:74px;padding:10px;border-radius:16px}
.btl-board[data-variant="mini"] .btl-board__cell-main strong{font-size:.82rem}

@media (max-width:1180px){
  .btl-workbench{grid-template-columns:minmax(0,1.18fr) minmax(276px,310px)}
}

@media (max-width:1100px){
  .btl-hero,.btl-mini-demo,.btl-setup-grid,.btl-results-grid,.btl-workbench{grid-template-columns:1fr}
  .btl-tag-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .btl-board-panel-head{align-items:flex-start}
}

@media (max-width:780px){
  .btl-shell{padding:12px;border-radius:24px}
  .btl-mode-grid,.btl-option-grid,.btl-choice-inline-grid,.btl-metric-grid,.btl-tray{grid-template-columns:1fr}
  .btl-topbar,.btl-topbar--play{grid-template-columns:1fr}
  .btl-status-grid{justify-items:stretch}
  .btl-stat-row,.btl-header-actions{justify-content:flex-start}
  .btl-board__row{grid-template-columns:1fr}
  .btl-board__row-label{min-height:48px}
}

@media (max-width:560px){
  .btl-tag-grid{grid-template-columns:1fr}
  .btl-board__grid{gap:8px}
  .btl-board__cell{min-height:82px;padding:10px;border-radius:16px}
  .btl-board__cell-main strong{font-size:.82rem}
  .btl-btn-row,.btl-header-actions,.btl-inline-actions{display:grid;grid-template-columns:1fr}
  .btl-btn,.btl-inline-actions .btl-btn.is-primary{width:100%;justify-content:center}
  .btl-hero-visual img{min-height:240px}
}
`;
