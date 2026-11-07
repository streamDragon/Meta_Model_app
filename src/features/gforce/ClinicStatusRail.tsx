import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { QuestionId, Session } from './clinicCaseEngine';
import { summarizeSession } from './clinicCaseEngine';
import './clinic-status-rail.css';

type MeterId = 'rapport' | 'load' | 'energy';

const METERS: { id: MeterId; title: string; symbol: string; color: string }[] = [
  { id: 'rapport', title: 'קשר', symbol: '🤝', color: '#36a66f' },
  { id: 'load', title: 'עומס', symbol: '🧠', color: '#e7a91c' },
  { id: 'energy', title: 'אנרגיה', symbol: '⚡', color: '#6654df' },
];

function meterMeaning(id: MeterId, value: number): string {
  if (id === 'rapport') {
    return value <= 1 ? 'הקשר מתוח. כדאי לבחון אם יש צורך בהקשבה או תיקון.' :
      value >= 4 ? 'נראה שיש פתיחות ושיתוף פעולה בשיחה.' : 'הקשר בתהליך בנייה.';
  }
  if (id === 'load') {
    return value >= 4 ? 'העומס גבוה. שאלות נוספות עלולות להציף במקום להועיל.' :
      value <= 1 ? 'העומס נמוך כרגע.' : 'יש עומס מסוים, כדאי להתאים את קצב הבירור.';
  }
  return value <= 1 ? 'קשה למטופל לדמיין פעולה כרגע.' :
    value >= 4 ? 'יש יותר נכונות לבחון אפשרות מעשית.' : 'נוצרת אפשרות לתנועה, אבל היא עדיין מוגבלת.';
}

export function ClinicStatusRail({
  session,
  onAsk,
}: {
  session: Session;
  onAsk: (id: QuestionId) => void;
}) {
  const [openMeter, setOpenMeter] = useState<MeterId | null>(null);
  const [showMap, setShowMap] = useState(false);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const triggers = useRef<Partial<Record<MeterId, HTMLButtonElement | null>>>({});
  const summary = summarizeSession(session);

  function close() {
    const previous = openMeter;
    setOpenMeter(null);
    if (previous) triggers.current[previous]?.focus();
  }

  useEffect(() => {
    if (!openMeter) return;
    closeButton.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMeter(null);
        triggers.current[openMeter]?.focus();
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [openMeter]);

  const selected = METERS.find(meter => meter.id === openMeter);

  return <>
    <aside className="clinic-status-rail" aria-label="מדדי השיחה">
      <span className="clinic-status-rail-heading" aria-hidden="true">מצב</span>
      {METERS.map(({ id, title, symbol, color }) => {
        const value = session[id];
        const style: CSSProperties = { background: `conic-gradient(${color} ${value * 20}%, #e3e5f0 0)` };
        return <button
          key={id}
          type="button"
          className={`clinic-rail-meter ${openMeter === id ? 'is-selected' : ''}`}
          aria-label={`${title}: ${value} מתוך 5. לחץ לפירוט`}
          aria-expanded={openMeter === id}
          aria-controls="clinic-metrics-drawer"
          ref={el => { triggers.current[id] = el; }}
          onClick={() => setOpenMeter(current => current === id ? null : id)}
        >
          <span className="clinic-meter-donut" style={style} aria-hidden="true">
            <span className="clinic-meter-donut-center">{symbol}</span>
          </span>
          <span className="clinic-rail-meter-name">{title}</span>
          <span className="clinic-rail-meter-number">{value}/5</span>
        </button>;
      })}
    </aside>
    {selected && <>
      <button
        type="button"
        tabIndex={-1}
        className="clinic-meters-scrim"
        aria-label="סגור מדדים"
        onClick={close}
      />
      <section
        id="clinic-metrics-drawer"
        className="clinic-metrics-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="פירוט מדדי השיחה"
      >
        <div className="clinic-meters-drawer-header">
          <div>
            <span className="clinic-kicker">מבט מהיר, בלי לעצור את המשחק</span>
            <h3>🎛️ מדדי השיחה</h3>
          </div>
          <button type="button" ref={closeButton} onClick={close} className="clinic-meter-close" aria-label="סגור פירוט מדדים">✕</button>
        </div>
        <p className="clinic-note">מדדים של סימולציה בדיונית בלבד, לא מדידה פסיכולוגית של אדם.</p>
        <div className="clinic-drawer-meters">
          {METERS.map(({ id, title, symbol, color }) =>
            <button
              key={id}
              type="button"
              className={`clinic-drawer-meter-row ${selected.id === id ? 'is-selected' : ''}`}
              onClick={() => setOpenMeter(id)}
              aria-label={`${title}: ${session[id]} מתוך 5`}
            >
              <span aria-hidden="true">{symbol}</span>
              <strong>{title}</strong>
              <span
                className="clinic-drawer-meter-track"
                aria-hidden="true"
              ><span style={{ width: `${session[id] * 20}%`, background: color }} /></span>
              <b>{session[id]}/5</b>
            </button>
          )}
        </div>
        <p className="clinic-selected-meter-note" role="status">{meterMeaning(selected.id, session[selected.id])}</p>
        <div className="clinic-meters-knowledge">
          <strong>מה כבר התברר?</strong>
          <ul>
            <li>ההתחלה נראית כמו פרויקט גדול מדי.</li>
            {session.facts.includes('goal') && <li>המטרה הנוכחית: מעבר נוח בחדר.</li>}
            {session.facts.includes('barrier') && <li>ייתכן חסם של ״אם התחלתי, צריך לעשות יסודי״.</li>}
            {session.facts.includes('value') && <li>הוא רוצה מרחב, שקט ויכולת בחירה.</li>}
            {session.facts.includes('smart') && <li>נוסח יעד קטן שאפשר לבדוק היום.</li>}
          </ul>
        </div>
        <div className="clinic-meters-actions">
          <button type="button" className="clinic-outline" onClick={() => { close(); onAsk('repair'); }}>🤝 לבדוק קשר ולתקן</button>
          <button type="button" className="clinic-outline" onClick={() => { close(); onAsk('return-goal'); }}>↶ לחזור למטרה</button>
          <button type="button" className="clinic-outline" onClick={() => setShowMap(value => !value)} aria-expanded={showMap}>
            🗺️ {showMap ? 'סגור סיכום מפה' : 'בדוק את המפה שנחשפה'}
          </button>
        </div>
        {showMap && <div className="clinic-meters-map-summary">
          <p><strong>מצבים מוחשיים:</strong> {summary.main.length}</p>
          <p><strong>הסתעפויות:</strong> {summary.branches.length}</p>
          <p><strong>תמונות שנבדקו:</strong> {summary.probedScenes}</p>
          <p><strong>התחלה וסוף:</strong> {summary.canCompare ? 'נחשפו שתיהן' : 'חסרה לפחות תמונה אחת'}</p>
          <p><strong>גשר מעשי:</strong> {summary.hasConcreteBridge ? 'יש לפחות מצב ביניים' : 'עדיין לא התגלה'}</p>
        </div>}
        <p className="clinic-note">אין צורך לחשוף את כל הקלפים או להגיע ל״ציון מושלם״ כדי להתקדם בשיחה.</p>
      </section>
    </>}
  </>;
}
