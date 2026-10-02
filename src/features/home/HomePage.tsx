import { FEATURES } from '../../registry';
import { CONVERSATION_SKILLS } from '../../data/conversationSkills';
import { CONVERSATION_SCENARIOS } from '../../data/conversationScenarios';
import { recommendScenario } from '../../lib/conversationLearning';
import { useConversationLearning } from '../../store/conversationLearning';
import { useProgress } from '../../store/useProgress';

export function HomePage() {
  const { learning, markTransfer, stored } = useConversationLearning();
  const { progress } = useProgress();
  const recommended = recommendScenario(learning);
  const pending = [...learning.sessions].reverse().find((s) => s.transfer === 'planned');
  const pendingScenario = CONVERSATION_SCENARIOS.find((s) => s.id === pending?.scenarioId);
  return <div className="learning-page">
    <header className="home-hero learning-heading">
      <span className="learning-eyebrow">תוכנית התרגול שלי</span>
      <h2>לדעת זה קל. לעשות את זה בזמן אמת — זה אימון.</h2>
      <p>הקשבה → בירור → בחירה בהסכמה → צעד ובדיקה.</p>
    </header>
    <section className="card learning-featured">
      <div><span className="learning-eyebrow">האימון הבא שלך · כשלוש דקות</span><h3>{recommended.title}</h3><p>{recommended.principle}</p></div>
      <button className="btn btn-primary" onClick={() => { window.location.hash = 'conversation'; }}>לאימון שיחה</button>
    </section>
    {pending && pendingScenario && <section className="card learning-transfer"><h3>מהתרגיל לחיים</h3><p>{pendingScenario.transferCue}</p><p className="learning-muted">בשיחה יומיומית שמתאימה לכך, ובהסכמת האדם. אפשר לבחור להקשיב בלבד.</p><div className="learning-actions"><button className="btn btn-primary" onClick={() => markTransfer(pending.id, 'tried')}>ניסיתי בשיחה</button><button className="btn btn-secondary" onClick={() => markTransfer(pending.id, 'not-yet')}>לא התאים הפעם</button></div><p className="learning-muted">זהו דיווח עצמי על ניסיון, ללא ציון וללא שמירת פרטי השיחה.</p></section>}
    <section aria-labelledby="skills-heading"><h3 id="skills-heading">מה אנחנו מתרגלים?</h3><div className="learning-skill-list">{CONVERSATION_SKILLS.map((skill) => {
      const evidence = learning.skills[skill.id];
      return <article key={skill.id} className="learning-skill"><div><h4>{skill.title}</h4><p>{skill.detail}</p></div><span>{!evidence ? 'עוד לא תורגל' : `${evidence.helpful}/${evidence.attempts} בחירות מתאימות · ${evidence.contexts.length} הקשרים`}</span><small>{evidence ? evidence.dueAt <= Date.now() ? 'מומלץ לחזור על המיומנות' : `חזרה מ־${new Date(evidence.dueAt).toLocaleDateString('he-IL')}` : 'מתחילים באימון קצר'}</small></article>;
    })}</div><p className="learning-muted">המעקב מציג ביצוע בתרגילים. חזרות מתוזמנות לפי כלל למידה פשוט; אינן מבחן הסמכה או הוכחה להטמעה.</p></section>
    <section aria-labelledby="tools-heading"><h3 id="tools-heading">בחר לפי מה שתרצה לתרגל</h3><div className="learning-tool-grid">{FEATURES.filter((f) => !['home', 'about', 'legacy-tools', 'conversation'].includes(f.id)).map((f) => <button className="card learning-tool" key={f.id} onClick={() => { window.location.hash = f.id; }}><strong>{f.navLabel}</strong><span>{f.shortDescription}</span>{f.status !== 'production' && <small>בבדיקה</small>}</button>)}</div></section>
    <div className="learning-summary"><span>{progress.sessions} אימונים הושלמו</span><span>{progress.xp} נקודות תרגול</span><span>{learning.sessions.filter((s) => s.transfer === 'tried').length} ניסיונות בשיחה (דיווח עצמי)</span></div>
    <p className="learning-muted">המעקב נשמר בדפדפן הזה. ניסוח חופשי באימון אינו נשמר.</p>
    <nav className="learning-actions" aria-label="מקורות וכלים נוספים">{FEATURES.filter((f) => f.navGroup === 'resources').map((f) => <a className="btn btn-secondary" key={f.id} href={`#${f.id}`}>{f.navLabel}</a>)}</nav>
    {!stored && <p role="alert">הדפדפן לא אפשר לשמור את המעקב. הוא זמין כרגע עד סגירת העמוד.</p>}
  </div>;
}
