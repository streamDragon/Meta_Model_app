import { useMemo, useState } from 'react';
import { analyzeThought } from './cbtEngine';

const BELIEF_TYPES = [
  { id: 'cause', label: 'סיבה', cue: /כי|בגלל|גורם/ },
  { id: 'meaning', label: 'משמעות', cue: /זה אומר|סימן/ },
  { id: 'identity', label: 'זהות', cue: /אני כזה|אני פשוט|אני אדם/ },
  { id: 'capability', label: 'יכולת', cue: /לא מסוגל|אין לי יכולת/ },
  { id: 'belonging', label: 'שייכות', cue: /לא ירצו|דחייה|שייכ/ },
  { id: 'safety', label: 'ביטחון', cue: /סכנה|אסון|שליטה/ },
  { id: 'worth', label: 'ערך עצמי', cue: /לא שווה|כישלון/ },
  { id: 'morality', label: 'מוסר', cue: /רע|אסור|לא בסדר/ },
  { id: 'control', label: 'שליטה', cue: /לשלוט|לא אשלוט/ },
] as const;

const TOPIC_QUESTIONS: Record<string, string> = {
  cause: 'איך אתה מבין את הקשר בין שני הדברים, ומה עוד עשוי להשפיע?',
  meaning: 'איך האירוע מתקשר למשמעות שנתת לו? איזו משמעות נוספת אפשר לבדוק?',
  identity: 'איזו פעולה מסוימת קרתה, ואיך היא קשורה לתיאור שלך את עצמך?',
  capability: 'איזו יכולת נדרשת במשימה הזאת, ומה כבר אפשרי עם עזרה או בתנאים אחרים?',
  belonging: 'מה נאמר או נעשה בפועל לגבי השייכות שלך?',
  safety: 'איזה סיכון ממשי קיים, ואיזה מידע או תמיכה נדרשים לפני פעולה?',
  worth: 'לפי איזה מדד אתה מעריך את עצמך כאן? מה המדד הזה אינו כולל?',
  morality: 'של מי הכלל, על איזה מצב הוא חל, ומה חשוב לך לשמור?',
  control: 'מה בשליטתך במצב הזה, ועל מה אפשר להשפיע או לבקש עזרה?',
};

function detectBeliefType(text: string) {
  return BELIEF_TYPES.find((type) => type.cue.test(text)) ?? null;
}

export function BeliefLens() {
  const [selectedType, setSelectedType] = useState('');
  const [statement, setStatement] = useState('אם שתקתי בפגישה, זה אומר שאני חלש.');
  const analysis = useMemo(() => analyzeThought(statement), [statement]);
  const belief = BELIEF_TYPES.find((b) => b.id === selectedType) ?? detectBeliefType(statement);
  const logicalLevel = belief?.id === 'identity' ? 'זהות' : belief?.id === 'capability' ? 'יכולת' : 'אמונה / ערך';

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">עדשת אמונה</span>
        <h3>מפרידים בין מה קרה, מה זה אומר, ומי אני בתוך זה.</h3>
        <label htmlFor="belief-statement">משפט אמונה</label>
        <textarea id="belief-statement" value={statement} onChange={(e) => { setStatement(e.target.value); setSelectedType(''); }} rows={4} />
        <div className="cbt-belief-type">
          <small>כיוון לבדיקה לפי מילות מפתח</small>
          <strong>{belief?.label ?? 'לא זוהה כיוון — אפשר לבחור בעצמך'}</strong>
          <span>עדשה אפשרית: {logicalLevel}</span>
          <label htmlFor="belief-type">איזה נושא מתאים לך?</label><select id="belief-type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}><option value="">לפי המשפט</option>{BELIEF_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select>
        </div>
      </section>
      <section className="cbt-panel">
        <h3>שאלות לפי העדשה</h3>
        <article className="cbt-mini-card">
          <strong>CBT</strong>
          <p>איזו ראיה תומכת בזה, ואיזו ראיה מסבכת את זה?</p>
        </article>
        <article className="cbt-mini-card">
          <strong>Meta Model</strong>
          <p>{belief ? TOPIC_QUESTIONS[belief.id] : (analysis.generatedQuestions[0] ?? 'מה בדיוק נאמר או קרה?')}</p>
        </article>
        <article className="cbt-mini-card">
          <strong>כיוון להמשך</strong>
          <p>
            {logicalLevel === 'זהות'
              ? 'זה נשמע כמו משפט ברמת זהות. לא כדאי לפתור אותו רק בעצת פעולה; קודם נפריד בין מה עשיתי לבין מי אני.'
              : 'אפשר להתחיל בשאלת מידע אחת. אם מתאים, הגדירו יחד פעולה יומיומית קטנה לבדיקה.'}
          </p>
        </article>
      </section>
    </div>
  );
}
