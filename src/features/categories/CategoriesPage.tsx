import { useState } from 'react';
import { content } from '../../data/content';
import { usePracticeLaunch } from '../../store/practiceLaunch';
import { PATTERN_ART } from '../../lib/patternArt';
import { HowItWorks } from '../../components/HowItWorks';
import { SurfaceHiddenPrinciple } from '../../components/SurfaceHiddenPrinciple';
import icebergImg from '../../assets/iceberg.png';

export function CategoriesPage() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLocaleLowerCase('he');
  const categories = content.categories.map((category) => ({ ...category, subcategories: category.subcategories.filter((sub) => !term || [category.name, category.description, sub.hebrew, sub.description, sub.example, sub.question].some((text) => text.toLocaleLowerCase('he').includes(term))) })).filter((category) => category.subcategories.length);
  const { launchPractice } = usePracticeLaunch();

  return (
    <>
      <div className="iceberg-explainer card">
        <img src={icebergImg} alt="קרחון: מעל המים מבנה השטח, מתחת למים מבנה העומק" loading="lazy" />
        <div>
          <h2>מתמונת שטח למבנה עומק 🧊</h2>
          <p>
            כל משפט שאנחנו שומעים הוא רק <strong>קצה הקרחון</strong> — מבנה השטח.
            מתחת למים מסתתר מבנה העומק: מה נמחק, מה עוות ומה הוכלל. שלוש משפחות
            הדפוסים שלמטה עוזרות לבחור מה כדאי לברר. דפוס לשוני אינו הוכחה שהדובר טועה.
          </p>
          <SurfaceHiddenPrinciple compact />
          <HowItWorks
            steps={[
              { icon: '👀', title: 'קרא דוגמה', detail: 'פתח קטגוריה וראה משפט אמיתי' },
              { icon: '🧠', title: 'הבן את הדפוס', detail: 'מה בדיוק חסר או התעוות' },
              { icon: '🎯', title: 'תרגל מיד', detail: 'כפתור "תרגל קטגוריה זו" בסוף כל קטגוריה' },
            ]}
          />
        </div>
      </div>
      <div className="card"><label htmlFor="pattern-search">חפש דפוס, דוגמה או מילה מהמשפט</label><input id="pattern-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="למשל: חייב, כולם, יודע, השוואה" />{categories.length === 0 && <p role="status">לא נמצאה התאמה במילון. נסה מילה אחרת, או פתח אימון שיחה.</p>}</div>
      <div id="categories-container">
        {categories.map((category, index) => (
          <details
            key={category.id}
            className={`category-card category-accordion ${category.id}`}
            open={!!term || index === 0}
          >
            <summary className="category-accordion-summary">
              <span className="category-icon">{category.icon}</span>
              <span>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </span>
            </summary>
            <div className="subcategories">
              {category.subcategories.map((sub) => (
                <div className="subcategory-item" key={sub.id}>
                  {PATTERN_ART[sub.id] && (
                    <img
                      className="pattern-thumb"
                      src={PATTERN_ART[sub.id]}
                      alt={`איור: ${sub.hebrew}`}
                      loading="lazy"
                    />
                  )}
                  <strong>{sub.hebrew}</strong>
                  <p>{sub.description}</p>
                  <div className="subcategory-example">
                    <span>דוגמה</span>
                    <q>{sub.example}</q>
                  </div>
                  <div className="subcategory-question">
                    <span>שאלת בירור אפשרית</span>
                    {sub.question}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary category-practice-btn"
              onClick={() => launchPractice(category.id)}
            >
              תרגל קטגוריה זו
            </button>
          </details>
        ))}
      </div>
    </>
  );
}
