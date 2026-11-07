import { useEffect, useState } from 'react';
import { deviceCode, getActiveLicenses, type LicenseBody } from '../lib/offlineLicense';
export function OfflineLicenseDashboard(){
 const [licenses,setLicenses]=useState<LicenseBody[]>([]);
 useEffect(()=>{void getActiveLicenses().then(setLicenses);const refresh=()=>void getActiveLicenses().then(setLicenses);window.addEventListener('wisdom-license-changed',refresh);return()=>window.removeEventListener('wisdom-license-changed',refresh);},[]);
 return <section className="card" style={{margin:'16px 0'}}><h3>🔑 המפתחות שלי</h3>
 <p>קוד מכשיר למסירה למוכר: <strong dir="ltr" style={{userSelect:'all'}}>{deviceCode()}</strong></p>
 {licenses.length ? licenses.map(l=><p key={l.id}>{l.features.join(', ')} · פתוח עד {new Date(l.expiresAt).toLocaleDateString('he-IL')}</p>) : <p>טרם הופעלו קטגוריות בתשלום. האימון היומי פתוח.</p>}
 <p style={{fontSize:'.85em'}}>אם סיימת את התרגילים, בקש מהמוכר גרסה מעודכנת של התוכן. המפתחות הקיימים נשמרים בעת עדכון באותו התקן.</p>
 </section>;
}
