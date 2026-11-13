import { FEATURES, NAV_GROUPS } from '../../registry';
import { CourseDoor } from './CourseDoor';
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
  const isNew = progress.sessions === 0 && learning.sessions.length === 0;
  const practised = CONVERSATION_SKILLS.filter((skill) => learning.skills[skill.id]).length;
  const due = CONVERSATION_SKILLS.filter((skill) => {
    const evidence = learning.skills[skill.id];
    return evidence && evidence.dueAt <= Date.now();
  }).length;
  const go = (id: string) => { window.location.hash = id; };
  const tools = (group: string) => FEATURES.filter((f) => f.navGroup === group && !['home', 'conversation'].includes(f.id));
  const toolList = (group: string) => <div className="home-tool-list">{tools(group).map((f) => <button type="button" className="home-tool" key={f.id} onClick={() => go(f.id)}><span className="home-tool-icon" aria-hidden="true">{f.icon}</span><span className="home-tool-text"><strong>{f.navLabel}</strong><small>{f.shortDescription}</small></span></button>)}</div>;

  return <div className="learning-page">
    <header className="home-hero learning-heading">
      <span className="learning-eyebrow">תוכנית התרגול שלי</span>
      <h2>לדעת זה קל. לעשות את זה בזמן אמת — זה אימון.</h2>
    </header>
    {isNew ? <CourseDoor /> : <section className="card learning-featured">
      <div><span className="learning-eyebrow">האימון הבא שלך · כשלוש דקות</span><h3>{recommended.title}</h3><p>{recommended.principle}</p></div>
      <button className="btn btn-primary" onClick={() => go('conversation')}>לאימון שיחה</button>
    </section>}
    {pending && pendingScenario && <section className="card learning-transfer"><h3>מהתרגיל לחיים</h3><p>{pendingScenario.transferCue}</p><p className="learning-muted">בשיחה יומיומית שמתאימה לכך, ובהסכמת האדם. אפשר לבחור להקשיב בלבד.</p><div className="learning-actions"><button className="btn btn-primary" onClick={() => markTransfer(pending.id, 'tried')}>ניסיתי בשיחה</button><button className="btn btn-secondary" onClick={() => markTransfer(pending.id, 'not-yet')}>לא התאים הפעם</button></div><p className="learning-muted">זהו דיווח עצמי על ניסיון, ללא ציון וללא שמירת פרטי השיחה.</p></section>}
    <details className="home-fold">
      <summary><strong>מה אנחנו מתרגלים?</strong><span>{practised === 0 ? `${CONVERSATION_SKILLS.length} מיומנויות שיחה` : `${practised} מתוך ${CONVERSATION_SKILLS.length} תורגלו${due ? ` · ${due} לחזרה` : ''}`}</span></summary>
      <div className="learning-skill-list">{CONVERSATION_SKILLS.map((skill) => {
        const evidence = learning.skills[skill.id];
        return <article key={skill.id} className="learning-skill"><div><h4>{skill.title}</h4><p>{skill.detail}</p></div><span>{!evidence ? 'עוד לא תורגל' : `${evidence.helpful}/${evidence.attempts} בחירות מתאימות · ${evidence.contexts.length} הקשרים`}</span><small>{evidence ? evidence.dueAt <= Date.now() ? 'מומלץ לחזור על המיומנות' : `חזרה מ־${new Date(evidence.dueAt).toLocaleDateString('he-IL')}` : 'מתחילים באימון קצר'}</small></article>;
      })}</div>
      <p className="learning-muted">המעקב מציג ביצוע בתרגילים. חזרות מתוזמנות לפי כלל למידה פשוט; אינן מבחן הסמכה או הוכחה להטמעה.</p>
    </details>
    <section aria-labelledby="tools-heading" className="home-tools"><h3 id="tools-heading">{NAV_GROUPS[0].label}</h3>{toolList('core')}</section>
    {NAV_GROUPS.slice(1).map((group) => <details className="home-fold" key={group.id}><summary><strong>{group.label}</strong><span>{tools(group.id).length} כלים</span></summary>{toolList(group.id)}</details>)}
    {!isNew && <details className="home-fold"><summary><strong>מסלול לפי קורס</strong><span>מטה-מודל · שפת ההשפעה</span></summary><CourseDoor /></details>}
    <div className="learning-summary"><span>{progress.sessions} אימונים הושלמו</span><span>{progress.xp} נקודות תרגול</span><span>{learning.sessions.filter((s) => s.transfer === 'tried').length} ניסיונות בשיחה (דיווח עצמי)</span></div>
    <p className="learning-muted">המעקב נשמר בדפדפן הזה. ניסוח חופשי באימון אינו נשמר.</p>
    {!stored && <p role="alert">הדפדפן לא אפשר לשמור את המעקב. הוא זמין כרגע עד סגירת העמוד.</p>}
  </div>;
}
