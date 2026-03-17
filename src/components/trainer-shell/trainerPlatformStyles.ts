export const TRAINER_PLATFORM_CSS = `
.trp-page{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;color:#10233e;max-width:1200px;margin:0 auto}
.trp-page *{box-sizing:border-box}
.trp-shell{display:grid;gap:14px;background:radial-gradient(circle at top right,rgba(245,158,11,.16),transparent 28%),radial-gradient(circle at left top,rgba(59,130,246,.12),transparent 34%),linear-gradient(180deg,#f6f8fc 0%,#fcfdff 100%);border:1px solid #dbe4f0;border-radius:30px;padding:18px;box-shadow:0 28px 60px rgba(15,23,42,.08)}
.trp-card{background:rgba(255,255,255,.92);border:1px solid #dde6f2;border-radius:22px;padding:16px;box-shadow:0 16px 36px rgba(15,23,42,.05)}
.trp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.trp-title-wrap{display:grid;gap:6px;max-width:760px}
.trp-kicker{font-size:.8rem;font-weight:900;color:#0f4c81;letter-spacing:.04em}
.trp-title{font-size:1.18rem;font-weight:900;color:#0f172a}
.trp-subtitle{font-size:.9rem;line-height:1.5;color:#526173}
.trp-actions,.trp-chip-row,.trp-start-actions,.trp-settings-head-actions,.trp-settings-footer-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.trp-btn{border:1px solid transparent;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;font-family:inherit;transition:.18s ease}
.trp-btn:hover:not(:disabled){transform:translateY(-1px)}
.trp-btn:disabled{opacity:.55;cursor:not-allowed}
.trp-btn.is-primary{background:#1358d3;color:#fff;box-shadow:0 12px 24px rgba(19,88,211,.22)}
.trp-btn.is-secondary{background:#eef2f8;color:#0f172a;border-color:#d8e0eb}
.trp-btn.is-ghost{background:#ffffff;color:#0f4c81;border-color:#bad4ea}
.trp-mode-pill,.trp-summary-pill{display:inline-flex;align-items:center;min-height:42px;padding:0 14px;border-radius:999px;border:1px solid #dce5f1;background:#f8fafc;font-weight:800;color:#334155;box-shadow:inset 0 1px 0 rgba(255,255,255,.66)}
.trp-mode-pill{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
.trp-summary-pill{background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);border-color:#bfdbfe;color:#1d4ed8}
.trp-hero{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);gap:14px}
.trp-purpose{display:grid;gap:12px;align-content:start;align-self:start}
.trp-purpose-body{line-height:1.65;color:#334155}
.trp-problem-card{border:1px solid #d6e4f4;border-radius:18px;background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%);padding:14px 16px;display:grid;gap:6px;color:#334155;line-height:1.65;box-shadow:0 12px 24px rgba(15,23,42,.04)}
.trp-problem-title{font-size:.98rem;color:#0f172a}
.trp-problem-body{color:#526173;line-height:1.65}
.trp-start-strip{display:grid;gap:12px;align-content:start;align-self:start;border:1px solid #d7e5f5;background:linear-gradient(180deg,#ffffff 0%,#f7fbff 100%);border-radius:24px;padding:18px}
.trp-start-copy{display:grid;gap:6px}
.trp-clarity-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.trp-clarity-card{border:1px solid #dce6f3;border-radius:18px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);padding:14px;display:grid;gap:6px;box-shadow:0 14px 28px rgba(15,23,42,.05)}
.trp-clarity-kicker{font-size:.78rem;font-weight:900;letter-spacing:.04em;color:#1d4ed8}
.trp-clarity-title{font-size:.96rem;color:#0f172a}
.trp-clarity-body{color:#526173;line-height:1.6;font-size:.89rem}
.trp-note-card{border:1px solid #d6e4f4;border-radius:18px;background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%);padding:14px 16px;color:#334155;line-height:1.65;box-shadow:0 12px 24px rgba(15,23,42,.04)}
.trp-step-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.trp-step{border:1px dashed #cfdceb;border-radius:16px;background:#fcfdff;padding:12px}
.trp-step strong{display:block;margin-bottom:4px;font-size:.85rem}
.trp-step span{display:block;color:#64748b;font-size:.82rem;line-height:1.45}
.trp-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.82fr);gap:14px;align-items:start}
.trp-main,.trp-support{display:grid;gap:12px}
.trp-support-card{background:linear-gradient(180deg,rgba(255,255,255,.96) 0%,rgba(248,250,252,.96) 100%);border:1px solid #dde6f2;border-radius:20px;padding:14px;display:grid;gap:10px;box-shadow:0 14px 32px rgba(15,23,42,.05)}
.trp-support-card h3,.trp-support-card h4{margin:0;font-size:.97rem;font-weight:900;color:#0f172a}
.trp-support-card p{margin:0;color:#526173;line-height:1.5}
.trp-empty{border:1px dashed #cad8ec;background:#fbfdff;border-radius:20px;padding:18px;display:grid;gap:10px;text-align:center}
.trp-empty h3{margin:0;font-size:1rem;font-weight:900}
.trp-empty p{margin:0;color:#4d5e73;line-height:1.55}
.trp-purpose{order:var(--trp-mobile-order-purpose,1)}
.trp-start-strip{order:var(--trp-mobile-order-start,2)}
.trp-step-strip{order:var(--trp-mobile-order-helper-steps,3)}
.trp-main{order:var(--trp-mobile-order-main,4)}
.trp-support{order:var(--trp-mobile-order-support,5)}

.trs-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.48);backdrop-filter:blur(5px);display:flex;justify-content:center;align-items:flex-start;padding:16px;overflow:auto}
.trs-modal{width:min(1040px,100%);background:linear-gradient(180deg,#f8fbff 0%,#fdfefe 100%);border:1px solid #d9e5f3;border-radius:28px;padding:18px;display:grid;gap:14px;box-shadow:0 28px 70px rgba(15,23,42,.22)}
.trs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.trs-head-copy{display:grid;gap:6px;max-width:720px}
.trs-head-copy h2{margin:0;font-size:1.12rem;font-weight:900}
.trs-head-copy p{margin:0;font-size:.88rem;line-height:1.5;color:#536579}
.trs-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:12px}
.trs-main,.trs-side{display:grid;gap:12px}
.trs-section{border:1px solid #d9e5f3;background:#ffffff;border-radius:20px;padding:14px;display:grid;gap:10px}
.trs-section[data-kind="advanced"]{border-style:dashed;border-color:#c7d7ea;background:linear-gradient(180deg,#fbfdff 0%,#f8fafc 100%)}
.trs-section-head{display:grid;gap:4px}
.trs-section-head h3{margin:0;font-size:.96rem;font-weight:900}
.trs-section-head p{margin:0;color:#64748b;font-size:.82rem;line-height:1.45}
.trs-advanced{border:1px dashed #c6d4e6;background:#fbfdff;border-radius:18px;padding:12px}
.trs-advanced summary{cursor:pointer;font-weight:900;color:#0f4c81}
.trs-preview{border:1px solid #cce0f0;background:linear-gradient(180deg,#eff7ff 0%,#ffffff 100%);border-radius:20px;padding:14px;display:grid;gap:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}
.trs-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-top:4px}
.trs-footer-note{color:#64748b;font-size:.82rem;line-height:1.45}

@media (max-width:980px){
  .trp-hero,.trp-layout,.trs-grid,.trp-clarity-strip{grid-template-columns:1fr}
}

@media (max-width:640px){
  .trp-shell{padding:10px;gap:8px}
  .trp-hero,.trp-layout{display:contents}
  .trs-overlay{padding:10px}
  .trp-actions,.trp-chip-row,.trp-start-actions,.trp-settings-head-actions,.trp-settings-footer-actions,.trs-footer{display:grid;grid-template-columns:1fr}
  .trp-step-strip{grid-template-columns:1fr}
  .trp-mode-pill,.trp-summary-pill{width:100%}
  .trs-footer{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(248,251,255,0),#f8fbff 28%);padding-top:12px}
  .trp-purpose,.trp-clarity-strip,.trp-note-card,.trp-step-strip{display:none}
  .trp-top{gap:8px}
  .trp-title-wrap .trp-subtitle{display:none}
  .trp-start-strip{padding:12px;gap:8px;border-radius:16px}
  .trp-start-copy .trp-subtitle{display:none}
}
`;
