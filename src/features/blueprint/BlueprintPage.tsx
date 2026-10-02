import { useMemo, useState } from 'react';
import { content } from '../../data/content';
import { resolveReframe, WHO_EXPECTS_LABELS } from '../../lib/blueprint';
import { useProgress } from '../../store/useProgress';
import { XP_REWARDS } from '../../store/progress';
import { useHint } from '../../store/hint';
import { HowItWorks } from '../../components/HowItWorks';

interface WizardField {
  id: string; // matches choice_packs.blueprint.fields key
  key: keyof BlueprintFields;
  label: string;
  summaryLabel: string;
}

interface BlueprintFields {
  success: string;
  firstStep: string;
  lastStep: string;
  middleSteps: string;
  prerequisites: string;
  friction: string;
  alternatives: string;
  time: string;
}

const WIZARD_FIELDS: WizardField[] = [
  { id: 'q-success', key: 'success', label: 'מה התוצאה בדיוק? (איך זה נראה בהצלחה?)', summaryLabel: 'תוצאה' },
  { id: 'q-first-step', key: 'firstStep', label: 'מה הצעד הראשון הקטן ביותר?', summaryLabel: 'צעד ראשון' },
  { id: 'q-last-step', key: 'lastStep', label: 'מה הצעד האחרון - איך תדע שסיימת?', summaryLabel: 'סיום' },
  { id: 'q-middle-steps', key: 'middleSteps', label: 'איזה 3-5 שלבים באמצע?', summaryLabel: 'שלבי אמצע' },
  { id: 'q-prerequisites', key: 'prerequisites', label: 'מה צריך להיות נכון לפני התחלה? (מקום, ציוד, זמן, אישורים)', summaryLabel: 'תנאים' },
  { id: 'q-friction', key: 'friction', label: 'איפה אתה בדרך כלל נתקע?', summaryLabel: 'חיכוך' },
  { id: 'q-alternatives', key: 'alternatives', label: 'מה Plan B כשנתקע? (חלופה, קיצור דרך, עזרה)', summaryLabel: 'Plan B' },
  { id: 'q-time', key: 'time', label: 'מתי תעשה את הצעד הראשון וכמה זמן תקצה לו?', summaryLabel: 'זמן' },
];

const EMPTY_FIELDS: BlueprintFields = {
  success: '',
  firstStep: '',
  lastStep: '',
  middleSteps: '',
  prerequisites: '',
  friction: '',
  alternatives: '',
  time: '',
};

