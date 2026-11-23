import type {BridgeLearningCase} from './bridgeCases';

type MapPhase='trap'|'values'|'unlock';

export function BridgeInsightMap({scenario,phase='trap'}:{
  scenario:BridgeLearningCase;phase?:MapPhase;
}) {
  const open=phase==='unlock';
  const needs=phase==='values'||open;
  return <div className={'bridge-insight-map '+(open?'bridge-insight-map--open':'')} role="img"
    aria-label={'מפת המלכוד: '+scenario.values.sideA+' לעומת '+scenario.values.sideB+
      '. קשה לדבר על הסתירה. '+(open?'אפשר לבחון מחדש את הכלל ולמצוא דרך החוצה: '+scenario.escapeRule:'')}>
    <div className="bridge-map-head">
      <strong>המפה של {scenario.name}</strong>
      <span>{open?'פותחים את הכלל':'כך נוצר המלכוד'}</span>
    </div>
    <div className="bridge-map-poles">
      <div className="bridge-map-pole">
        <span>צד אחד</span>
        <strong>{scenario.values.sideA}</strong>
        {needs&&<small>מה הוא שומר? {scenario.values.valueA}</small>}
      </div>
      <div className="bridge-map-pole">
        <span>צד שני</span>
        <strong>{scenario.values.sideB}</strong>
        {needs&&<small>מה הוא שומר? {scenario.values.valueB}</small>}
      </div>
    </div>
    <div className="bridge-map-join" aria-hidden="true"><span>↘</span><span>↙</span></div>
    <div className="bridge-map-trap"><span aria-hidden="true">🔒</span>
      <div><strong>גם לדבר על הסתירה קשה</strong><small>שתי האפשרויות נשארות בתוך אותם כללים</small></div>
    </div>
    {open&&<>
      <div className="bridge-map-down" aria-hidden="true">↓</div>
      <div className="bridge-map-unlock"><span aria-hidden="true">🔓</span>
        <div><strong>שואלים על הכלל, לא רק על הבחירה</strong>
          <p>{scenario.escapeRule}</p>
        </div>
      </div>
    </>}
  </div>;
}
