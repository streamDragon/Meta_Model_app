// Reusable "how it works" strip — clear numbered instructions for every lab.
export interface HowStep {
  icon: string;
  title: string;
  detail: string;
}

export function HowItWorks({ steps, title = 'איך זה עובד?' }: { steps: HowStep[]; title?: string }) {
  return (
    <div className="how-it-works" role="note">
      <h4>🧭 {title}</h4>
      <ol className="how-steps">
        {steps.map((step, i) => (
          <li className="how-step" key={step.title}>
            <span className="how-step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="how-step-icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="how-step-body">
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