function ChoiceSelect({
  packField,
  value,
  onChange,
  ariaLabel,
}: {
  packField: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const choices = content.choice_packs.blueprint.fields[packField] ?? [];
  return (
    <div className="guided-choice"><select
      className="blueprint-choice-select"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">בחר דוגמה (רשות)</option>
      {value && !choices.some((choice) => choice.label === value) && <option value={value}>{value}</option>}
      {choices.map((choice) => (
        <option key={choice.id} value={choice.label}>
          {choice.label}
        </option>
      ))}
    </select>
      <label className="learning-muted">או במילים שלך<input aria-label={`ניסוח אישי: ${ariaLabel}`} value={value} onChange={(e) => onChange(e.target.value)} /></label>
    </div>
  );
}

export function BlueprintPage() {
  const { addXP, recordSession } = useProgress();
  const { showHint } = useHint();

  const [step, setStep] = useState(1);
  const [action, setAction] = useState('');
  const [fields, setFields] = useState<BlueprintFields>(EMPTY_FIELDS);
  const [actionTried, setActionTried] = useState(false);
  const [whoExpects, setWhoExpects] = useState('');
  const [expectation, setExpectation] = useState('');
  const [assumption, setAssumption] = useState('');
  const [ability, setAbility] = useState(5);
  const [gap, setGap] = useState('');
  const [awarded, setAwarded] = useState(false);

  const reframe = useMemo(
    () => resolveReframe(ability, gap, content.blueprint_builder.reframe_templates),
    [ability, gap],
  );

  const setField = (key: keyof BlueprintFields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const goToStep2 = () => {
    if (!action.trim()) {
      showHint('בחר פעולה או כתוב פעולה משלך כדי להתחיל');
      return;
    }
    setActionTried(false);
    setStep(2);
  };

  const goToStep3 = () => {
    if (!fields.success.trim() || !fields.firstStep.trim() || !fields.time.trim()) {
      showHint('הגדר תוצאה, צעד ראשון וזמן לביצוע כדי להמשיך');
      return;
    }
    setStep(3);
  };

  const goToStep4 = () => {
    setStep(4);
    // Audit bug B1 fix: blueprint completion now actually awards XP + session.
    if (!awarded) {
      addXP(XP_REWARDS.blueprintComplete);
      recordSession();
      setAwarded(true);
    }
  };

  const startOver = () => {
    setStep(1);
    setAction('');
    setFields(EMPTY_FIELDS);
    setActionTried(false);
    setWhoExpects('');
    setExpectation('');
    setAssumption('');
    setAbility(5);
    setGap('');
    setAwarded(false);
  };

  const exportBlueprint = () => {
    const data = {
      action,
      ...fields,
      whoExpects,
      expectation,
      assumption,
      ability: String(ability),
      gap,
      reframe,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };



  return (
    <div className="workbench">
      <div className="workbench-main card">
        <h2>🏗️ בונה צעדים</h2>
        <p>כשיש כוונה אבל לא ברור איך להתחיל, מגדירים תוצאה, צעד ראשון ומועד. שאר הפירוק הוא לפי הצורך.</p>

        <div className="feature-brief">
          <span>
            <strong>מטרה:</strong> להפוך כוונה עמומה לצעד ראשון.
          </span>
          <span>
            <strong>תוצר:</strong> תוכנית קצרה, תנאים ו-Plan B.
          </span>
        </div>


        {step === 1 && (
          <HowItWorks
            steps={[
              { icon: '🎬', title: 'בוחרים פעולה', detail: 'מה אתה אומר לעצמך לעשות?' },
              { icon: '🧩', title: 'מפרקים לצעדים', detail: 'תוצאה, צעד ראשון וזמן; פרטים נוספים לפי הצורך' },
              { icon: '⚖️', title: 'בודקים פער', detail: 'ציפייה מול יכולת, בלי האשמה עצמית' },
              { icon: '🚀', title: 'מקבלים תוכנית', detail: 'צעד שאפשר לבצע ותוכנית שאפשר לשמור' },
            ]}
          />
        )}

        {step === 1 && (
          <div className="blueprint-step active">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3>מה אתה אומר לעצמך לעשות?</h3>
            </div>
            <p className="step-desc">
              אפשר לבחור דוגמה או לכתוב פעולה מהחיים שלך.
            </p>
            <div className="input-group">
              <ChoiceSelect
                packField="action-input"
                value={action}
                onChange={setAction}
                ariaLabel="בחירת פעולה"
              />
            </div>
            <div className="step-buttons">
              <button type="button" className="btn btn-primary" onClick={goToStep2}>
                המשך להגדרת הצעד
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="blueprint-step active">
            <div className="step-header">
              <span className="step-number">2</span>
              <h3>פירוק הפעולה</h3>
            </div>

            <div className="blueprint-questions">
              {WIZARD_FIELDS.filter((field) => ['success', 'firstStep', 'time'].includes(field.key)).map((field) => <div className="q-card" key={field.id}><label>{field.label}</label><ChoiceSelect packField={field.id} value={fields[field.key]} onChange={(v) => setField(field.key, v)} ariaLabel={field.summaryLabel} /></div>)}
            </div>
            <details className="feature-details"><summary>צריך פירוק נוסף או חלופה?</summary><div className="blueprint-questions">{WIZARD_FIELDS.filter((field) => !['success', 'firstStep', 'time'].includes(field.key)).map((field) => <div className="q-card" key={field.id}><label>{field.label}</label><ChoiceSelect packField={field.id} value={fields[field.key]} onChange={(v) => setField(field.key, v)} ariaLabel={field.summaryLabel} /></div>)}</div></details>

            <div className="step-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                → חזור
              </button>
              <button type="button" className="btn btn-primary" onClick={goToStep3}>
                המשך לבדיקת חסמים
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="blueprint-step active">
            <div className="step-header">
              <span className="step-number">3</span>
              <h3>בדיקת חסמים (רשות)</h3>
            </div>
            <p className="step-desc">
              אם ציפייה או חוסר במשאב עוצרים אותך, אפשר לברר אותם. אפשר גם להמשיך ישירות לתוכנית.
            </p>

            <div className="blueprint-questions">
              <div className="q-card">
                <label htmlFor="q-who-expects">מי מצפה? (אתה / מישהו אחר / מערכת)</label>
                <select
                  id="q-who-expects"
                  value={whoExpects}
                  onChange={(e) => setWhoExpects(e.target.value)}
                >
                  <option value="">בחר...</option>
                  <option value="self">אני בעצמי</option>
                  <option value="other">מישהו אחר</option>
                  <option value="system">מערכת/חוק/דדליין</option>
                </select>
              </div>

              <div className="q-card">
                <label>מה בדיוק הציפייה?</label>
                <ChoiceSelect
                  packField="q-expectation"
                  value={expectation}
                  onChange={setExpectation}
                  ariaLabel="הציפייה"
                />
              </div>

              <div className="q-card">
                <label>איזו הנחה סמויה כאן? (על מה הציפיה מניחה?)</label>
                <ChoiceSelect
                  packField="q-assumption"
                  value={assumption}
                  onChange={setAssumption}
                  ariaLabel="הנחה סמויה"
                />
              </div>

              <div className="q-card">
                <label htmlFor="q-ability">עד כמה הצעד הזה אפשרי כרגע? (דיווח עצמי, 0–10)</label>
                <input
                  id="q-ability"
                  type="range"
                  min={0}
                  max={10}
                  value={ability}
                  onChange={(e) => setAbility(Number(e.target.value))}
                />
                <span id="ability-display">{ability}</span>
              </div>

              <div className="q-card">
                <label>מה חסר לך כדי לעלות נקודה אחת?</label>
                <ChoiceSelect packField="q-gap" value={gap} onChange={setGap} ariaLabel="מה חסר" />
              </div>

              <div className="q-card gap-reframe">
                <label>🎯 ניסוח מחדש (לא-מאשים):</label>
                <div id="q-reframe" className="reframe-box">
                  {reframe}
                </div>
              </div>
            </div>

            <div className="step-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                → חזור
              </button>
              <button type="button" className="btn btn-primary" onClick={goToStep4}>
                הצג את התוכנית
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="blueprint-step active">
            <div className="step-header">
              <span className="step-number">4</span>
              <h3>התוכנית שלי</h3>
            </div>

            <div className="final-blueprint-display">
              <div className="blueprint-final-hero">
                <span>הצעד הבא</span>
                <div>
                  <h4>תוכנית ביצוע קצרה וברורה</h4>
                  <p>"{action}"</p>
                </div>
              </div>
              <div className="blueprint-summary-grid">
                <div className="blueprint-summary-card">
                  <strong>תוצאה רצויה</strong>
                  <p>{fields.success}</p>
                </div>
                <div className="blueprint-summary-card">
                  <strong>מסגרת זמן</strong>
                  <p>{fields.time}</p>
                </div>
                <div className="blueprint-summary-card blueprint-risk-card">
                  <strong>נקודת תקיעה</strong>
                  <p>{fields.friction || 'לא הוגדרה נקודת תקיעה'}</p>
                </div>
              </div>
              <div className="blueprint-timeline">
                <div>
                  <span>1</span>
                  <strong>צעד ראשון</strong>
                  <p>{fields.firstStep}</p>
                </div>
                <div>
                  <span>2</span>
                  <strong>שלבי ביניים</strong>
                  <p>{fields.middleSteps || 'לא הוגדרו'}</p>
                </div>
                <div>
                  <span>3</span>
                  <strong>צעד אחרון</strong>
                  <p>{fields.lastStep}</p>
                </div>
              </div>
              <div className="blueprint-section">
                <h4>תנאים מקדימים</h4>
                <p>{fields.prerequisites || 'לא הוגדרו תנאים מקדימים'}</p>
              </div>
              <div className="blueprint-section">
                <h4>Plan B</h4>
                <p>{fields.alternatives || 'בחר חלופה קטנה יותר או בקש עזרה.'}</p>
              </div>
              <div className="blueprint-section">
                <h4>בירור ציפיות (אם בחרת למלא)</h4>
                <ul>
                  <li>
                    <strong>מי מצפה:</strong> {WHO_EXPECTS_LABELS[whoExpects] || whoExpects}
                  </li>
                  <li>
                    <strong>הציפייה:</strong> {expectation}
                  </li>
                  <li>
                    <strong>יכולת כרגע:</strong> {ability}/10
                  </li>
                  <li>
                    <strong>מה חסר:</strong> {gap}
                  </li>
                </ul>
              </div>
              <div className="blueprint-section blueprint-reframe-card">
                <h4>ניסוח מחדש לא-מאשים</h4>
                <p>
                  <em>{reframe}</em>
                </p>
              </div>
            </div>

            <div className="next-action">
              <h4>🎯 הצעד שלך הבא:</h4>
              <p>
                <strong>{fields.firstStep}</strong>
                <br />
                <small>{fields.time}</small>
              </p>
            </div>

            <div className="if-stuck">
              <h4>אם נתקעת:</h4>
              <p>
                {fields.friction && (
                  <>
                    {fields.friction}
                    <br />
                  </>
                )}
                <strong>Plan B:</strong>
                <br />
                {fields.alternatives || 'בקש עזרה או נסה חלופה'}
              </p>
            </div>

            <div className="action-buttons">
              <button type="button" className="btn btn-secondary" onClick={exportBlueprint}>
                📥 ייצא JSON
              </button>
              <button type="button" className="btn btn-secondary" onClick={startOver}>
                תוכנית חדשה
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionTried} onClick={() => setActionTried(true)}
              >
                {actionTried ? 'סומן: ניסיתי את הצעד' : 'ניסיתי את הצעד הראשון'}
              </button>
            </div>
            {actionTried && <p role="status">מה קרה בפועל? אם הצעד היה גדול מדי, עדכן את התוכנית או בחר חלופה. סימון הניסיון הוא דיווח עצמי ואינו מעניק נקודות נוספות.</p>}
            <button className="btn btn-secondary" onClick={() => { setStep(2); setActionTried(false); }}>ערוך את הצעד והמועד</button>
          </div>
        )}
      </div>

      <aside className="workbench-side">
        <div className="side-card">
          <h4>🧭 העיקרון</h4>
          <p className="muted">{content.blueprint_builder.framing}</p>
        </div>

        <div className="side-card">
          <h4>📋 סיכום התוכנית (מתעדכן)</h4>
          <div className="blueprint-live-summary" aria-live="polite">
            <div className={action ? 'filled' : ''}>
              <strong>פעולה:</strong> {action || 'לא נבחרה'}
            </div>
            {WIZARD_FIELDS.map((field) => (
              <div key={field.id} className={fields[field.key] ? 'filled' : ''}>
                <strong>{field.summaryLabel}:</strong> {fields[field.key] || 'לא נבחר'}
              </div>
            ))}
          </div>
        </div>

        {step >= 3 && (
          <div className="side-card">
            <h4>✨ ניסוח מחדש</h4>
            <p className="muted">{reframe}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
