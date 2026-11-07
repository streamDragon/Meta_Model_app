import { useState } from 'react';
import { activateLicense, deviceCode } from '../lib/offlineLicense';
export function OfflineKeyGate({featureName,onActivation}:{featureName:string;onActivation:()=>void}) {
  const [code,setCode] = useState('');
  const [status,setStatus] = useState('');
  const [busy,setBusy] = useState(false);
  async function activate() {
    setBusy(true);
    try {const license = await activateLicense(code);setStatus('המפתח הופעל בהצלחה עד '+new Date(license.expiresAt).toLocaleDateString('he-IL'));onActivation();}
    catch(err){setStatus(err instanceof Error ? err.message : 'לא ניתן לפתוח את המפתח');}
    finally{setBusy(false);}
  }
  return <section className="card" style={{maxWidth:680,margin:'24px auto',textAlign:'center'}}>
    <h2>🔑 פתיחת אימון: {featureName}</h2>
    <p>אימון הבסיס פתוח תמיד. כדי לתרגל בקטגוריה הזאת, קבל מפתח מהמוכר.</p>
    <p style={{margin:'18px 0'}}>קוד המכשיר שלך: <strong dir="ltr" style={{userSelect:'all'}}>{deviceCode()}</strong></p>
    <label htmlFor="offline-key">הדבק מפתח או טען אותו מקובץ</label>
    <textarea id="offline-key" value={code} onChange={e=>setCode(e.target.value.trim())} rows={3} dir="ltr" style={{width:'100%',margin:'10px 0'}}/>
    <input type="file" accept=".txt,.wkey" aria-label="טעינת מפתח מקובץ" onChange={async e=>{const file=e.target.files?.[0];if(file) setCode((await file.text()).trim());}}/>
    <div style={{marginTop:14}}><button className="btn btn-primary" type="button" onClick={activate} disabled={busy || !code.trim()}>הפעל מפתח</button></div>
    {status && <p role="status" style={{marginTop:14}}>{status}</p>}
    <p style={{marginTop:16,fontSize:'.9em'}}>אין צורך באינטרנט. אפשר לקבל מפתח על דף או בקובץ USB.</p>
  </section>;
}
