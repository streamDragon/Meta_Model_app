import { content } from '../../data/content';
import { usePracticeLaunch } from '../../store/practiceLaunch';

export function CategoriesPage() {
  const { launchPractice } = usePracticeLaunch();

  return (
    <>
      <div className="feature-brief">
        <span>
          <strong>מטרה:</strong> להבין את שלוש משפחות ההפרה.
        </span>
        <span>
          <strong>תוצר:</strong> דוגמה ושאלה לכל תת-קטגוריה.
        </span>
      </div>
      <div id="categories-container">
        {content.categories.map((category, index) => (
          <details
            key={category.id}
            className={`category-card category-accordion ${category.id}`}
            open={index === 0}
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
                  <strong>{sub.hebrew}</strong>
                  <p>{sub.description}</p>
                  <div className="subcategory-example">
                    <span>דוגמה</span>
                    <q>{sub.example}</q>
                  </div>
                  <div className="subcategory-question">
                    <span>שאלה מתקנת</span>
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
