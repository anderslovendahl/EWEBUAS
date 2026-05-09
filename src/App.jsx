import { useState, useEffect, useRef } from "react";
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[EWEB UAS] Tab crash:', e, info); }
  reset() { this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      const { tab = 'this tab' } = this.props;
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#EF4444', fontFamily: 'monospace', fontWeight: 700, marginBottom: 10 }}>
            {tab} encountered an error
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginBottom: 16, maxWidth: 480, margin: '0 auto 16px' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button onClick={() => this.reset()}
            style={{ background: 'transparent', border: '1px solid #F59E0B', color: '#F59E0B', borderRadius: 5, padding: '7px 18px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}>
            Reload Tab
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const migrateAircraft = a => ({ hours:0, lastMaint:'', nextMaint:'', weightLbs:0, maxAltFt:400, notes:'', status:'airworthy', type:'Multirotor', ...a });
const migratePilot    = p => ({ hours:0, certNum:'', certExpiry:'', lastFlight:'', status:'current', cert:'Part 107', ...p });
const migrateMission  = m => ({ waypoints:[], notams:'', populationDensity:'rural', crew:[], riskScore:null, riskOverride:null, lat:null, lon:null, location:'', altFt:400, time:'09:00', objective:'', notes:'', updatedAt:null, ...m });
const migrateFlight   = f => ({ durationMin:0, takeoffs:1, landings:1, conditions:'', payload:'', notes:'', missionId:'', location:'', ...f });
const migrateBattery  = b => ({ totalCycles:0, maxCycles:400, capacityPct:100, lastCharge:'', status:'good', notes:'', aircraftId:'', ...b });
const migrateIncident = i => ({ status:'draft', severity:'low', asrs:'', notes:'', type:'Other', location:'', pilotId:'', aircraftId:'', ...i });
const migrateEquip    = e => ({ type:'Payload', category:'Camera/Sensor', aircraftId:'', serialNum:'', status:'operational', purchaseDate:'', notes:'', ...e });
const migrateOrgUser  = u => ({ roles: u.roles || (u.role ? [u.role] : ['Observer']), pilotId: null, email: '', ...u });
const migrate = (arr, fn) => Array.isArray(arr) ? arr.map(fn) : null;

const store = {
  async get(k) {
    try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }
    catch(e) { return null; }
  },
  async set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
  }
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const relDate = iso => {
  if (!iso) return null;
  const d = Math.round((new Date() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.round(d/7)}w ago`;
  if (d < 365) return `${Math.round(d/30)}mo ago`;
  return `${Math.round(d/365)}y ago`;
};

const SEED_AC = [
  { id:'ac1', tail:'N-300-01', model:'DJI Matrice 300 RTK', type:'Multirotor', status:'airworthy', hours:142.5, lastMaint:'2026-01-15', nextMaint:'2026-04-15', weightLbs:19.8, maxAltFt:1500, notes:'Primary inspection platform' },
  { id:'ac2', tail:'N-EVO-02', model:'Autel EVO II Pro V3', type:'Multirotor', status:'maintenance', hours:88.2, lastMaint:'2025-11-30', nextMaint:'2026-03-30', weightLbs:7.7, maxAltFt:1200, notes:'Gimbal repair in progress' },
  { id:'ac3', tail:'N-EBX-03', model:'senseFly eBee X', type:'Fixed Wing', status:'airworthy', hours:215.0, lastMaint:'2026-02-01', nextMaint:'2026-05-01', weightLbs:6.6, maxAltFt:3500, notes:'Dedicated mapping aircraft' },
];
const SEED_PILOTS = [
  { id:'p1', name:'Alex Rivera', cert:'Part 107', certNum:'4729381', certExpiry:'2027-03-12', lastFlight:'2026-03-10', hours:340.5, status:'current' },
  { id:'p2', name:'Jordan Kim', cert:'Part 107', certNum:'5103892', certExpiry:'2026-05-22', lastFlight:'2026-02-18', hours:185.0, status:'current' },
  { id:'p3', name:'Sam Torres', cert:'Part 107', certNum:'3847291', certExpiry:'2025-12-01', lastFlight:'2025-11-15', hours:92.0, status:'expired' },
];
const SEED_MISSIONS = [
  { id:'m1', name:'Pipeline Survey Alpha', location:'Eugene, OR', lat:44.0521, lon:-123.0868, date:'2026-03-25', time:'09:00', objective:'Infrastructure inspection', aircraftId:'ac1', pilotId:'p1', status:'planned', altFt:300, notes:'Check valve stations 12-18', waypoints:[], notams:'', populationDensity:'suburban', crew:[{pilotId:'p1',role:'PIC',briefedAt:null},{pilotId:'p2',role:'VO',briefedAt:null}], riskScore:null, riskOverride:null },
  { id:'m2', name:'Ag Mapping Beta', location:'Corvallis, OR', lat:44.5646, lon:-123.2620, date:'2026-03-22', time:'07:30', objective:'Crop health NDVI pass', aircraftId:'ac3', pilotId:'p2', status:'approved', altFt:400, notes:'North field is priority', waypoints:[], notams:'', populationDensity:'rural', crew:[{pilotId:'p2',role:'PIC',briefedAt:null}], riskScore:null, riskOverride:null },
  { id:'m3', name:'Bridge Inspection 7', location:'Springfield, OR', lat:44.0462, lon:-122.9674, date:'2026-03-18', time:'10:00', objective:'Structural documentation', aircraftId:'ac1', pilotId:'p1', status:'completed', altFt:150, notes:'All spans documented', waypoints:[], notams:'EUG 03/142: CRANE OPS 1NM W EUGENE AIRPORT, SFC-400FT AGL.', populationDensity:'urban', crew:[{pilotId:'p1',role:'PIC',briefedAt:'2026-03-18T09:45:00Z'},{pilotId:'p3',role:'VO',briefedAt:'2026-03-18T09:47:00Z'}], riskScore:14, riskOverride:null },
];
const SEED_ORG_USERS = [
  { id:'u1', name:'Alex Rivera',  roles:['Chief Pilot','Pilot'],            pilotId:'p1', email:'alex@eweb.org' },
  { id:'u2', name:'Jordan Kim',   roles:['Pilot','Visual Observer'],        pilotId:'p2', email:'jordan@eweb.org' },
  { id:'u3', name:'Sam Torres',   roles:['Visual Observer','Observer'],     pilotId:'p3', email:'sam@eweb.org' },
  { id:'u4', name:'Casey Morgan', roles:['Safety Officer','Mission Planner'], pilotId:null, email:'casey@eweb.org' },
  { id:'u5', name:'Dana Park',    roles:['Maintenance Tech'],               pilotId:null, email:'dana@eweb.org' },
  { id:'u6', name:'Riley Singh',  roles:['Data Analyst'],                   pilotId:null, email:'riley@eweb.org' },
];
const SEED_FLIGHTS = [
  { id:'f1', missionId:'m3', date:'2026-03-18', pilotId:'p1', aircraftId:'ac1', durationMin:45, location:'Springfield, OR', conditions:'VFR 8kt Clear', payload:'RGB + Thermal', takeoffs:2, landings:2, notes:'No anomalies.' },
  { id:'f2', missionId:'', date:'2026-03-10', pilotId:'p1', aircraftId:'ac3', durationMin:78, location:'Eugene, OR', conditions:'VFR 5kt Partly cloudy', payload:'Multispectral', takeoffs:1, landings:1, notes:'Currency flight' },
  { id:'f3', missionId:'', date:'2026-02-22', pilotId:'p2', aircraftId:'ac3', durationMin:92, location:'Corvallis, OR', conditions:'VFR 3kt Clear', payload:'RGB', takeoffs:1, landings:1, notes:'Ag survey pass 1' },
  { id:'f4', missionId:'', date:'2026-02-10', pilotId:'p2', aircraftId:'ac3', durationMin:65, location:'Corvallis, OR', conditions:'VFR 6kt Overcast', payload:'Multispectral', takeoffs:1, landings:1, notes:'Ag survey pass 2' },
  { id:'f5', missionId:'', date:'2026-01-28', pilotId:'p1', aircraftId:'ac1', durationMin:38, location:'Eugene, OR', conditions:'VFR 10kt Clear', payload:'Thermal', takeoffs:1, landings:1, notes:'Utility inspection' },
  { id:'f6', missionId:'', date:'2026-01-14', pilotId:'p1', aircraftId:'ac2', durationMin:55, location:'Springfield, OR', conditions:'VFR 7kt Clear', payload:'RGB', takeoffs:1, landings:1, notes:'Pre-maintenance check' },
];
const SEED_BATTERIES = [
  { id:'bt1', label:'TB60 #001', aircraftId:'ac1', totalCycles:142, maxCycles:400, capacityPct:94, lastCharge:'2026-03-15', status:'good', notes:'' },
  { id:'bt2', label:'TB60 #002', aircraftId:'ac1', totalCycles:89, maxCycles:400, capacityPct:98, lastCharge:'2026-03-15', status:'good', notes:'' },
  { id:'bt3', label:'TB60 #003', aircraftId:'ac1', totalCycles:318, maxCycles:400, capacityPct:76, lastCharge:'2026-03-10', status:'degraded', notes:'Capacity below 80%' },
  { id:'bt4', label:'EVO-Bat #001', aircraftId:'ac2', totalCycles:201, maxCycles:300, capacityPct:81, lastCharge:'2026-02-20', status:'degraded', notes:'High cycle count' },
  { id:'bt5', label:'EVO-Bat #002', aircraftId:'ac2', totalCycles:156, maxCycles:300, capacityPct:93, lastCharge:'2026-02-20', status:'good', notes:'' },
  { id:'bt6', label:'eBee-Bat #001', aircraftId:'ac3', totalCycles:44, maxCycles:200, capacityPct:99, lastCharge:'2026-03-01', status:'good', notes:'Near-new' },
];
const SEED_INCIDENTS = [
  { id:'in1', date:'2026-02-14', pilotId:'p1', aircraftId:'ac1', location:'Eugene, OR', type:'Airspace', severity:'low', description:'Brief unintentional entry into Class C transition area due to GPS altitude display discrepancy. No conflicts. Pilot immediately descended and exited.', asrs:'', status:'submitted', notes:'GPS firmware updated post-incident.' },
];
const SEED_EQUIPMENT = [
  { id:'eq1', name:'Zenmuse H20T', type:'Payload', category:'Camera/Sensor', aircraftId:'ac1', serialNum:'SN-H20T-00421', status:'operational', purchaseDate:'2024-06-01', notes:'RGB + Thermal + Laser rangefinder' },
  { id:'eq2', name:'MicaSense RedEdge-MX', type:'Payload', category:'Camera/Sensor', aircraftId:'ac3', serialNum:'SN-RE-MX-00182', status:'operational', purchaseDate:'2024-08-15', notes:'5-band multispectral' },
  { id:'eq3', name:'Laird FW-900 Radio', type:'Accessory', category:'Comms', aircraftId:'ac2', serialNum:'SN-FW900-0087', status:'operational', purchaseDate:'2023-11-10', notes:'Extended-range datalink' },
  { id:'eq4', name:'DJI Smart Controller', type:'Ground Station', category:'GCS', aircraftId:'ac1', serialNum:'SN-DSC-5591', status:'operational', purchaseDate:'2024-06-01', notes:'Paired with N-300-01' },
];
const CHECKLIST = [
  { id:'ck1', cat:'Aircraft', item:'Propellers secured and undamaged' },
  { id:'ck2', cat:'Aircraft', item:'Battery charge 80% or higher' },
  { id:'ck3', cat:'Aircraft', item:'Gimbal lock removed, gimbal calibrated' },
  { id:'ck4', cat:'Aircraft', item:'Memory card formatted and inserted' },
  { id:'ck5', cat:'Aircraft', item:'All arms and landing gear locked' },
  { id:'ck6', cat:'Ground Station', item:'Remote controller charged and paired' },
  { id:'ck7', cat:'Ground Station', item:'Video downlink signal confirmed' },
  { id:'ck8', cat:'Ground Station', item:'Return-to-home altitude set' },
  { id:'ck9', cat:'Navigation', item:'GPS lock 8 or more satellites acquired' },
  { id:'ck10', cat:'Navigation', item:'Compass calibration current' },
  { id:'ck11', cat:'Airspace', item:'NOTAM check complete' },
  { id:'ck12', cat:'Airspace', item:'Airspace authorization confirmed (LAANC or waiver)' },
  { id:'ck13', cat:'Airspace', item:'Flight area inspected for obstacles and hazards' },
  { id:'ck14', cat:'Crew', item:'Pilot certificate on person' },
  { id:'ck15', cat:'Crew', item:'Flight plan briefed to all crew' },
  { id:'ck16', cat:'Crew', item:'Emergency procedures reviewed' },
  { id:'ck17', cat:'Weather', item:'Wind speed under 25 kts confirmed' },
  { id:'ck18', cat:'Weather', item:'Ceiling 500ft AGL or higher, visibility 3SM or more' },
  { id:'ck19', cat:'Weather', item:'No thunderstorm activity within 5 NM' },
];
const AIRPORTS = [
  { name:'Eugene Airport', id:'EUG', lat:44.1246, lon:-123.2119, cls:'C', radiusNm:5 },
  { name:'Corvallis Municipal', id:'CVO', lat:44.4972, lon:-123.2903, cls:'D', radiusNm:4 },
  { name:'McNary Field Salem', id:'SLE', lat:44.9095, lon:-123.0027, cls:'D', radiusNm:4 },
  { name:'Portland Intl', id:'PDX', lat:45.5898, lon:-122.5951, cls:'C', radiusNm:10 },
  { name:'Hillsboro Airport', id:'HIO', lat:45.5404, lon:-122.9499, cls:'D', radiusNm:4 },
  { name:'Redmond Municipal', id:'RDM', lat:44.2541, lon:-121.1497, cls:'D', radiusNm:4 },
  { name:'Medford Rogue Valley', id:'MFR', lat:42.3742, lon:-122.8735, cls:'C', radiusNm:5 },
];

const WX_CODE = { 0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Icing fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm',96:'T-storm+hail',99:'T-storm+heavy hail' };
const wxGoNogo = (wx) => {
  if (!wx) return null;
  const code = wx.weather_code, wind = wx.wind_speed_10m, gust = wx.wind_gusts_10m, vis = wx.visibility / 1609.34;
  if ([95,96,99].includes(code)) return { go:false, reason:'Thunderstorm — NO-GO' };
  if ([45,48].includes(code)) return { go:false, reason:'Fog/icing — NO-GO' };
  if (gust > 35) return { go:false, reason:`Gusts ${gust.toFixed(0)} mph — NO-GO` };
  if (wind > 25) return { go:false, reason:`Wind ${wind.toFixed(0)} mph — CAUTION` };
  if (vis < 3) return { go:false, reason:`Vis ${vis.toFixed(1)} SM — NO-GO` };
  if ([71,73,75].includes(code)) return { go:false, reason:'Snow — verify aircraft' };
  if (wind > 18) return { go:true, marginal:true, reason:`Wind ${wind.toFixed(0)} mph — marginal` };
  return { go:true, reason:'Nominal — GO' };
};
const nmBetween = (lat1, lon1, lat2, lon2) => {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
const getAirspaceAdvisory = (lat, lon, altFt) => {
  const w = [];
  if (altFt > 400) w.push({ level:'warn', msg:`Altitude ${altFt}ft exceeds 400ft AGL default` });
  AIRPORTS.forEach(ap => {
    const nm = nmBetween(lat, lon, ap.lat, ap.lon);
    if (nm <= ap.radiusNm) w.push({ level:'stop', msg:`Inside Class ${ap.cls} (${ap.id}) — LAANC required (${nm.toFixed(1)} NM)` });
    else if (nm <= ap.radiusNm + 3) w.push({ level:'info', msg:`${ap.id} Class ${ap.cls}: ${nm.toFixed(1)} NM — near boundary` });
  });
  if (!w.length) w.push({ level:'ok', msg:'No controlled airspace conflicts within 7 NM' });
  return w;
};
const geocode = async (loc) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`, { headers: { 'User-Agent': 'SkyVaultOps/4.0' } });
    const d = await r.json();
    return d.length ? { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) } : null;
  } catch(e) { return null; }
};
const fetchWeather = async (lat, lon) => {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,visibility,precipitation,weather_code,relative_humidity_2m&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code,precipitation_probability&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto&forecast_hours=24`);
    const d = await r.json();
    return { current: d.current || null, hourly: d.hourly || null };
  } catch(e) { return null; }
};
const WIND_DIR = d => { const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']; return dirs[Math.round((d%360)/22.5)%16]; };
const useLeaflet = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setReady(true);
    document.head.appendChild(js);
  }, []);
  return ready;
};
const callAI = async (messages, sys, maxTokens = 1200) => {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:maxTokens, system:sys, messages })
  });
  const d = await r.json();
  return d.content?.map(b => b.text || '').join('') || 'No response.';
};

const exportCSV = (flights, aircraft, pilots, missions) => {
  const hdr = ['Date','Mission','Location','Aircraft','Pilot','Duration(min)','Takeoffs','Landings','Payload','Notes'];
  const rows = [...flights].sort((a,b) => b.date.localeCompare(a.date)).map(f => [
    f.date, missions.find(m => m.id===f.missionId)?.name||'Ad-hoc', f.location,
    aircraft.find(a => a.id===f.aircraftId)?.tail||'', pilots.find(p => p.id===f.pilotId)?.name||'',
    f.durationMin, f.takeoffs, f.landings, f.payload, f.notes
  ]);
  const csv = [hdr,...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  Object.assign(document.createElement('a'), { href:url, download:'eweb-uas-flights.csv' }).click();
  URL.revokeObjectURL(url);
};
const printPreFlight = (mission, ac, pilot, checklist, checked, notams) => {
  const cats = [...new Set(checklist.map(c => c.cat))];
  const total = checklist.length, done = Object.values(checked).filter(Boolean).length;
  const now = new Date().toLocaleString();
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Pre-Flight Record</title>
  <style>body{font-family:monospace;background:#fff;color:#111;padding:32px;font-size:12px;}
  h1{font-size:16px;margin:0 0 4px;}.sub{color:#555;font-size:11px;margin-bottom:24px;}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;background:#f5f5f5;padding:16px;border-radius:6px;margin-bottom:24px;}
  .ml{font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#777;margin-bottom:3px;}.mv{font-size:12px;font-weight:700;}
  .cat{font-size:9px;text-transform:uppercase;color:#555;margin:18px 0 6px;font-weight:700;border-bottom:1px solid #ddd;padding-bottom:4px;}
  .item{display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #f0f0f0;}
  .box{width:14px;height:14px;border:1.5px solid #ccc;border-radius:3px;flex-shrink:0;}
  .checked{border-color:#10B981;background:#10B981;}
  .notam{background:#fffbf0;border:1px solid #e5d087;border-radius:6px;padding:14px;margin-top:20px;white-space:pre-wrap;font-size:11px;line-height:1.6;}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;}
  .sig{border-top:1px solid #000;padding-top:6px;font-size:10px;color:#777;}</style>
  </head><body>
  <h1>EWEB UAS OPS — Pre-Flight Record</h1>
  <div class="sub">Printed: ${now} | ${done}/${total} complete</div>
  <div class="meta">
    <div><div class="ml">Mission</div><div class="mv">${mission.name}</div></div>
    <div><div class="ml">Location</div><div class="mv">${mission.location}</div></div>
    <div><div class="ml">Date/Time</div><div class="mv">${mission.date} ${mission.time}</div></div>
    <div><div class="ml">Altitude</div><div class="mv">${mission.altFt}ft AGL</div></div>
    <div><div class="ml">Aircraft</div><div class="mv">${ac?.tail||'—'}</div></div>
    <div><div class="ml">Pilot</div><div class="mv">${pilot?.name||'—'}</div></div>
    <div><div class="ml">Certificate</div><div class="mv">${pilot?.cert||'—'} #${pilot?.certNum||'—'}</div></div>
    <div><div class="ml">Objective</div><div class="mv">${mission.objective||'—'}</div></div>
  </div>
  ${cats.map(cat => `<div class="cat">${cat}</div>` + checklist.filter(c => c.cat===cat).map(item =>
    `<div class="item"><div class="box ${checked[item.id]?'checked':''}"></div>
    <span style="${checked[item.id]?'text-decoration:line-through;color:#aaa':''}">${item.item}</span></div>`
  ).join('')).join('')}
  ${notams ? `<div class="notam"><strong>NOTAM LOG:</strong>\n${notams}</div>` : ''}
  <div class="footer">
    <div><div class="sig">Pilot-in-Command Signature</div></div>
    <div><div class="sig">Safety Observer / VO</div></div>
    <div><div class="sig">Date / Time Signed</div></div>
  </div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
};
const printIncident = (inc, pilotName, acTail) => {
  const now = new Date().toLocaleString();
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Incident Report</title>
  <style>body{font-family:monospace;background:#fff;color:#111;padding:32px;font-size:12px;}
  h1{font-size:16px;margin:0 0 4px;}.sub{color:#555;font-size:11px;margin-bottom:24px;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;background:#f5f5f5;padding:16px;border-radius:6px;margin-bottom:24px;}
  .lbl{font-size:9px;text-transform:uppercase;color:#777;margin-bottom:3px;}.val{font-size:12px;font-weight:700;}
  .sec{font-size:11px;text-transform:uppercase;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin:20px 0 8px;font-weight:700;}
  .body{font-size:12px;line-height:1.7;background:#fafafa;border:1px solid #eee;border-radius:4px;padding:14px;white-space:pre-wrap;}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;display:grid;grid-template-columns:1fr 1fr;gap:32px;}
  .sig{border-top:1px solid #000;padding-top:6px;font-size:10px;color:#777;}</style>
  </head><body>
  <h1>EWEB UAS OPS — Incident Report</h1>
  <div class="sub">Generated: ${now} | Status: ${inc.status}</div>
  <div class="grid">
    <div><div class="lbl">Date</div><div class="val">${inc.date}</div></div>
    <div><div class="lbl">Type</div><div class="val">${inc.type}</div></div>
    <div><div class="lbl">Severity</div><div class="val">${inc.severity.toUpperCase()}</div></div>
    <div><div class="lbl">Location</div><div class="val">${inc.location}</div></div>
    <div><div class="lbl">Pilot</div><div class="val">${pilotName}</div></div>
    <div><div class="lbl">Aircraft</div><div class="val">${acTail}</div></div>
  </div>
  <div class="sec">Incident Description</div>
  <div class="body">${inc.description}</div>
  ${inc.asrs ? `<div class="sec">ASRS Draft Narrative</div><div class="body">${inc.asrs}</div>` : ''}
  <div class="sec">Notes / Corrective Actions</div>
  <div class="body">${inc.notes || 'None recorded.'}</div>
  <div class="footer">
    <div><div class="sig">Reporting Pilot / PIC</div></div>
    <div><div class="sig">Safety Officer</div></div>
  </div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
};

const C = {
  bg:'#090C12', card:'#0F1520', card2:'#141B28', border:'#1C2438', border2:'#263147',
  amber:'#F59E0B', green:'#10B981', red:'#EF4444', blue:'#60A5FA', purple:'#A78BFA',
  teal:'#2DD4BF', orange:'#FB923C', text:'#E2E8F0', mid:'#94A3B8', dim:'#475569',
  mono:"'Space Mono','Courier New',monospace", sans:"'DM Sans',system-ui,sans-serif",
};
const SCOL = {
  airworthy:C.green, maintenance:C.amber, grounded:C.red,
  current:C.green, expired:C.red, pending:C.amber,
  planned:C.blue, approved:C.green, completed:C.dim, cancelled:C.red,
  good:C.green, degraded:C.amber, retired:C.red,
  operational:C.green, unserviceable:C.red, storage:C.dim,
  low:C.green, medium:C.amber, high:C.orange, critical:C.red,
  draft:C.amber, submitted:C.blue, closed:C.dim,
  LOW:C.green, MEDIUM:C.amber, HIGH:C.orange, CRITICAL:C.red,
};
const TODAY = new Date().toISOString().split('T')[0];

const ORG_ROLES = ['Admin','Chief Pilot','Safety Officer','Maintenance Tech','Mission Planner','Pilot','Visual Observer','Data Analyst','Observer'];
const ROLE_COLORS = {
  'Admin':'#F472B6','Chief Pilot':C.amber,'Safety Officer':C.red,'Maintenance Tech':C.orange,
  'Mission Planner':C.teal,'Pilot':C.green,'Visual Observer':C.blue,'Data Analyst':C.purple,'Observer':C.dim,
};
const ROLE_PRIORITY = ['Admin','Chief Pilot','Safety Officer','Maintenance Tech','Mission Planner','Pilot','Visual Observer','Data Analyst','Observer'];
const ROLE_PERMS = {
  'Admin':['createMission','editMission','deleteMission','approveMission','completeMission','editFleet','editBatteries','editPilots','editEquipment','logFlight','editLog','deleteLog','editIncidents','viewAnalytics','exportData','manageOrg','overrideRisk','signBriefing'],
  'Chief Pilot':['createMission','editMission','deleteMission','approveMission','completeMission','editFleet','editBatteries','editPilots','editEquipment','logFlight','editLog','deleteLog','editIncidents','viewAnalytics','exportData','overrideRisk','signBriefing'],
  'Safety Officer':['createMission','editMission','approveMission','completeMission','editPilots','logFlight','editIncidents','viewAnalytics','exportData','overrideRisk','signBriefing'],
  'Maintenance Tech':['editFleet','editBatteries','editEquipment','viewAnalytics'],
  'Mission Planner':['createMission','editMission','viewAnalytics'],
  'Pilot':['createMission','logFlight','signBriefing'],
  'Visual Observer':['signBriefing'],
  'Data Analyst':['viewAnalytics','exportData'],
  'Observer':[],
};
const ALL_PERMS = [
  { id:'createMission',label:'Create Missions',group:'Missions' },{ id:'editMission',label:'Edit Missions',group:'Missions' },
  { id:'deleteMission',label:'Delete Missions',group:'Missions' },{ id:'approveMission',label:'Approve Missions',group:'Missions' },
  { id:'completeMission',label:'Complete Missions',group:'Missions' },{ id:'editFleet',label:'Edit Fleet',group:'Assets' },
  { id:'editBatteries',label:'Edit Batteries',group:'Assets' },{ id:'editEquipment',label:'Edit Equipment',group:'Assets' },
  { id:'editPilots',label:'Edit Pilots',group:'People' },{ id:'manageOrg',label:'Manage Org & Roles',group:'People' },
  { id:'logFlight',label:'Log Flights',group:'Operations' },{ id:'editLog',label:'Edit Flight Records',group:'Operations' },
  { id:'deleteLog',label:'Delete Flight Records',group:'Operations' },{ id:'editIncidents',label:'Manage Incidents',group:'Operations' },
  { id:'signBriefing',label:'Sign Crew Briefings',group:'Operations' },{ id:'overrideRisk',label:'Override Risk Score',group:'Safety' },
  { id:'viewAnalytics',label:'View Analytics',group:'Data' },{ id:'exportData',label:'Export Data',group:'Data' },
];
const userPerms = (user) => {
  if (!user) return [];
  const roles = user.roles || (user.role ? [user.role] : []);
  return [...new Set(roles.flatMap(r => ROLE_PERMS[r] || []))];
};
const primaryRole = (user) => {
  const roles = user?.roles || (user?.role ? [user.role] : []);
  return ROLE_PRIORITY.find(r => roles.includes(r)) || roles[0] || 'Observer';
};
const can = (user, action) => userPerms(user).includes(action);

const RISK_CATS = [
  { id:'airspace',label:'Airspace Class',max:6 },{ id:'altitude',label:'Altitude',max:4 },
  { id:'pilotRecency',label:'Pilot Recency',max:5 },{ id:'maintenance',label:'Aircraft Maintenance',max:5 },
  { id:'population',label:'Population Density',max:6 },{ id:'timeOfDay',label:'Time of Day',max:4 },
  { id:'weather',label:'Weather Conditions',max:6 },
];
const RISK_MAX = 36;
const RISK_LEVELS = [
  { label:'LOW',max:10,color:C.green },{ label:'MEDIUM',max:18,color:C.amber },
  { label:'HIGH',max:26,color:C.orange },{ label:'CRITICAL',max:99,color:C.red },
];
const getRiskLevel = score => RISK_LEVELS.find(r => score <= r.max) || RISK_LEVELS[3];
const RISK_OVERRIDE_THRESHOLD = 19;

function calcRisk(mission, pilot, aircraft, wx) {
  const s = {};
  if (mission?.lat && mission?.lon) {
    const w = getAirspaceAdvisory(mission.lat, mission.lon, mission.altFt || 0);
    if (w.some(x => x.level==='stop'))      s.airspace = { v:6, note:'Inside controlled airspace' };
    else if (w.some(x => x.level==='info')) s.airspace = { v:3, note:'Near airspace boundary' };
    else                                     s.airspace = { v:0, note:'No airspace conflicts' };
  } else {
    s.airspace = { v:2, note:'Location unverified — check manually' };
  }
  const alt = Number(mission?.altFt)||0;
  s.altitude = alt>400 ? { v:4, note:`${alt}ft AGL — waiver required` } : alt>200 ? { v:2, note:`${alt}ft AGL — moderate altitude` } : { v:0, note:`${alt}ft AGL — within standard limits` };
  if (pilot?.lastFlight) {
    const d = Math.round((new Date(TODAY)-new Date(pilot.lastFlight))/864e5);
    s.pilotRecency = d>90 ? { v:5, note:`${d} days since last flight` } : d>30 ? { v:3, note:`${d} days since last flight` } : d>14 ? { v:1, note:`${d} days — recent` } : { v:0, note:`${d} days — current` };
  } else { s.pilotRecency = { v:3, note:'No flight history on record' }; }
  if (aircraft?.lastMaint) {
    const d = Math.round((new Date(TODAY)-new Date(aircraft.lastMaint))/864e5);
    s.maintenance = d>180 ? { v:5, note:`${d} days — overdue` } : d>90 ? { v:3, note:`${d} days — due soon` } : d>30 ? { v:1, note:`${d} days — acceptable` } : { v:0, note:`${d} days — current` };
  } else { s.maintenance = { v:3, note:'No maintenance record' }; }
  const pop = mission?.populationDensity||'rural';
  const popMap = { rural:{v:0,note:'Rural — low ground risk'}, suburban:{v:2,note:'Suburban area'}, urban:{v:4,note:'Urban — elevated ground risk'}, congested:{v:6,note:'Congested — maximum ground risk'} };
  s.population = popMap[pop] || popMap.rural;
  const h = parseInt((mission?.time||'10:00').split(':')[0]);
  s.timeOfDay = (h<6||h>=20) ? { v:4, note:'Night operations' } : (h<7||h>=19) ? { v:2, note:'Twilight — reduced visibility' } : { v:0, note:'Daylight operations' };
  if (wx) {
    const vd = wxGoNogo(wx);
    if (!vd?.go) s.weather = { v:6, note:vd?.reason || 'Unacceptable conditions' };
    else if (vd?.marginal) s.weather = { v:3, note:vd.reason };
    else { const w = wx.wind_speed_10m||0; s.weather = w>15 ? { v:2, note:`${w.toFixed(0)} mph wind — elevated` } : { v:0, note:'Conditions nominal' }; }
  } else { s.weather = { v:2, note:'Live weather not yet checked' }; }
  const total = Object.values(s).reduce((a,x) => a+x.v, 0);
  return { scores:s, total };
}

function Badge({ status, label }) {
  const col = SCOL[status] || C.dim;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:col+'18', border:`1px solid ${col}44`, color:col, borderRadius:4, padding:'2px 8px', fontSize:10, fontFamily:C.mono, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700, whiteSpace:'nowrap' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:col, flexShrink:0 }}/>{label || status}
    </span>
  );
}
function Card({ children, style }) {
  return <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, ...style }}>{children}</div>;
}
function StatCard({ label, value, sub, accent }) {
  return (
    <Card style={{ padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:accent||C.amber, borderRadius:'4px 0 0 4px' }}/>
      <div style={{ fontSize:10, color:C.dim, fontFamily:C.mono, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, fontFamily:C.mono, color:C.text, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.mid, marginTop:5 }}>{sub}</div>}
    </Card>
  );
}
function SectionHeader({ title, extra, onAdd, addLabel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <h2 style={{ fontSize:11, fontFamily:C.mono, color:C.amber, letterSpacing:'0.14em', textTransform:'uppercase', margin:0 }}>{title}</h2>
      <div style={{ display:'flex', gap:8 }}>
        {extra}
        {onAdd && <button onClick={onAdd} style={{ background:'transparent', border:`1px solid ${C.amber}`, color:C.amber, borderRadius:5, padding:'6px 14px', fontSize:11, fontFamily:C.mono, cursor:'pointer' }}>{addLabel || '+ Add'}</button>}
      </div>
    </div>
  );
}
function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontFamily:C.mono, color:C.dim, letterSpacing:'0.1em', textTransform:'uppercase', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, ri) => (<tr key={ri} style={{ borderBottom:`1px solid ${C.border}20` }}>{row.map((cell, ci) => <td key={ci} style={{ padding:'10px 14px', color:C.mid, verticalAlign:'middle' }}>{cell}</td>)}</tr>))}
          {!rows.length && (<tr><td colSpan={headers.length} style={{ padding:32, textAlign:'center', color:C.dim, fontFamily:C.mono, fontSize:11 }}>No records</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
function Field({ label, children }) {
  return (<div style={{ marginBottom:12 }}><label style={{ display:'block', fontSize:10, fontFamily:C.mono, color:C.dim, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>{label}</label>{children}</div>);
}
function Btn({ onClick, children, variant = 'ghost', disabled, xstyle }) {
  const styles = {
    primary: { background: disabled ? '#451A03' : C.amber, color:'#000', border:'none' },
    ghost:   { background:'transparent', color:C.mid, border:`1px solid ${C.border2}` },
    green:   { background:'transparent', color:C.green, border:`1px solid ${C.green}` },
    amber:   { background:'transparent', color:C.amber, border:`1px solid ${C.amber}` },
    red:     { background:'transparent', color:C.red, border:`1px solid ${C.red}` },
    blue:    { background:'transparent', color:C.blue, border:`1px solid ${C.blue}` },
    purple:  { background:'transparent', color:C.purple, border:`1px solid ${C.purple}` },
    teal:    { background:'transparent', color:C.teal, border:`1px solid ${C.teal}` },
    orange:  { background:'transparent', color:C.orange, border:`1px solid ${C.orange}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], borderRadius:5, padding:'7px 14px', fontSize:11, fontFamily:C.mono, letterSpacing:'0.04em', fontWeight: variant==='primary' ? 700 : 400, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...xstyle }}>{children}</button>
  );
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:200, paddingTop:60, paddingLeft:16, paddingRight:16 }}>
      <div style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:10, width:'100%', maxWidth: wide ? 660 : 520, maxHeight:'84vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:C.card2 }}>
          <span style={{ fontFamily:C.mono, fontSize:11, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.dim, fontSize:20, cursor:'pointer', lineHeight:1 }}>x</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}
function ConfirmModal({ message, label, onConfirm, onCancel }) {
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.86)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}>
      <div style={{ background:C.card2, border:`1px solid ${C.red}50`, borderRadius:10, width:'100%', maxWidth:380, padding:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:20 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:`${C.red}18`, border:`1px solid ${C.red}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke={C.red} strokeWidth="1.5" strokeLinejoin="round"/><line x1="8" y1="7" x2="8" y2="10" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="12" r="0.75" fill={C.red}/></svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>{message}</div>
            {label && <div style={{ fontSize:11, color:C.dim, fontFamily:C.mono, background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:'4px 10px', display:'inline-block' }}>{label}</div>}
            <div style={{ fontSize:11, color:C.dim, marginTop:8 }}>This action cannot be undone.</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}><Btn onClick={onCancel}>Cancel</Btn><Btn variant='red' onClick={onConfirm}>Delete</Btn></div>
      </div>
    </div>
  );
}
function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = ({ message, label }) => new Promise(resolve => setState({ message, label, resolve }));
  const handleConfirm = () => { state?.resolve(true); setState(null); };
  const handleCancel  = () => { state?.resolve(false); setState(null); };
  const confirmEl = state ? <ConfirmModal message={state.message} label={state.label} onConfirm={handleConfirm} onCancel={handleCancel}/> : null;
  return { confirm, confirmEl };
}
function PermDenied({ action }) {
  return (
    <Card style={{ padding:'32px 24px', textAlign:'center', border:`1px solid ${C.red}30`, background:`${C.red}08` }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom:12 }}><circle cx="16" cy="16" r="13" stroke={C.red} strokeWidth="1.5"/><line x1="10" y1="16" x2="22" y2="16" stroke={C.red} strokeWidth="2" strokeLinecap="round"/></svg>
      <div style={{ fontSize:13, fontWeight:600, color:C.red, fontFamily:C.mono, marginBottom:6 }}>Access Denied</div>
      <div style={{ fontSize:12, color:C.dim }}>Your current role does not include the <strong style={{ color:C.mid }}>{action}</strong> permission.</div>
      <div style={{ fontSize:11, color:C.dim, marginTop:6 }}>Switch to a user with the required role via the user menu in the header.</div>
    </Card>
  );
}

function WeatherPanel({ location, lat, lon }) {
  const [wxData, setWxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const prevKey = useRef('');
  useEffect(() => {
    const key = lat ? `${lat},${lon}` : location;
    if (!key || key === prevKey.current) return;
    prevKey.current = key;
    setLoading(true); setErr(null); setWxData(null);
    (async () => {
      let lt = lat, ln = lon;
      if (!lt && location) { const g = await geocode(location); if (!g) { setErr('Location not found'); setLoading(false); return; } lt = g.lat; ln = g.lon; }
      const data = await fetchWeather(lt, ln);
      if (!data?.current) { setErr('Weather unavailable'); setLoading(false); return; }
      setWxData(data); setLoading(false);
    })();
  }, [location, lat, lon]);
  if (!location && !lat) return null;
  if (loading) return <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, fontSize:11, color:C.dim, fontFamily:C.mono }}>Fetching weather…</div>;
  if (err) return <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, fontSize:11, color:C.red, fontFamily:C.mono }}>{err}</div>;
  if (!wxData?.current) return null;
  const wx = wxData.current;
  const verdict = wxGoNogo(wx);
  const gc = verdict?.go ? C.green : C.red;
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.card2 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:C.teal, letterSpacing:'0.12em', textTransform:'uppercase' }}>Live Weather · {location || `${lat?.toFixed(3)},${lon?.toFixed(3)}`}</span>
        <span style={{ fontSize:10, fontFamily:C.mono, color:gc, background:gc+'18', border:`1px solid ${gc}44`, borderRadius:4, padding:'2px 8px', fontWeight:700 }}>{verdict?.go ? 'GO' : 'NO-GO'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(80px,1fr))', gap:8, marginBottom:10 }}>
        {[['Conditions', WX_CODE[wx.weather_code] || `Code ${wx.weather_code}`],['Wind', `${wx.wind_speed_10m?.toFixed(0)} mph ${wx.wind_direction_10m != null ? WIND_DIR(wx.wind_direction_10m) : ''}`],['Gusts', `${wx.wind_gusts_10m?.toFixed(0)} mph`],['Visibility', `${(wx.visibility/1609.34).toFixed(1)} SM`],['Cloud', `${wx.cloud_cover}%`],['Temp', `${wx.temperature_2m?.toFixed(0)}°F`],['Humidity', `${wx.relative_humidity_2m}%`]].map(([l, v]) => (
          <div key={l} style={{ background:C.card, borderRadius:5, padding:'7px 9px', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:11, fontFamily:C.mono, color:C.text, fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color: verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red, fontFamily:C.mono, borderRadius:5, padding:'7px 12px', border:`1px solid ${(verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red)}40`, background:`${(verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red)}12`, marginBottom:0 }}>{verdict?.reason}</div>
      <WeatherForecast hourly={wxData.hourly}/>
    </div>
  );
}
function AirspacePanel({ location, lat, lon, altFt }) {
  const [data, setData] = useState(null);
  const prevKey = useRef('');
  useEffect(() => {
    const key = lat ? `${lat},${lon}` : location;
    if (!key || key === prevKey.current) return;
    prevKey.current = key;
    (async () => {
      let lt = lat, ln = lon;
      if (!lt && location) { const g = await geocode(location); if (!g) { setData([]); return; } lt = g.lat; ln = g.lon; }
      setData(getAirspaceAdvisory(lt, ln, altFt || 400));
    })();
  }, [location, lat, lon, altFt]);
  if (!data) return null;
  const lc = { stop:C.red, warn:C.amber, info:C.blue, ok:C.green };
  const li = { stop:'!', warn:'!', info:'i', ok:'✓' };
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:C.purple, letterSpacing:'0.12em', textTransform:'uppercase' }}>Airspace Advisory</span>
        <a href="https://faa.maps.arcgis.com/apps/webappviewer/index.html?id=9c2e4406710048e19806ebf6a06754ad" target="_blank" rel="noreferrer" style={{ fontSize:10, fontFamily:C.mono, color:C.blue, textDecoration:'none' }}>B4UFLY →</a>
      </div>
      {data.map((w, i) => {
        const col = lc[w.level] || C.dim;
        return (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 11px', borderRadius:5, background:col+'10', border:`1px solid ${col}30`, marginBottom:6 }}>
            <span style={{ width:16, height:16, borderRadius:'50%', background:col+'22', border:`1px solid ${col}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:col, fontWeight:700, flexShrink:0, marginTop:1 }}>{li[w.level]}</span>
            <span style={{ fontSize:11, color:col, lineHeight:1.5 }}>{w.msg}</span>
          </div>
        );
      })}
      <div style={{ fontSize:10, color:C.dim, marginTop:6, fontFamily:C.mono }}>Advisory only. Always verify via FAA B4UFLY, LAANC, and NOTAMs before flight.</div>
    </div>
  );
}

function OpsMap({ missions, onSelectMission, height = 340 }) {
  const leafletReady = useLeaflet();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    if (mapInstance.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([44.05, -123.09], 10);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [leafletReady]);
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L, map = mapInstance.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    const statusCol = { planned:'#60A5FA', approved:'#10B981', completed:'#475569', cancelled:'#EF4444' };
    const bounds = [];
    missions.forEach(m => {
      if (!m.lat || !m.lon) return;
      const sc = statusCol[m.status] || '#475569';
      const icon = L.divIcon({ className:'', html:`<div style="width:14px;height:14px;background:${sc};border:2px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 0 8px ${sc}80"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
      const marker = L.marker([m.lat, m.lon], { icon }).addTo(map);
      marker.bindPopup(`<div style="font-family:monospace;font-size:11px;min-width:150px;line-height:1.6"><strong style="font-size:12px">${m.name}</strong><br/>${m.location}<br/>${m.date} · <span style="color:${sc};font-weight:700">${m.status.toUpperCase()}</span><br/>${m.altFt||400}ft AGL · ${m.objective||''}</div>`, { className:'dark-popup' });
      if (onSelectMission) marker.on('click', () => onSelectMission(m.id));
      markersRef.current.push(marker);
      bounds.push([m.lat, m.lon]);
    });
    AIRPORTS.forEach(ap => {
      const icon = L.divIcon({ className:'', html:`<div style="width:8px;height:8px;background:${C.purple}99;border:1.5px solid ${C.purple};border-radius:2px;"></div>`, iconSize:[8,8], iconAnchor:[4,4] });
      const marker = L.marker([ap.lat, ap.lon], { icon, interactive:true }).addTo(map);
      marker.bindTooltip(`${ap.id} · Class ${ap.cls}`, { permanent:false, direction:'top', className:'', offset:[0,-6] });
      markersRef.current.push(marker);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding:[30,30] });
    else if (bounds.length === 1) map.setView(bounds[0], 12);
  }, [missions, leafletReady]);
  if (!leafletReady) return <div style={{ height, background:C.card, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:11, color:C.dim, border:`1px solid ${C.border}` }}>Loading map…</div>;
  return <div ref={mapRef} style={{ height, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}/>;
}

function MissionMapView({ mission, height = 280 }) {
  const leafletReady = useLeaflet();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  useEffect(() => {
    if (!leafletReady || !mapRef.current || !mission?.lat) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl:true, attributionControl:false }).setView([mission.lat, mission.lon], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
    const sc = { planned:'#60A5FA', approved:'#10B981', completed:'#475569', cancelled:'#EF4444' }[mission.status] || '#F59E0B';
    const icon = L.divIcon({ className:'', html:`<div style="width:16px;height:16px;background:${sc};border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px ${sc}"></div>`, iconSize:[16,16], iconAnchor:[8,8] });
    L.marker([mission.lat, mission.lon], { icon }).addTo(map);
    L.circle([mission.lat, mission.lon], { radius:(mission.altFt||400)*0.3048, color:sc, fillColor:sc, fillOpacity:0.08, weight:1.5, dashArray:'6 4' }).addTo(map);
    AIRPORTS.forEach(ap => {
      const nm = nmBetween(mission.lat, mission.lon, ap.lat, ap.lon);
      if (nm <= ap.radiusNm + 5) {
        L.circle([ap.lat, ap.lon], { radius:ap.radiusNm*1852, color:C.purple, fillColor:C.purple, fillOpacity:0.04, weight:1, dashArray:'4 4' }).addTo(map);
        const apIcon = L.divIcon({ className:'', html:`<div style="font-family:monospace;font-size:9px;color:${C.purple};background:${C.card}cc;padding:1px 4px;border-radius:2px;border:1px solid ${C.purple}60;white-space:nowrap">${ap.id} · ${ap.cls}</div>`, iconSize:'auto', iconAnchor:[0,0] });
        L.marker([ap.lat, ap.lon], { icon:apIcon }).addTo(map);
      }
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [leafletReady, mission?.lat, mission?.lon, mission?.status]);
  if (!mission?.lat) return <Card style={{ padding:'16px', textAlign:'center' }}><span style={{ fontSize:11, color:C.dim, fontFamily:C.mono }}>No coordinates set — edit mission to add location</span></Card>;
  if (!leafletReady) return <div style={{ height, background:C.card, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:11, color:C.dim }}>Loading map…</div>;
  return <div ref={mapRef} style={{ height, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}`, marginBottom:12 }}/>;
}

function MapPicker({ lat, lon, onChange }) {
  const leafletReady = useLeaflet();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    const L = window.L;
    const center = lat && lon ? [lat, lon] : [44.05, -123.09];
    const zoom = lat && lon ? 14 : 10;
    const map = L.map(mapRef.current, { zoomControl:true, attributionControl:false }).setView(center, zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
    if (lat && lon) {
      const icon = L.divIcon({ className:'', html:`<div style="width:14px;height:14px;background:${C.amber};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px ${C.amber}"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
      markerRef.current = L.marker([lat, lon], { icon, draggable:true }).addTo(map);
      markerRef.current.on('dragend', e => { const p = e.target.getLatLng(); onChange(+p.lat.toFixed(6), +p.lng.toFixed(6)); });
    }
    map.on('click', e => {
      const p = e.latlng;
      onChange(+p.lat.toFixed(6), +p.lng.toFixed(6));
    });
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [leafletReady]);
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L, map = mapInstance.current;
    if (markerRef.current) map.removeLayer(markerRef.current);
    if (lat && lon) {
      const icon = L.divIcon({ className:'', html:`<div style="width:14px;height:14px;background:${C.amber};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px ${C.amber}"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
      markerRef.current = L.marker([lat, lon], { icon, draggable:true }).addTo(map);
      markerRef.current.on('dragend', e => { const p = e.target.getLatLng(); onChange(+p.lat.toFixed(6), +p.lng.toFixed(6)); });
    }
  }, [lat, lon]);
  if (!leafletReady) return <div style={{ height:200, background:C.card, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:11, color:C.dim }}>Loading map…</div>;
  return (
    <div>
      <div ref={mapRef} style={{ height:200, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}/>
      <div style={{ fontSize:10, color:C.dim, fontFamily:C.mono, marginTop:4 }}>Click map to set coordinates · drag marker to adjust</div>
    </div>
  );
}

function WeatherForecast({ hourly }) {
  if (!hourly?.time) return null;
  const now = new Date();
  const hours = hourly.time.map((t,i) => ({
    time: new Date(t),
    temp: hourly.temperature_2m?.[i],
    wind: hourly.wind_speed_10m?.[i],
    gust: hourly.wind_gusts_10m?.[i],
    code: hourly.weather_code?.[i],
    precip: hourly.precipitation_probability?.[i],
  })).filter(h => h.time >= now).slice(0,12);
  if (!hours.length) return null;
  return (
    <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px' }}>
      <div style={{ fontSize:10, fontFamily:C.mono, color:C.blue, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>12-Hour Forecast</div>
      <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:4 }}>
        {hours.map((h, i) => {
          const hr = h.time.getHours();
          const timeLabel = hr === 0 ? '12a' : hr < 12 ? `${hr}a` : hr === 12 ? '12p' : `${hr-12}p`;
          const windCol = h.wind > 25 ? C.red : h.wind > 18 ? C.amber : C.green;
          return (
            <div key={i} style={{ minWidth:58, padding:'6px 5px', background:C.card, border:`1px solid ${C.border}`, borderRadius:5, textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:10, fontFamily:C.mono, color:C.mid, marginBottom:4 }}>{timeLabel}</div>
              <div style={{ fontSize:11, fontFamily:C.mono, color:C.text, fontWeight:700, marginBottom:2 }}>{h.temp?.toFixed(0)}°</div>
              <div style={{ fontSize:9, color:C.dim, marginBottom:2 }}>{WX_CODE[h.code]?.split(' ').slice(0,2).join(' ') || '?'}</div>
              <div style={{ fontSize:9, fontFamily:C.mono, color:windCol }}>{h.wind?.toFixed(0)}mph</div>
              {h.precip > 0 && <div style={{ fontSize:9, color:C.blue, marginTop:1 }}>{h.precip}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardWeather() {
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const data = await fetchWeather(44.0521, -123.0868);
      setWx(data);
      setLoading(false);
    })();
  }, []);
  if (loading) return <Card style={{ padding:'16px', minHeight:120 }}><div style={{ fontSize:11, color:C.dim, fontFamily:C.mono }}>Fetching weather…</div></Card>;
  if (!wx?.current) return null;
  const w = wx.current;
  const verdict = wxGoNogo(w);
  const gc = verdict?.go ? C.green : C.red;
  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <div style={{ padding:'11px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:`${C.teal}08` }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:C.teal, letterSpacing:'0.12em', textTransform:'uppercase' }}>Eugene, OR — Current Weather</span>
        <span style={{ fontSize:10, fontFamily:C.mono, color:gc, background:gc+'18', border:`1px solid ${gc}44`, borderRadius:4, padding:'2px 8px', fontWeight:700 }}>{verdict?.go ? (verdict?.marginal ? 'MARGINAL' : 'GO') : 'NO-GO'}</span>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:32, fontWeight:700, fontFamily:C.mono, color:C.text, lineHeight:1 }}>{w.temperature_2m?.toFixed(0)}°F</div>
            <div style={{ fontSize:11, color:C.mid, marginTop:4 }}>{WX_CODE[w.weather_code] || `Code ${w.weather_code}`}</div>
          </div>
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[['Wind', `${w.wind_speed_10m?.toFixed(0)} mph ${w.wind_direction_10m != null ? WIND_DIR(w.wind_direction_10m) : ''}`], ['Gusts', `${w.wind_gusts_10m?.toFixed(0)} mph`], ['Visibility', `${(w.visibility/1609.34).toFixed(1)} SM`], ['Humidity', `${w.relative_humidity_2m}%`], ['Cloud', `${w.cloud_cover}%`], ['Precip', `${w.precipitation?.toFixed(1)} in`]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize:9, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:1 }}>{l}</div>
                <div style={{ fontSize:11, fontFamily:C.mono, color:C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize:11, color:verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red, fontFamily:C.mono, borderRadius:5, padding:'7px 12px', border:`1px solid ${(verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red)}40`, background:`${(verdict?.go ? (verdict?.marginal ? C.amber : C.green) : C.red)}12` }}>{verdict?.reason}</div>
      </div>
      <WeatherForecast hourly={wx.hourly}/>
    </Card>
  );
}

function Dashboard({ flights, missions, aircraft, pilots, batteries, incidents, setTab }) {
  const totHrs = flights.reduce((a, f) => a + f.durationMin / 60, 0);
  const pending = missions.filter(m => m.status==='planned' || m.status==='approved').length;
  const airworthy = aircraft.filter(a => a.status==='airworthy').length;
  const current = pilots.filter(p => p.status==='current').length;
  const badBat = batteries.filter(b => b.status!=='good').length;
  const openInc = incidents.filter(i => i.status==='draft').length;
  const pName = id => pilots.find(p => p.id===id)?.name || '—';
  const aTail = id => aircraft.find(a => a.id===id)?.tail || '—';
  const recent = [...flights].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const upcoming = missions.filter(m => m.status==='planned' || m.status==='approved').sort((a,b) => a.date.localeCompare(b.date)).slice(0, 5);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        <StatCard label="Flight Hours" value={totHrs.toFixed(1)} sub={`${flights.length} operations`} accent={C.amber}/>
        <StatCard label="Pending Missions" value={pending} sub="planned + approved" accent={C.blue}/>
        <StatCard label="Airworthy Aircraft" value={`${airworthy}/${aircraft.length}`} accent={C.green}/>
        <StatCard label="Current Pilots" value={`${current}/${pilots.length}`} accent={current < pilots.length ? C.red : C.green}/>
        <StatCard label="Battery Health" value={`${batteries.length-badBat}/${batteries.length}`} accent={badBat ? C.amber : C.green}/>
        <StatCard label="Open Incidents" value={openInc} sub="draft reports" accent={openInc ? C.orange : C.dim}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Card style={{ padding:0 }}>
          <div style={{ padding:'11px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase' }}>Recent Flights</span>
            <button onClick={() => setTab('Missions')} style={{ background:'none', border:'none', color:C.dim, fontSize:11, fontFamily:C.mono, cursor:'pointer' }}>All →</button>
          </div>
          <DataTable headers={['Date','Location','Aircraft','Min']} rows={recent.map(f => [
            <span key="d" style={{ fontFamily:C.mono, fontSize:11 }}>{f.date}</span>,
            <span key="l" style={{ fontSize:11 }}>{f.location}</span>,
            <span key="a" style={{ fontFamily:C.mono, fontSize:11, color:C.amber }}>{aTail(f.aircraftId)}</span>,
            <span key="m" style={{ fontFamily:C.mono, fontSize:11 }}>{f.durationMin}</span>,
          ])}/>
        </Card>
        <Card style={{ padding:0 }}>
          <div style={{ padding:'11px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase' }}>Upcoming Missions</span>
            <button onClick={() => setTab('Missions')} style={{ background:'none', border:'none', color:C.dim, fontSize:11, fontFamily:C.mono, cursor:'pointer' }}>All →</button>
          </div>
          <DataTable headers={['Date','Mission','Pilot','Status']} rows={upcoming.map(m => [
            <span key="d" style={{ fontFamily:C.mono, fontSize:11 }}>{m.date}</span>,
            <span key="n" style={{ fontSize:12, color:C.text }}>{m.name}</span>,
            <span key="p" style={{ fontSize:11 }}>{pName(m.pilotId)}</span>,
            <Badge key="s" status={m.status}/>,
          ])}/>
        </Card>
      </div>
      {pilots.some(p => p.status==='expired') && (
        <div style={{ marginBottom:8, background:`${C.red}12`, border:`1px solid ${C.red}40`, borderRadius:8, padding:'11px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:C.red }}>!</span>
          <div><div style={{ fontSize:12, color:C.red, fontFamily:C.mono, fontWeight:700 }}>Pilot currency alert</div><div style={{ fontSize:11, color:C.mid, marginTop:2 }}>{pilots.filter(p => p.status==='expired').map(p => p.name).join(', ')} — expired</div></div>
          <button onClick={() => setTab('Assets')} style={{ marginLeft:'auto', background:'none', border:`1px solid ${C.red}`, color:C.red, borderRadius:4, padding:'4px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>Review →</button>
        </div>
      )}
      {openInc > 0 && (
        <div style={{ marginBottom:8, background:`${C.orange}12`, border:`1px solid ${C.orange}40`, borderRadius:8, padding:'11px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:C.orange }}>!</span>
          <div><div style={{ fontSize:12, color:C.orange, fontFamily:C.mono, fontWeight:700 }}>Open incident reports</div><div style={{ fontSize:11, color:C.mid, marginTop:2 }}>{openInc} report(s) in draft — pending submission</div></div>
          <button onClick={() => setTab('Incidents')} style={{ marginLeft:'auto', background:'none', border:`1px solid ${C.orange}`, color:C.orange, borderRadius:4, padding:'4px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>Review →</button>
        </div>
      )}
      {badBat > 0 && (
        <div style={{ background:`${C.amber}10`, border:`1px solid ${C.amber}40`, borderRadius:8, padding:'11px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <span style={{ color:C.amber }}>!</span>
          <div><div style={{ fontSize:12, color:C.amber, fontFamily:C.mono, fontWeight:700 }}>Battery health warning</div><div style={{ fontSize:11, color:C.mid, marginTop:2 }}>{badBat} battery/batteries degraded or retired</div></div>
          <button onClick={() => setTab('Assets')} style={{ marginLeft:'auto', background:'none', border:`1px solid ${C.amber}`, color:C.amber, borderRadius:4, padding:'4px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>Review →</button>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>Operations Map</div>
          <OpsMap missions={missions} onSelectMission={id => { setTab('Missions'); }} height={380}/>
          <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
            {[['Planned','#60A5FA'],['Approved','#10B981'],['Completed','#475569'],['Airport',C.purple]].map(([l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, fontFamily:C.mono, color:C.dim }}>
                <div style={{ width:8, height:8, borderRadius:l==='Airport'?2:'50%', background:c }}/>{l}
              </div>
            ))}
          </div>
        </div>
        <DashboardWeather/>
      </div>
    </div>
  );
}

const CREW_ROLES = ['PIC','Visual Observer','Mission Specialist','Crew Chief'];
function CrewManifest({ crew, setCrew, pilots, orgUsers }) {
  const orgEntries = (orgUsers || []).map(u => {
    const linkedPilot = pilots.find(p => p.id === u.pilotId);
    const roles = (u.roles || (u.role ? [u.role] : [])).join(', ');
    return { id: u.id, name: u.name, label: `${u.name} — ${roles}`, currency: linkedPilot?.status || 'n/a' };
  });
  const orgUserPilotIds = new Set((orgUsers || []).map(u => u.pilotId).filter(Boolean));
  const standaloneEntries = pilots.filter(p => !orgUserPilotIds.has(p.id)).map(p => ({ id: p.id, name: p.name, label: `${p.name} — Pilot${p.status !== 'current' ? ' (expired cert)' : ''}`, currency: p.status }));
  const allPeople = [...orgEntries, ...standaloneEntries];
  const addMember = () => setCrew([...crew, { pilotId:'', role:'VO', briefedAt:null }]);
  const remove = idx => setCrew(crew.filter((_,i) => i!==idx));
  const update = (idx, field, val) => setCrew(crew.map((m,i) => i===idx ? { ...m, [field]:val } : m));
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:C.teal, letterSpacing:'0.1em', textTransform:'uppercase' }}>Crew Manifest</span>
        <button onClick={addMember} style={{ background:'transparent', border:`1px solid ${C.teal}`, color:C.teal, borderRadius:4, padding:'4px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>+ Add Member</button>
      </div>
      {crew.length === 0 && <div style={{ fontSize:11, color:C.dim, fontFamily:C.mono, padding:'8px 0' }}>No crew assigned — add members from the org roster below</div>}
      {crew.map((m, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
          <Field label={i===0 ? 'Crew Member' : undefined}><select value={m.pilotId} onChange={e => update(i,'pilotId',e.target.value)} style={{ width:'100%' }}><option value="">Select person…</option>{allPeople.map(person => (<option key={person.id} value={person.id}>{person.label}</option>))}</select></Field>
          <Field label={i===0 ? 'Flight Role' : undefined}><select value={m.role} onChange={e => update(i,'role',e.target.value)} style={{ width:'100%' }}>{CREW_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
          <button onClick={() => remove(i)} style={{ background:'none', border:`1px solid ${C.red}40`, color:C.red, borderRadius:4, padding:'8px 10px', cursor:'pointer', fontSize:11, marginBottom:12 }}>X</button>
        </div>
      ))}
    </div>
  );
}
function CrewSignOff({ mission, setMissions, pilots, orgUsers, activeUser }) {
  if (!mission) return null;
  const crew = mission.crew || [];
  if (crew.length === 0) return (<Card style={{ padding:'12px 16px', marginBottom:10 }}><div style={{ fontSize:11, color:C.dim, fontFamily:C.mono }}>No crew manifest — add crew members via Mission edit to enable sign-offs</div></Card>);
  const resolvePerson = (id) => {
    const orgUser = (orgUsers || []).find(u => u.id === id);
    if (orgUser) { const linkedPilot = pilots.find(p => p.id === orgUser.pilotId); return { name: orgUser.name, initials: orgUser.name.split(' ').map(n=>n[0]).join('').slice(0,2), subtitle: (orgUser.roles || (orgUser.role ? [orgUser.role] : [])).join(', '), certInfo: linkedPilot ? `${linkedPilot.cert} #${linkedPilot.certNum||'—'}` : null }; }
    const pilot = pilots.find(p => p.id === id);
    if (pilot) return { name: pilot.name, initials: pilot.name.split(' ').map(n=>n[0]).join('').slice(0,2), subtitle: 'Pilot', certInfo: `${pilot.cert} #${pilot.certNum||'—'}` };
    return null;
  };
  const signOff = (idx) => { const now = new Date().toISOString(); setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, crew: m.crew.map((c,i) => i===idx ? { ...c, briefedAt:now } : c) } : m)); };
  const clearOff = (idx) => { setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, crew: m.crew.map((c,i) => i===idx ? { ...c, briefedAt:null } : c) } : m)); };
  const allBriefed = crew.length > 0 && crew.every(c => c.briefedAt);
  return (
    <Card style={{ padding:0, marginBottom:10 }}>
      <div style={{ padding:'9px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:`${C.teal}08` }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:C.teal, letterSpacing:'0.12em', textTransform:'uppercase' }}>Crew Briefing & Sign-Off</span>
        <span style={{ fontSize:10, fontFamily:C.mono, color:allBriefed?C.green:C.dim }}>{crew.filter(c=>c.briefedAt).length}/{crew.length} briefed</span>
      </div>
      <div style={{ padding:'10px 16px' }}>
        {crew.map((c, i) => {
          const person = resolvePerson(c.pilotId);
          if (!person) return (<div key={i} style={{ padding:'8px 0', fontSize:11, color:C.dim, fontFamily:C.mono }}>Unknown crew member (id: {c.pilotId||'unset'})</div>);
          const briefed = !!c.briefedAt;
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<crew.length-1?`1px solid ${C.border}20`:'none' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:briefed?`${C.green}18`:`${C.amber}18`, border:`1.5px solid ${briefed?C.green:C.amber}40`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:11, fontWeight:700, color:briefed?C.green:C.amber, flexShrink:0 }}>{person.initials}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text, fontWeight:500 }}>{person.name}</div>
                <div style={{ fontSize:10, color:C.dim, fontFamily:C.mono, marginTop:1 }}>{c.role} · {person.subtitle}{person.certInfo && <span style={{ color:C.dim }}> · {person.certInfo}</span>}{briefed && <span style={{ color:C.green, marginLeft:8 }}>Briefed {new Date(c.briefedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>}</div>
              </div>
              {briefed ? <Btn onClick={() => clearOff(i)} xstyle={{ padding:'4px 10px', fontSize:10 }}>Clear</Btn> : <Btn variant='teal' onClick={() => signOff(i)} xstyle={{ padding:'4px 10px', fontSize:10 }}>Sign Off</Btn>}
            </div>
          );
        })}
      </div>
      {allBriefed && (<div style={{ padding:'8px 16px', background:`${C.green}10`, borderTop:`1px solid ${C.green}30`, fontSize:11, color:C.green, fontFamily:C.mono }}>All crew briefed and signed off</div>)}
    </Card>
  );
}

function RiskMatrix({ mission, pilot, aircraft, activeUser, onSaveScore }) {
  const [wx, setWx] = useState(null);
  const prevKey = useRef('');
  useEffect(() => {
    if (!mission?.lat) return;
    const key = `${mission.lat},${mission.lon}`;
    if (key === prevKey.current) return;
    prevKey.current = key;
    fetchWeather(mission.lat, mission.lon).then(w => setWx(w));
  }, [mission?.lat, mission?.lon]);
  if (!mission) return null;
  const { scores, total } = calcRisk(mission, pilot, aircraft, wx);
  const level = getRiskLevel(total);
  const needsOverride = total >= RISK_OVERRIDE_THRESHOLD;
  const hasOverride = !!mission.riskOverride;
  const canOverride = can(activeUser, 'overrideRisk');
  const handleOverride = () => {
    if (!canOverride) return;
    const reason = window.prompt('Enter override justification (required for audit log):');
    if (!reason?.trim()) return;
    onSaveScore && onSaveScore(total, { by: activeUser?.name, reason, ts: new Date().toISOString() });
  };
  const handleAccept = () => { onSaveScore && onSaveScore(total, null); };
  return (
    <Card style={{ padding:0, marginBottom:14 }}>
      <div style={{ padding:'11px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:`${level.color}10` }}>
        <span style={{ fontSize:10, fontFamily:C.mono, color:level.color, letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700 }}>Risk Assessment Matrix</span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {mission.riskScore !== null && <span style={{ fontSize:10, color:C.dim, fontFamily:C.mono }}>Scored {mission.riskScore} pts</span>}
          {mission.riskOverride && <span style={{ fontSize:10, color:C.orange, fontFamily:C.mono, background:`${C.orange}15`, borderRadius:3, padding:'1px 7px' }}>Override: {mission.riskOverride.by}</span>}
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            <span style={{ fontSize:26, fontWeight:700, fontFamily:C.mono, color:level.color, lineHeight:1 }}>{total}</span>
            <span style={{ fontSize:10, color:C.dim, fontFamily:C.mono }}>/ {RISK_MAX}</span>
          </div>
          <span style={{ background:level.color+'18', border:`1px solid ${level.color}44`, color:level.color, borderRadius:4, padding:'3px 10px', fontSize:11, fontFamily:C.mono, fontWeight:700, letterSpacing:'0.08em' }}>{level.label}</span>
        </div>
      </div>
      <div style={{ padding:'12px 16px 8px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ position:'relative', height:8, background:C.border, borderRadius:4, marginBottom:6 }}>
          <div style={{ position:'absolute', left:0, width:`${10/RISK_MAX*100}%`, height:'100%', background:`${C.green}50`, borderRadius:'4px 0 0 4px' }}/>
          <div style={{ position:'absolute', left:`${10/RISK_MAX*100}%`, width:`${8/RISK_MAX*100}%`, height:'100%', background:`${C.amber}50` }}/>
          <div style={{ position:'absolute', left:`${18/RISK_MAX*100}%`, width:`${8/RISK_MAX*100}%`, height:'100%', background:`${C.orange}50` }}/>
          <div style={{ position:'absolute', left:`${26/RISK_MAX*100}%`, width:`${10/RISK_MAX*100}%`, height:'100%', background:`${C.red}50`, borderRadius:'0 4px 4px 0' }}/>
          <div style={{ position:'absolute', top:-2, height:12, width:3, background:level.color, borderRadius:2, left:`${Math.min(total/RISK_MAX*100,98)}%`, boxShadow:`0 0 6px ${level.color}` }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, fontFamily:C.mono, color:C.dim }}><span style={{ color:C.green }}>LOW 0-10</span><span style={{ color:C.amber }}>MEDIUM 11-18</span><span style={{ color:C.orange }}>HIGH 19-26</span><span style={{ color:C.red }}>CRITICAL 27+</span></div>
      </div>
      <div style={{ padding:'12px 16px' }}>
        {RISK_CATS.map(cat => {
          const sc = scores[cat.id]; if (!sc) return null;
          const pct = sc.v / cat.max * 100;
          const col = sc.v===0 ? C.green : sc.v <= cat.max*0.35 ? C.amber : sc.v <= cat.max*0.70 ? C.orange : C.red;
          return (
            <div key={cat.id} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                <div style={{ minWidth:0 }}><span style={{ fontSize:12, color:C.text }}>{cat.label}</span><span style={{ fontSize:10, color:C.dim, marginLeft:10 }}>{sc.note}</span></div>
                <span style={{ fontSize:11, fontFamily:C.mono, color:col, fontWeight:700, flexShrink:0, marginLeft:10 }}>{sc.v}/{cat.max}</span>
              </div>
              <div style={{ height:4, background:C.border, borderRadius:2 }}><div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:2, transition:'width 0.4s' }}/></div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, background:needsOverride&&!hasOverride?`${C.red}08`:C.card }}>
        {needsOverride && !hasOverride ? (<>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2L13 12H1L7 2Z" stroke={C.red} strokeWidth="1.5" strokeLinejoin="round"/><line x1="7" y1="6" x2="7" y2="9" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="11" r="0.5" fill={C.red}/></svg>
          <span style={{ fontSize:11, color:C.red, fontFamily:C.mono, flex:1 }}>Score {total} — SUPERVISOR OVERRIDE REQUIRED before approval</span>
          {canOverride ? <Btn variant='red' onClick={handleOverride} xstyle={{ padding:'5px 12px', fontSize:10 }}>Override & Sign</Btn> : <span style={{ fontSize:10, color:C.dim, fontFamily:C.mono }}>Safety Officer or Chief Pilot must override</span>}
        </>) : needsOverride && hasOverride ? (<>
          <span style={{ fontSize:11, color:C.orange, fontFamily:C.mono, flex:1 }}>Override on record — "{mission.riskOverride?.reason}"</span>
          <Btn onClick={handleAccept} xstyle={{ padding:'5px 12px', fontSize:10 }}>Accept Score</Btn>
        </>) : (<>
          <span style={{ fontSize:11, color:C.green, fontFamily:C.mono, flex:1 }}>Risk within acceptable limits</span>
          <Btn variant='green' onClick={handleAccept} xstyle={{ padding:'5px 12px', fontSize:10 }}>Accept Score</Btn>
        </>)}
      </div>
    </Card>
  );
}

const M_BLANK = { name:'', location:'', lat:null, lon:null, date:'', time:'08:00', objective:'', aircraftId:'', pilotId:'', altFt:'', notes:'', status:'planned', waypoints:[], notams:'', populationDensity:'rural', crew:[], riskScore:null, riskOverride:null };
const M_STATUSES = ['planned','approved','completed','cancelled'];
const FL_BLANK = { missionId:'', date:'', pilotId:'', aircraftId:'', durationMin:'', location:'', payload:'', takeoffs:'1', landings:'1', notes:'' };

function MissionForm({ form, setForm, aircraft, pilots, orgUsers, isEdit }) {
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label="Mission Name"><input value={form.name} onChange={set('name')} placeholder="Pipeline Survey Alpha" style={{ width:'100%' }}/></Field>
        <Field label="Location"><input value={form.location} onChange={set('location')} placeholder="Eugene, OR" style={{ width:'100%' }}/></Field>
        <Field label="Date"><input type="date" value={form.date} onChange={set('date')} style={{ width:'100%' }}/></Field>
        <Field label="Time"><input type="time" value={form.time} onChange={set('time')} style={{ width:'100%' }}/></Field>
        <Field label="Objective"><input value={form.objective} onChange={set('objective')} style={{ width:'100%' }}/></Field>
        <Field label="Max Altitude (ft AGL)"><input type="number" value={form.altFt} onChange={set('altFt')} placeholder="400" style={{ width:'100%' }}/></Field>
        <Field label="Aircraft"><select value={form.aircraftId} onChange={set('aircraftId')} style={{ width:'100%' }}><option value="">Select…</option>{aircraft.map(a => <option key={a.id} value={a.id}>{a.tail} – {a.model}{a.status!=='airworthy'?' (offline)':''}</option>)}</select></Field>
        <Field label="Pilot"><select value={form.pilotId} onChange={set('pilotId')} style={{ width:'100%' }}><option value="">Select…</option>{pilots.map(p => <option key={p.id} value={p.id}>{p.name}{p.status!=='current'?' (expired)':''}</option>)}</select></Field>
      </div>
      {isEdit && (<Field label="Status"><select value={form.status} onChange={set('status')} style={{ width:'100%' }}>{M_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></Field>)}
      <Field label="Notes"><textarea value={form.notes} onChange={set('notes')} rows={2} style={{ width:'100%' }}/></Field>
      {isEdit && (<Field label="NOTAM Log"><textarea value={form.notams||''} onChange={set('notams')} rows={3} placeholder="Log NOTAM numbers and summaries…" style={{ width:'100%', fontFamily:'monospace', fontSize:11 }}/></Field>)}
      <Field label="Population Density at Operation Site">
        <select value={form.populationDensity||'rural'} onChange={set('populationDensity')} style={{ width:'100%' }}>
          <option value="rural">Rural — sparse population, open land</option><option value="suburban">Suburban — residential/light commercial</option><option value="urban">Urban — dense buildings, active streets</option><option value="congested">Congested — stadiums, events, crowds</option>
        </select>
      </Field>
      <div style={{ marginTop:4, padding:'12px 14px', background:C.card2, border:`1px solid ${C.border}`, borderRadius:6 }}>
        <CrewManifest crew={form.crew||[]} setCrew={newCrew => setForm(f => ({ ...f, crew:newCrew }))} pilots={pilots} orgUsers={orgUsers}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, padding:'10px 12px', background:C.card2, border:`1px solid ${C.border}`, borderRadius:6, marginTop:4, marginBottom:4 }}>
        <Field label="Latitude"><input type="number" step="0.000001" value={form.lat ?? ''} onChange={e => setForm(f => ({ ...f, lat: e.target.value !== '' ? parseFloat(e.target.value) : null }))} placeholder="44.052100" style={{ width:'100%', fontFamily:'monospace' }}/></Field>
        <Field label="Longitude"><input type="number" step="0.000001" value={form.lon ?? ''} onChange={e => setForm(f => ({ ...f, lon: e.target.value !== '' ? parseFloat(e.target.value) : null }))} placeholder="-123.086800" style={{ width:'100%', fontFamily:'monospace' }}/></Field>
        <Field label="Coord Source"><div style={{ fontSize:11, color:C.dim, fontFamily:C.mono, paddingTop:6, lineHeight:1.6 }}>{form.lat && form.lon ? <span style={{ color:C.teal }}>Manual / pin</span> : <span>Auto-geocode on save</span>}</div></Field>
      </div>
      <div style={{ marginTop:4, marginBottom:8 }}>
        <MapPicker lat={form.lat} lon={form.lon} onChange={(lat, lon) => setForm(f => ({ ...f, lat, lon }))}/>
      </div>
    </div>
  );
}

function MissionWorkspace({ mission, missions, setMissions, flights, setFlights, aircraft, setAircraft, pilots, setPilots, orgUsers, activeUser, addAudit, onClose }) {
  const [sub, setSub] = useState('Overview');
  const SUBS = ['Overview','Pre-Flight','Flight Log'];
  const SUB_COL = { Overview:C.amber, 'Pre-Flight':C.blue, 'Flight Log':C.green };
  const canApprove = can(activeUser,'approveMission'), canComplete = can(activeUser,'completeMission'), canEdit = can(activeUser,'editMission');
  const canLog = can(activeUser,'logFlight'), canEditLog = can(activeUser,'editLog'), canDeleteLog = can(activeUser,'deleteLog'), canExport = can(activeUser,'exportData');
  const [pfChecked, setPfChecked] = useState({}), [pfStarted, setPfStarted] = useState(false);
  const [flModal, setFlModal] = useState(false), [flForm, setFlForm] = useState(FL_BLANK), [flEditId, setFlEditId] = useState(null), [flExpanded, setFlExpanded] = useState(null);
  const [inlineDur, setInlineDur] = useState({});
  const { confirm: flConfirm, confirmEl: flConfirmEl } = useConfirm();
  const { confirm: closeConfirm, confirmEl: closeConfirmEl } = useConfirm();
  const ac = aircraft.find(a => a.id === mission.aircraftId), pilot = pilots.find(p => p.id === mission.pilotId);
  const mFlights = (flights||[]).filter(f => f.missionId === mission.id);
  const pName = id => pilots.find(p => p.id===id)?.name || '—';
  const aTail = id => aircraft.find(a => a.id===id)?.tail || '—';
  const stamp = () => new Date().toISOString();

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && !flModal) handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pfStarted, Object.values(pfChecked).filter(Boolean).length, flModal]);

  const handleClose = async () => {
    const checkedCount = Object.values(pfChecked).filter(Boolean).length;
    if (pfStarted && checkedCount > 0) {
      const ok = await closeConfirm({ message: `You have ${checkedCount} item${checkedCount!==1?'s':''} checked — leave and lose progress?`, label: 'Leave Pre-Flight' });
      if (!ok) return;
    }
    onClose();
  };
  const advance = () => {
    const next = mission.status==='planned' ? 'approved' : 'completed';
    setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, status:next, updatedAt:stamp() } : m));
    addAudit?.(`Mission ${next}`, `"${mission.name}"`);
    if (next==='completed' && !mFlights.length) {
      setFlights(fl => [...fl, { id:uid(), missionId:mission.id, date:mission.date||TODAY, pilotId:mission.pilotId||'', aircraftId:mission.aircraftId||'', durationMin:0, location:mission.location||'', payload:'', takeoffs:1, landings:1, notes:`Auto-created when mission "${mission.name}" was marked complete.` }]);
      addAudit?.('Auto flight log entry created', `Mission: "${mission.name}"`);
    }
  };
  const cancelMission = () => { setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, status:'cancelled', updatedAt:stamp() } : m)); addAudit?.('Mission cancelled', `"${mission.name}"`); };
  const cats = [...new Set(CHECKLIST.map(c => c.cat))];
  const total = CHECKLIST.length, done = Object.values(pfChecked).filter(Boolean).length, pct = total ? Math.round(done/total*100) : 0;
  const allDone = done===total && total>0;
  const crewAllBriefed = !mission.crew?.length || mission.crew.every(c => c.briefedAt);
  const togglePf = id => setPfChecked(c => ({ ...c, [id]:!c[id] }));
  const resetPf = () => { setPfChecked({}); setPfStarted(false); };
  const saveNotam = text => setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, notams:text, updatedAt:stamp() } : m));
  const saveRiskScore = (score, override) => {
    setMissions(ms => ms.map(m => m.id===mission.id ? { ...m, riskScore:score, riskOverride:override||m.riskOverride, updatedAt:stamp() } : m));
    addAudit?.('Risk score accepted', `Mission: ${mission.name} — Score: ${score} (${getRiskLevel(score).label})`);
    if (override) addAudit?.('Risk override signed', `Mission: ${mission.name} — Reason: ${override.reason}`);
  };
  const flSet = k => e => setFlForm(f => ({ ...f, [k]:e.target.value }));
  const openFlNew = () => { setFlForm({ ...FL_BLANK, missionId:mission.id, date:mission.date||'', location:mission.location||'', aircraftId:mission.aircraftId||'', pilotId:mission.pilotId||'' }); setFlEditId(null); setFlModal(true); };
  const openFlEdit = f => { setFlEditId(f.id); setFlForm({ ...f, durationMin:String(f.durationMin), takeoffs:String(f.takeoffs), landings:String(f.landings) }); setFlModal(true); };
  const closeFlModal = () => { setFlModal(false); setFlEditId(null); setFlForm(FL_BLANK); };
  const saveFl = () => {
    if (!flForm.date) return;
    const dur = Number(flForm.durationMin)||0;
    const entry = { ...flForm, id:flEditId||uid(), durationMin:dur, takeoffs:Number(flForm.takeoffs)||1, landings:Number(flForm.landings)||1 };
    if (flEditId) {
      const old = flights.find(f => f.id===flEditId), diff = dur-(old?.durationMin||0);
      setFlights(fl => fl.map(f => f.id===flEditId ? entry : f));
      if (diff!==0) { const pid=entry.pilotId||old?.pilotId, aid=entry.aircraftId||old?.aircraftId; if (pid) setPilots(ps => ps.map(p => p.id===pid ? { ...p, hours:Number(Math.max(0,(p.hours||0)+diff/60).toFixed(1)) } : p)); if (aid) setAircraft(ac => ac.map(a => a.id===aid ? { ...a, hours:Number(Math.max(0,(a.hours||0)+diff/60).toFixed(1)) } : a)); }
      addAudit?.('Flight record updated', `${entry.date} · ${dur}min`);
    } else {
      setFlights(fl => [...fl, entry]);
      if (entry.pilotId) setPilots(ps => ps.map(p => p.id===entry.pilotId ? { ...p, lastFlight:entry.date>(p.lastFlight||'')?entry.date:p.lastFlight, hours:Number(((p.hours||0)+dur/60).toFixed(1)) } : p));
      if (entry.aircraftId) setAircraft(ac => ac.map(a => a.id===entry.aircraftId ? { ...a, hours:Number(((a.hours||0)+dur/60).toFixed(1)) } : a));
      addAudit?.('Flight logged', `${entry.date} · ${dur}min`);
    }
    closeFlModal();
  };
  const delFl = async f => {
    if (!await flConfirm({ message:'Delete this flight record?', label:`${f.date} · ${f.durationMin}min` })) return;
    setFlights(fl => fl.filter(x => x.id!==f.id));
    if (f.pilotId) setPilots(ps => ps.map(p => p.id===f.pilotId ? { ...p, hours:Number(Math.max(0,(p.hours||0)-f.durationMin/60).toFixed(1)) } : p));
    if (f.aircraftId) setAircraft(ac => ac.map(a => a.id===f.aircraftId ? { ...a, hours:Number(Math.max(0,(a.hours||0)-f.durationMin/60).toFixed(1)) } : a));
    addAudit?.('Flight record deleted', `${f.date} · ${f.durationMin}min`);
  };
  const saveInlineDur = (f, val) => {
    const dur = Number(val) || 0;
    if (dur === f.durationMin) { setInlineDur(d => ({ ...d, [f.id]: undefined })); return; }
    setFlights(fl => fl.map(x => x.id===f.id ? { ...x, durationMin: dur } : x));
    const diff = dur - (f.durationMin||0);
    if (diff !== 0) { if (f.pilotId) setPilots(ps => ps.map(p => p.id===f.pilotId ? { ...p, hours:Number(Math.max(0,(p.hours||0)+diff/60).toFixed(1)) } : p)); if (f.aircraftId) setAircraft(ac => ac.map(a => a.id===f.aircraftId ? { ...a, hours:Number(Math.max(0,(a.hours||0)+diff/60).toFixed(1)) } : a)); }
    setInlineDur(d => ({ ...d, [f.id]: undefined }));
    addAudit?.('Flight duration updated', `${f.date} · ${dur}min`);
  };

  return (
    <div style={{ position:'relative' }}>
      {flConfirmEl}{closeConfirmEl}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={handleClose} style={{ background:'transparent', border:`1px solid ${C.border2}`, color:C.dim, borderRadius:5, padding:'6px 12px', fontFamily:C.mono, fontSize:10, cursor:'pointer', letterSpacing:'0.06em' }}>← All Missions</button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}><span style={{ fontSize:15, fontWeight:600, color:C.text }}>{mission.name}</span><Badge status={mission.status}/><span style={{ fontFamily:C.mono, fontSize:11, color:C.dim }}>{mission.date} {mission.time}</span><span style={{ fontSize:11, color:C.dim }}>{mission.location}</span></div>
          <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>{mission.objective} · {aTail(mission.aircraftId)} · {pName(mission.pilotId)} · {mission.altFt}ft AGL</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {canApprove && mission.status==='planned' && <Btn variant='blue' onClick={advance}>Approve</Btn>}
          {canComplete && mission.status==='approved' && <Btn variant='green' onClick={advance}>Complete</Btn>}
          {canEdit && (mission.status==='planned'||mission.status==='approved') && <Btn variant='red' onClick={cancelMission}>Cancel</Btn>}
        </div>
      </div>
      <div style={{ display:'flex', gap:0, marginBottom:18, borderBottom:`1px solid ${C.border}` }}>
        {SUBS.map(s => {
          const col=SUB_COL[s], active=sub===s;
          const flBadge = s==='Flight Log' ? (mFlights.length||null) : null;
          const pfBadge = s==='Pre-Flight' ? (allDone&&crewAllBriefed?'✓':done>0?`${done}/${total}`:null) : null;
          return (<button key={s} onClick={()=>setSub(s)} style={{ background:'none', border:'none', padding:'9px 16px', fontSize:11, fontFamily:C.mono, letterSpacing:'0.06em', textTransform:'uppercase', color:active?col:C.dim, borderBottom:active?`2px solid ${col}`:'2px solid transparent', marginBottom:-1, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>{s}{(flBadge||pfBadge) && <span style={{ fontSize:9, background:`${col}20`, color:col, border:`1px solid ${col}40`, borderRadius:10, padding:'1px 6px', fontWeight:700 }}>{flBadge||pfBadge}</span>}</button>);
        })}
        <div style={{ marginLeft:'auto', fontSize:9, fontFamily:C.mono, color:C.dim, alignSelf:'center', paddingBottom:4 }}>ESC to go back</div>
      </div>

      {sub==='Overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:14 }}>
            {[['Aircraft',aTail(mission.aircraftId)],['Pilot',pName(mission.pilotId)],['Altitude',`${mission.altFt}ft AGL`],['Flights',mFlights.length],['Total Time',mFlights.reduce((a,f)=>a+f.durationMin,0)+'min']].map(([l,v])=>(<StatCard key={l} label={l} value={v}/>))}
          </div>
          {mission.notes && <Card style={{ padding:'10px 14px', marginBottom:10, fontSize:12, color:C.mid }}>{mission.notes}</Card>}
          {mission.riskScore!==null && mission.riskScore!==undefined && (
            <Card style={{ padding:'10px 14px', marginBottom:10 }}>
              <div style={{ fontSize:9, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Risk Assessment</div>
              {(()=>{ const rl=getRiskLevel(mission.riskScore); return <span style={{ fontFamily:C.mono, fontSize:13, color:rl.color, fontWeight:700 }}>{mission.riskScore} — {rl.label}</span>; })()}
            </Card>
          )}
          <div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>Mission Location</div>
          <MissionMapView mission={mission}/>
          <WeatherPanel location={mission.location} lat={mission.lat} lon={mission.lon}/>
          <AirspacePanel location={mission.location} lat={mission.lat} lon={mission.lon} altFt={mission.altFt}/>
        </div>
      )}

      {sub==='Pre-Flight' && (
        <div>
          <Card style={{ padding:14, marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:12, marginBottom:12 }}>
              {[['Aircraft',ac?.tail||'—'],['Model',ac?.model||'—'],['Pilot',pilot?.name||'—'],['Altitude',`${mission.altFt}ft AGL`],['Status',mission.status]].map(([l,v])=>(<div key={l}><div style={{ fontSize:9, fontFamily:C.mono, color:C.dim, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:3 }}>{l}</div><div style={{ fontSize:12, color:C.text, fontFamily:C.mono }}>{v}</div></div>))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!pfStarted && <Btn variant='primary' onClick={()=>setPfStarted(true)}>Begin Checklist</Btn>}
              {pfStarted && <Btn onClick={resetPf}>Reset</Btn>}
              {allDone && pfStarted && <Btn variant='teal' onClick={()=>printPreFlight(mission,ac,pilot,CHECKLIST,pfChecked,mission.notams||'')}>Print PDF</Btn>}
            </div>
          </Card>
          <RiskMatrix mission={mission} pilot={pilot} aircraft={ac} activeUser={activeUser} onSaveScore={saveRiskScore}/>
          {pfStarted && (
            <div>
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:10, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em' }}>Checklist Progress</span>
                  <span style={{ fontSize:11, fontFamily:C.mono, color:allDone?C.green:C.amber, fontWeight:700 }}>{done}/{total} · {pct}%</span>
                </div>
                <div style={{ height:5, background:C.border, borderRadius:3 }}><div style={{ height:'100%', width:`${pct}%`, background:allDone?C.green:C.amber, borderRadius:3, transition:'width 0.3s' }}/></div>
              </div>
              {cats.map(cat=>{
                const items=CHECKLIST.filter(c=>c.cat===cat), catDone=items.filter(c=>pfChecked[c.id]).length;
                return(
                  <Card key={cat} style={{ padding:0, marginBottom:10 }}>
                    <div style={{ padding:'9px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', background:`${C.amber}08` }}>
                      <span style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase' }}>{cat}</span>
                      <span style={{ fontSize:10, fontFamily:C.mono, color:catDone===items.length?C.green:C.dim }}>{catDone}/{items.length}</span>
                    </div>
                    {items.map(item=>(
                      <div key={item.id} onClick={()=>togglePf(item.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:`1px solid ${C.border}20`, cursor:'pointer', background:pfChecked[item.id]?`${C.green}08`:'transparent', transition:'background 0.15s' }}>
                        <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, border:`1.5px solid ${pfChecked[item.id]?C.green:C.border2}`, background:pfChecked[item.id]?C.green:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                          {pfChecked[item.id]&&<svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L3.5 7L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                        </div>
                        <span style={{ fontSize:13, color:pfChecked[item.id]?C.dim:C.text, textDecoration:pfChecked[item.id]?'line-through':'none', transition:'color 0.15s' }}>{item.item}</span>
                      </div>
                    ))}
                  </Card>
                );
              })}
              <Card style={{ padding:0, marginBottom:10 }}>
                <div style={{ padding:'9px 16px', borderBottom:`1px solid ${C.border}`, background:`${C.purple}08` }}>
                  <span style={{ fontSize:10, fontFamily:C.mono, color:C.purple, letterSpacing:'0.12em', textTransform:'uppercase' }}>NOTAM Log</span>
                </div>
                <div style={{ padding:14 }}><textarea value={mission.notams||''} onChange={e=>saveNotam(e.target.value)} rows={4} placeholder="Log NOTAM numbers and summaries…" style={{ width:'100%', fontFamily:C.mono, fontSize:11, lineHeight:1.6, resize:'vertical' }}/></div>
              </Card>
              <CrewSignOff mission={mission} setMissions={setMissions} pilots={pilots} orgUsers={orgUsers} activeUser={activeUser}/>
              {allDone && crewAllBriefed && (
                <Card style={{ padding:22, background:`${C.green}12`, border:`1px solid ${C.green}40`, textAlign:'center', marginTop:6 }}>
                  <div style={{ fontSize:14, color:C.green, fontFamily:C.mono, fontWeight:700, letterSpacing:'0.08em' }}>ALL ITEMS COMPLETE — CLEARED FOR FLIGHT</div>
                  <div style={{ fontSize:11, color:C.mid, marginTop:6 }}>Pre-flight completed for <strong style={{ color:C.text }}>{mission.name}</strong></div>
                  <div style={{ marginTop:12 }}><Btn variant='teal' onClick={()=>printPreFlight(mission,ac,pilot,CHECKLIST,pfChecked,mission.notams||'')}>Print / Save PDF Record</Btn></div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {sub==='Flight Log' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:14 }}>
            <StatCard label="Flights" value={mFlights.length}/><StatCard label="Total Time" value={mFlights.reduce((a,f)=>a+f.durationMin,0)+'min'} accent={C.green}/>
          </div>
          <SectionHeader title="Flight Records" onAdd={canLog?openFlNew:null} addLabel="+ Log Flight" extra={canExport&&mFlights.length>0&&<Btn variant='teal' onClick={()=>exportCSV(mFlights,aircraft,pilots,missions)}>Export CSV</Btn>}/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {!mFlights.length && <Card style={{ padding:40, textAlign:'center' }}><span style={{ fontFamily:C.mono, fontSize:11, color:C.dim }}>No flights logged for this mission yet</span></Card>}
            {[...mFlights].sort((a,b)=>b.date.localeCompare(a.date)).map(f=>{
              const isExp=flExpanded===f.id, inc=!f.durationMin;
              return(
                <Card key={f.id} style={{ padding:0, overflow:'hidden', border:`1px solid ${inc?C.orange+'50':C.border}` }}>
                  <div onClick={()=>setFlExpanded(isExp?null:f.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', background:inc?`${C.orange}06`:'transparent' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontFamily:C.mono, fontSize:11, color:C.dim }}>{f.date}</span>
                        <span style={{ fontSize:13, color:C.text, fontWeight:500 }}>{f.location||'—'}</span>
                      </div>
                      <div style={{ fontSize:11, color:C.dim, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontFamily:C.mono, color:C.amber }}>{aTail(f.aircraftId)}</span>
                        <span>{pName(f.pilotId)}</span>
                        {inc ? (
                          <span style={{ display:'flex', alignItems:'center', gap:5 }} onClick={e => e.stopPropagation()}>
                            <input type="number" min="0" placeholder="min" value={inlineDur[f.id] !== undefined ? inlineDur[f.id] : ''} onChange={e => setInlineDur(d => ({ ...d, [f.id]: e.target.value }))} onBlur={e => { if (e.target.value) saveInlineDur(f, e.target.value); }} onKeyDown={e => { if (e.key==='Enter' && e.target.value) saveInlineDur(f, e.target.value); }} style={{ width:62, padding:'2px 6px', fontFamily:C.mono, fontSize:11, background:C.card2, border:`1px solid ${C.orange}60`, borderRadius:4, color:C.text }}/>
                            <span style={{ fontSize:10, color:C.dim }}>min · Enter to save</span>
                          </span>
                        ) : (<span style={{ fontFamily:C.mono }}>{f.durationMin}min</span>)}
                        <span>{f.takeoffs}/{f.landings} T/L</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                      {(canEditLog||(canLog&&inc)) && <Btn variant='amber' onClick={e=>{e.stopPropagation();openFlEdit(f);}} xstyle={{ padding:'4px 9px', fontSize:10 }}>Edit</Btn>}
                      {canDeleteLog && <Btn variant='red' onClick={e=>{e.stopPropagation();delFl(f);}} xstyle={{ padding:'4px 9px', fontSize:10 }}>X</Btn>}
                      <span style={{ color:C.dim, fontSize:11, paddingLeft:4, userSelect:'none' }}>{isExp?'▲':'▼'}</span>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`, background:C.card2 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                        {[['Aircraft',aTail(f.aircraftId)],['Pilot',pName(f.pilotId)],['Duration',`${f.durationMin}min`],['T/L',`${f.takeoffs}/${f.landings}`],['Payload',f.payload||'—']].map(([l,v])=>(<div key={l}><div style={{ fontSize:9, color:C.dim, fontFamily:C.mono, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{l}</div><div style={{ fontSize:11, color:C.text, fontFamily:C.mono }}>{v}</div></div>))}
                      </div>
                      {f.notes && <div style={{ fontSize:11, color:C.mid, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, lineHeight:1.6 }}>{f.notes}</div>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {flModal && (
            <Modal title={flEditId?'Edit Flight Record':'Log Flight'} onClose={closeFlModal} wide>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="Date"><input type="date" value={flForm.date} onChange={flSet('date')} style={{ width:'100%' }}/></Field>
                <Field label="Duration (min)"><input type="number" min="0" value={flForm.durationMin} onChange={flSet('durationMin')} placeholder="45" style={{ width:'100%' }}/></Field>
                <Field label="Aircraft"><select value={flForm.aircraftId} onChange={flSet('aircraftId')} style={{ width:'100%' }}><option value="">Select…</option>{aircraft.map(a=><option key={a.id} value={a.id}>{a.tail} – {a.model}</option>)}</select></Field>
                <Field label="Pilot"><select value={flForm.pilotId} onChange={flSet('pilotId')} style={{ width:'100%' }}><option value="">Select…</option>{pilots.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                <Field label="Location"><input value={flForm.location} onChange={flSet('location')} style={{ width:'100%' }}/></Field>
                <Field label="Payload"><input value={flForm.payload} onChange={flSet('payload')} style={{ width:'100%' }}/></Field>
                <Field label="Takeoffs / Landings"><div style={{ display:'flex', gap:8 }}><input type="number" min="0" value={flForm.takeoffs} onChange={flSet('takeoffs')} style={{ width:'100%' }}/><input type="number" min="0" value={flForm.landings} onChange={flSet('landings')} style={{ width:'100%' }}/></div></Field>
              </div>
              <Field label="Notes"><textarea value={flForm.notes} onChange={flSet('notes')} rows={2} style={{ width:'100%' }}/></Field>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}><Btn onClick={closeFlModal}>Cancel</Btn><Btn variant='primary' onClick={saveFl} disabled={!flForm.date}>{flEditId?'Save Changes':'Log Flight'}</Btn></div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

function Missions({ missions, setMissions, aircraft, setAircraft, pilots, setPilots, orgUsers, flights, setFlights, activeUser, addAudit }) {
  const canCreate = can(activeUser,'createMission'), canEdit = can(activeUser,'editMission'), canDelete = can(activeUser,'deleteMission');
  const canLog = can(activeUser,'logFlight'), canExport = can(activeUser,'exportData');
  const [workMissionId, setWorkMissionId] = useState(null);
  const [modal, setModal] = useState(false), [form, setForm] = useState(M_BLANK), [editId, setEditId] = useState(null), [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(''), [statusFilter, setStatusFilter] = useState('all');
  const { confirm, confirmEl } = useConfirm();

  useEffect(() => { if (workMissionId && !missions.find(m => m.id===workMissionId)) setWorkMissionId(null); }, [missions, workMissionId]);

  const pName = id => pilots.find(p => p.id===id)?.name || '—';
  const aTail = id => aircraft.find(a => a.id===id)?.tail || '—';
  const mFlights = id => (flights||[]).filter(f => f.missionId===id);
  const stamp = () => new Date().toISOString();
  const filtered = [...missions].filter(m => { if (statusFilter !== 'all' && m.status !== statusFilter) return false; if (!search) return true; const q = search.toLowerCase(); return m.name.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q) || pName(m.pilotId).toLowerCase().includes(q) || aTail(m.aircraftId).toLowerCase().includes(q); }).sort((a,b) => b.date.localeCompare(a.date));
  const openNew = () => { setForm(M_BLANK); setEditId(null); setModal('new'); };
  const openEdit = (m, e) => { e?.stopPropagation(); setForm({ ...m, altFt:String(m.altFt??'') }); setEditId(m.id); setModal('edit'); };
  const closeModal = () => { setModal(false); setEditId(null); setForm(M_BLANK); };
  const duplicate = (m, e) => { e?.stopPropagation(); const copy = { ...m, id:uid(), name:`${m.name} (copy)`, status:'planned', date:TODAY, riskScore:null, riskOverride:null, updatedAt:null, crew:(m.crew||[]).map(c => ({...c, briefedAt:null})) }; setMissions(ms => [copy, ...ms]); addAudit?.('Mission duplicated', `"${m.name}" → "${copy.name}"`); setWorkMissionId(copy.id); };
  const save = async () => {
    if (!form.name||!form.date) return;
    setSaving(true);
    let lat=form.lat??null, lon=form.lon??null;
    if ((lat===null||lon===null)&&form.location) { const g=await geocode(form.location); if(g){lat=g.lat;lon=g.lon;} }
    const now = stamp();
    if (modal==='new') { setMissions(ms => [...ms, { ...form, id:uid(), status:'planned', altFt:Number(form.altFt)||0, lat, lon, updatedAt:now }]); addAudit?.('Mission created', `"${form.name}" — ${form.date} · ${form.location}`); }
    else { setMissions(ms => ms.map(m => m.id===editId ? { ...form, id:editId, altFt:Number(form.altFt)||0, lat, lon, updatedAt:now } : m)); addAudit?.('Mission edited', `"${form.name}"`); }
    setSaving(false); closeModal();
  };
  const del = async (m, e) => { e?.stopPropagation(); if (await confirm({ message:'Delete this mission?', label:m.name })) { setMissions(ms => ms.filter(x => x.id!==m.id)); addAudit?.('Mission deleted', `"${m.name}"`); } };
  const workMission = missions.find(m => m.id===workMissionId);

  return (
    <div style={{ position:'relative' }}>
      {confirmEl}
      {workMissionId && workMission && (
        <MissionWorkspace mission={workMission} missions={missions} setMissions={setMissions} flights={flights} setFlights={setFlights} aircraft={aircraft} setAircraft={setAircraft} pilots={pilots} setPilots={setPilots} orgUsers={orgUsers} activeUser={activeUser} addAudit={addAudit} onClose={()=>setWorkMissionId(null)}/>
      )}
      {!workMissionId && (
        <div>
          <div style={{ display:'flex', alignItems:'center', marginBottom:18, borderBottom:`1px solid ${C.border}` }}>
            <div style={{ marginLeft:'auto', paddingBottom:6, display:'flex', gap:6 }}>
              {canCreate && <Btn variant='primary' onClick={openNew}>+ New Mission</Btn>}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:10, marginBottom:14 }}>
            {[['Planned',missions.filter(m=>m.status==='planned').length,C.blue],['Approved',missions.filter(m=>m.status==='approved').length,C.green],['Completed',missions.filter(m=>m.status==='completed').length,C.dim],['Cancelled',missions.filter(m=>m.status==='cancelled').length,C.red]].map(([l,v,c])=>(<StatCard key={l} label={l} value={v} accent={c}/>))}
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, location, pilot, aircraft…" style={{ flex:1, minWidth:180, padding:'7px 12px', background:C.card2, border:`1px solid ${C.border2}`, borderRadius:6, color:C.text, fontFamily:C.mono, fontSize:11 }}/>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding:'7px 12px', background:C.card2, border:`1px solid ${C.border2}`, borderRadius:6, color:C.text, fontFamily:C.mono, fontSize:11, minWidth:120 }}><option value="all">All statuses</option><option value="planned">Planned</option><option value="approved">Approved</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
            {(search||statusFilter!=='all') && <Btn onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear</Btn>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(m=>{
              const mf=mFlights(m.id);
              const sc={planned:C.blue,approved:C.green,completed:C.dim,cancelled:C.red}[m.status]||C.dim;
              const rel = relDate(m.updatedAt || m.date);
              return(
                <Card key={m.id} style={{ padding:0, overflow:'hidden', borderLeft:`3px solid ${sc}` }}>
                  <div style={{ padding:'13px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontFamily:C.mono, fontSize:11, color:C.dim }}>{m.date} {m.time}</span>
                        <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{m.name}</span>
                        <Badge status={m.status}/>
                      </div>
                      <div style={{ fontSize:11, color:C.dim, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                        <span>{m.location}</span><span>{aTail(m.aircraftId)}</span><span>{pName(m.pilotId)}</span><span>{m.altFt}ft AGL</span>
                        {mf.length>0 && <span style={{ color:C.green, fontFamily:C.mono }}>{mf.length} flight{mf.length!==1?'s':''} · {mf.reduce((a,f)=>a+f.durationMin,0)}min</span>}
                        {rel && <span style={{ color:C.dim, fontFamily:C.mono, fontSize:10, marginLeft:'auto' }}>{rel}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <Btn variant='amber' onClick={()=>setWorkMissionId(m.id)} xstyle={{ padding:'6px 14px', fontSize:10 }}>Open →</Btn>
                      {canEdit && <Btn onClick={e=>openEdit(m,e)} xstyle={{ padding:'6px 10px', fontSize:10 }}>Edit</Btn>}
                      {canCreate && <Btn variant='teal' onClick={e=>duplicate(m,e)} xstyle={{ padding:'6px 10px', fontSize:10 }} title="Duplicate">⧉</Btn>}
                      {canDelete && <Btn variant='red' onClick={e=>del(m,e)} xstyle={{ padding:'6px 10px', fontSize:10 }}>X</Btn>}
                    </div>
                  </div>
                </Card>
              );
            })}
            {!filtered.length && missions.length === 0 && (<Card style={{ padding:48, textAlign:'center' }}><div style={{ fontFamily:C.mono, fontSize:11, color:C.dim, marginBottom:16 }}>No missions yet — create your first one to get started</div>{canCreate && <Btn variant='primary' onClick={openNew}>+ New Mission</Btn>}</Card>)}
            {!filtered.length && missions.length > 0 && (<Card style={{ padding:32, textAlign:'center' }}><div style={{ fontFamily:C.mono, fontSize:11, color:C.dim, marginBottom:12 }}>No missions match your search</div><Btn onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</Btn></Card>)}
          </div>
        </div>
      )}
      {modal && (
        <Modal title={modal==='edit'?`Edit Mission — ${form.name}`:'New Mission'} onClose={closeModal} wide>
          <MissionForm form={form} setForm={setForm} aircraft={aircraft} pilots={pilots} orgUsers={orgUsers} isEdit={modal==='edit'}/>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}><Btn onClick={closeModal}>Cancel</Btn><Btn variant='primary' onClick={save} disabled={saving||!form.name||!form.date}>{saving?'Saving…':modal==='edit'?'Save Changes':'Create Mission'}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

const AC_BLANK = { tail:'', model:'', type:'Multirotor', status:'airworthy', hours:'0', lastMaint:'', nextMaint:'', weightLbs:'', maxAltFt:'400', notes:'' };
const BT_BLANK = { label:'', aircraftId:'', totalCycles:'0', maxCycles:'400', capacityPct:'100', lastCharge:'', status:'good', notes:'' };
const EQ_BLANK = { name:'', type:'Payload', category:'Camera/Sensor', aircraftId:'', serialNum:'', status:'operational', purchaseDate:'', notes:'' };
const EQ_TYPES = ['Payload','Ground Station','Accessory','Sensor','Software','Other'];
const EQ_CATS = ['Camera/Sensor','Comms','GCS','Navigation','Safety','Battery/Power','Other'];
const P_BLANK = { name:'', cert:'Part 107', certNum:'', certExpiry:'', lastFlight:'', hours:'0', status:'current' };

function Assets({ aircraft, setAircraft, batteries, setBatteries, equipment, setEquipment, pilots, setPilots, flights, activeUser, addAudit }) {
  const [sub, setSub] = useState('Aircraft');
  const SUBS = ['Aircraft','Batteries','Pilots','Equipment','Schedule'];
  const SUB_COL = { Aircraft:C.amber, Batteries:C.blue, Pilots:C.purple, Equipment:C.green, Schedule:C.orange };
  const daysTo = dt => dt ? Math.round((new Date(dt)-new Date(TODAY))/(1000*60*60*24)) : null;
  const aTail = id => aircraft.find(a=>a.id===id)?.tail||'Unassigned';
  const canEditFleet=can(activeUser,'editFleet'), canEditBat=can(activeUser,'editBatteries'), canEditPilots=can(activeUser,'editPilots'), canEditEq=can(activeUser,'editEquipment'), canExport=can(activeUser,'exportData');

  const [acModal,setAcModal]=useState(false),[acForm,setAcForm]=useState(AC_BLANK),[acEditId,setAcEditId]=useState(null);
  const {confirm:confirmAc,confirmEl:confirmAcEl}=useConfirm();
  const setAcF=k=>e=>setAcForm(f=>({...f,[k]:e.target.value}));
  const openAcNew=()=>{setAcForm(AC_BLANK);setAcEditId(null);setAcModal(true);};
  const openAcEdit=ac=>{setAcForm({...ac,hours:String(ac.hours??0),weightLbs:String(ac.weightLbs??0),maxAltFt:String(ac.maxAltFt??400)});setAcEditId(ac.id);setAcModal(true);};
  const closeAcModal=()=>{setAcModal(false);setAcEditId(null);setAcForm(AC_BLANK);};
  const saveAc=()=>{if(!acForm.tail||!acForm.model)return;const p={...acForm,hours:Number(acForm.hours)||0,weightLbs:Number(acForm.weightLbs)||0,maxAltFt:Number(acForm.maxAltFt)||400};if(acEditId){setAircraft(a=>a.map(x=>x.id===acEditId?{...p,id:acEditId}:x));addAudit?.('Aircraft updated',acForm.tail);}else{setAircraft(a=>[...a,{...p,id:uid()}]);addAudit?.('Aircraft added',acForm.tail);}closeAcModal();};
  const delAc=async ac=>{if(await confirmAc({message:'Remove this aircraft?',label:`${ac.tail} — ${ac.model}`})){setAircraft(l=>l.filter(a=>a.id!==ac.id));addAudit?.('Aircraft removed',ac.tail);}};

  const [btModal,setBtModal]=useState(false),[btForm,setBtForm]=useState(BT_BLANK),[btEditId,setBtEditId]=useState(null);
  const {confirm:confirmBt,confirmEl:confirmBtEl}=useConfirm();
  const setBtF=k=>e=>setBtForm(f=>({...f,[k]:e.target.value}));
  const openBtNew=()=>{setBtForm(BT_BLANK);setBtEditId(null);setBtModal(true);};
  const openBtEdit=b=>{setBtForm({...b,totalCycles:String(b.totalCycles),maxCycles:String(b.maxCycles),capacityPct:String(b.capacityPct)});setBtEditId(b.id);setBtModal(true);};
  const closeBtModal=()=>{setBtModal(false);setBtEditId(null);setBtForm(BT_BLANK);};
  const saveBt=()=>{if(!btForm.label)return;const p={...btForm,totalCycles:Number(btForm.totalCycles)||0,maxCycles:Number(btForm.maxCycles)||400,capacityPct:Number(btForm.capacityPct)||100};if(btEditId){setBatteries(b=>b.map(x=>x.id===btEditId?{...p,id:btEditId}:x));}else{setBatteries(b=>[...b,{...p,id:uid()}]);}addAudit?.(btEditId?'Battery updated':'Battery added',btForm.label);closeBtModal();};
  const cycleBt=id=>{setBatteries(bs=>bs.map(b=>b.id===id?{...b,totalCycles:b.totalCycles+1,lastCharge:TODAY}:b));addAudit?.('Battery cycle logged',batteries.find(x=>x.id===id)?.label);};
  const delBt=async b=>{if(await confirmBt({message:'Remove this battery?',label:b.label})){setBatteries(bs=>bs.filter(x=>x.id!==b.id));addAudit?.('Battery removed',b.label);}};

  const [plModal,setPlModal]=useState(false),[plForm,setPlForm]=useState(P_BLANK),[plEditId,setPlEditId]=useState(null);
  const {confirm:confirmPl,confirmEl:confirmPlEl}=useConfirm();
  const setPlF=k=>e=>setPlForm(f=>({...f,[k]:e.target.value}));
  const openPlNew=()=>{setPlForm(P_BLANK);setPlEditId(null);setPlModal(true);};
  const openPlEdit=p=>{setPlForm({...p,hours:String(p.hours??0)});setPlEditId(p.id);setPlModal(true);};
  const closePlModal=()=>{setPlModal(false);setPlEditId(null);setPlForm(P_BLANK);};
  const savePl=()=>{if(!plForm.name)return;const p={...plForm,hours:Number(plForm.hours)||0};if(plEditId){setPilots(ps=>ps.map(x=>x.id===plEditId?{...p,id:plEditId}:x));addAudit?.('Pilot updated',plForm.name);}else{setPilots(ps=>[...ps,{...p,id:uid()}]);addAudit?.('Pilot added',plForm.name);}closePlModal();};
  const delPl=async p=>{if(await confirmPl({message:'Remove this pilot?',label:p.name})){setPilots(ps=>ps.filter(x=>x.id!==p.id));addAudit?.('Pilot removed',p.name);}};
  const pFlights=id=>(flights||[]).filter(f=>f.pilotId===id);
  const loggedHrs=id=>pFlights(id).reduce((a,f)=>a+f.durationMin/60,0).toFixed(1);

  const [eqModal,setEqModal]=useState(false),[eqForm,setEqForm]=useState(EQ_BLANK),[eqEditId,setEqEditId]=useState(null);
  const {confirm:confirmEq,confirmEl:confirmEqEl}=useConfirm();
  const setEqF=k=>e=>setEqForm(f=>({...f,[k]:e.target.value}));
  const openEqNew=()=>{setEqForm(EQ_BLANK);setEqEditId(null);setEqModal(true);};
  const openEqEdit=eq=>{setEqForm({...eq});setEqEditId(eq.id);setEqModal(true);};
  const closeEqModal=()=>{setEqModal(false);setEqEditId(null);setEqForm(EQ_BLANK);};
  const saveEq=()=>{if(!eqForm.name)return;if(eqEditId){setEquipment(e=>e.map(i=>i.id===eqEditId?{...eqForm,id:eqEditId}:i));}else{setEquipment(e=>[...e,{...eqForm,id:uid()}]);}addAudit?.(eqEditId?'Equipment updated':'Equipment added',eqForm.name);closeEqModal();};
  const delEq=async eq=>{if(await confirmEq({message:'Remove this item?',label:eq.name})){setEquipment(e=>e.filter(i=>i.id!==eq.id));addAudit?.('Equipment removed',eq.name);}};

  const airworthy=aircraft.filter(a=>a.status==='airworthy').length, goodBat=batteries.filter(b=>b.status==='good').length, currPilots=pilots.filter(p=>p.status==='current').length, opEq=equipment.filter(e=>e.status==='operational').length;
  const maintDue=aircraft.filter(a=>{const d=daysTo(a.nextMaint);return d!==null&&d<30&&d>=0;}).length;

  return (
    <div style={{position:'relative'}}>
      {confirmAcEl}{confirmBtEl}{confirmPlEl}{confirmEqEl}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:18}}>
        <StatCard label="Aircraft" value={`${airworthy}/${aircraft.length}`} sub="airworthy" accent={C.amber}/>
        <StatCard label="Batteries" value={`${goodBat}/${batteries.length}`} sub="good" accent={C.blue}/>
        <StatCard label="Pilots" value={`${currPilots}/${pilots.length}`} sub="current" accent={C.purple}/>
        <StatCard label="Equipment" value={`${opEq}/${equipment.length}`} sub="operational" accent={C.green}/>
        <StatCard label="Maint Due" value={maintDue} sub="within 30d" accent={maintDue>0?C.orange:C.dim}/>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {SUBS.map(s=>{const col=SUB_COL[s],active=sub===s;return(<button key={s} onClick={()=>setSub(s)} style={{background:'none',border:'none',padding:'9px 16px',fontSize:11,fontFamily:C.mono,letterSpacing:'0.06em',textTransform:'uppercase',color:active?col:C.dim,borderBottom:active?`2px solid ${col}`:'2px solid transparent',marginBottom:-1,cursor:'pointer'}}>{s}</button>);})}
      </div>

      {sub==='Aircraft'&&(<div>
        <SectionHeader title="Fleet Registry" onAdd={canEditFleet?openAcNew:null} addLabel="+ Add Aircraft"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
          {aircraft.map(ac=>{const days=daysTo(ac.nextMaint),soon=days!==null&&days<30&&days>0;return(
            <Card key={ac.id} style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:ac.status==='airworthy'?`${C.green}08`:ac.status==='maintenance'?`${C.amber}08`:`${C.red}08`}}>
                <div><div style={{fontFamily:C.mono,fontSize:13,fontWeight:700,color:C.amber}}>{ac.tail}</div><div style={{fontSize:11,color:C.mid,marginTop:2}}>{ac.model}</div></div>
                <Badge status={ac.status}/>
              </div>
              <div style={{padding:'12px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:10}}>
                  {[['Type',ac.type],['Hours',Number(ac.hours).toFixed(1)+'h'],['Weight',ac.weightLbs+'lbs'],['Max Alt',ac.maxAltFt+'ft'],['Last Maint',ac.lastMaint||'—'],['Next Maint',ac.nextMaint||'—']].map(([l,v])=>(<div key={l}><div style={{fontSize:9,color:C.dim,fontFamily:C.mono,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>{l}</div><div style={{fontSize:11,color:C.text,fontFamily:C.mono}}>{v}</div></div>))}
                </div>
                {soon&&<div style={{background:`${C.amber}15`,border:`1px solid ${C.amber}40`,borderRadius:4,padding:'5px 10px',fontSize:10,color:C.amber,fontFamily:C.mono,marginBottom:10}}>Maintenance due in {days} days</div>}
                {ac.notes&&<div style={{fontSize:11,color:C.dim,marginBottom:10}}>{ac.notes}</div>}
                {canEditFleet&&<div style={{display:'flex',gap:6}}><Btn variant='amber' onClick={()=>openAcEdit(ac)} xstyle={{padding:'5px 10px',fontSize:10}}>Edit</Btn><Btn onClick={()=>delAc(ac)} xstyle={{padding:'5px 10px',fontSize:10}}>Remove</Btn></div>}
              </div>
            </Card>);})}
        </div>
        {acModal&&(<Modal title={acEditId?`Edit Aircraft — ${acForm.tail}`:'Add Aircraft'} onClose={closeAcModal} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Tail Number"><input value={acForm.tail} onChange={setAcF('tail')} style={{width:'100%'}}/></Field>
            <Field label="Model"><input value={acForm.model} onChange={setAcF('model')} style={{width:'100%'}}/></Field>
            <Field label="Type"><select value={acForm.type} onChange={setAcF('type')} style={{width:'100%'}}><option>Multirotor</option><option>Fixed Wing</option><option>VTOL</option><option>Helicopter</option><option>Other</option></select></Field>
            <Field label="Status"><select value={acForm.status} onChange={setAcF('status')} style={{width:'100%'}}><option value="airworthy">Airworthy</option><option value="maintenance">Maintenance</option><option value="grounded">Grounded</option></select></Field>
            <Field label="Total Hours"><input type="number" value={acForm.hours} onChange={setAcF('hours')} style={{width:'100%'}}/></Field>
            <Field label="Weight (lbs)"><input type="number" value={acForm.weightLbs} onChange={setAcF('weightLbs')} style={{width:'100%'}}/></Field>
            <Field label="Max Alt (ft AGL)"><input type="number" value={acForm.maxAltFt} onChange={setAcF('maxAltFt')} style={{width:'100%'}}/></Field>
            <Field label="Last Maintenance"><input type="date" value={acForm.lastMaint} onChange={setAcF('lastMaint')} style={{width:'100%'}}/></Field>
            <Field label="Next Maintenance"><input type="date" value={acForm.nextMaint} onChange={setAcF('nextMaint')} style={{width:'100%'}}/></Field>
          </div>
          <Field label="Notes"><textarea value={acForm.notes} onChange={setAcF('notes')} rows={2} style={{width:'100%',marginTop:4}}/></Field>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}><Btn onClick={closeAcModal}>Cancel</Btn><Btn variant='primary' onClick={saveAc}>{acEditId?'Save Changes':'Add Aircraft'}</Btn></div>
        </Modal>)}
      </div>)}

      {sub==='Batteries'&&(<div>
        <SectionHeader title="Battery Registry" onAdd={canEditBat?openBtNew:null} addLabel="+ Add Battery"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
          {batteries.map(b=>{const cycPct=Math.round(b.totalCycles/b.maxCycles*100),cycColor=cycPct>85?C.red:cycPct>65?C.amber:C.green,capColor=b.capacityPct<75?C.red:b.capacityPct<85?C.amber:C.green;return(
            <Card key={b.id} style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'11px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:(SCOL[b.status]||C.dim)+'08'}}>
                <div><div style={{fontFamily:C.mono,fontSize:12,fontWeight:700,color:C.amber}}>{b.label}</div><div style={{fontSize:10,color:C.dim,marginTop:2}}>{aTail(b.aircraftId)}</div></div>
                <Badge status={b.status}/>
              </div>
              <div style={{padding:'12px 16px'}}>
                {[['Capacity',`${b.capacityPct}%`,b.capacityPct,capColor],['Cycles',`${b.totalCycles}/${b.maxCycles}`,Math.min(cycPct,100),cycColor]].map(([lbl,val,pct,col])=>(
                  <div key={lbl} style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:9,fontFamily:C.mono,color:C.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</span><span style={{fontSize:11,fontFamily:C.mono,color:col,fontWeight:700}}>{val}</span></div>
                    <div style={{height:5,background:C.border,borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:col,borderRadius:3}}/></div>
                  </div>
                ))}
                {b.notes&&<div style={{fontSize:11,color:C.dim,marginBottom:10}}>{b.notes}</div>}
                {canEditBat&&<div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Btn variant='blue' onClick={()=>cycleBt(b.id)} xstyle={{padding:'5px 10px',fontSize:10}}>+ Cycle</Btn><Btn variant='amber' onClick={()=>openBtEdit(b)} xstyle={{padding:'5px 10px',fontSize:10}}>Edit</Btn><Btn onClick={()=>delBt(b)} xstyle={{padding:'5px 10px',fontSize:10}}>X</Btn></div>}
              </div>
            </Card>);})}
        </div>
        {btModal&&(<Modal title={btEditId?`Edit Battery — ${btForm.label}`:'Add Battery'} onClose={closeBtModal}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Battery Label"><input value={btForm.label} onChange={setBtF('label')} style={{width:'100%'}}/></Field>
            <Field label="Aircraft"><select value={btForm.aircraftId} onChange={setBtF('aircraftId')} style={{width:'100%'}}><option value="">Unassigned</option>{aircraft.map(a=><option key={a.id} value={a.id}>{a.tail} – {a.model}</option>)}</select></Field>
            <Field label="Total Cycles"><input type="number" min="0" value={btForm.totalCycles} onChange={setBtF('totalCycles')} style={{width:'100%'}}/></Field>
            <Field label="Max Rated Cycles"><input type="number" min="1" value={btForm.maxCycles} onChange={setBtF('maxCycles')} style={{width:'100%'}}/></Field>
            <Field label="Capacity (%)"><input type="number" min="0" max="100" value={btForm.capacityPct} onChange={setBtF('capacityPct')} style={{width:'100%'}}/></Field>
            <Field label="Last Charge"><input type="date" value={btForm.lastCharge} onChange={setBtF('lastCharge')} style={{width:'100%'}}/></Field>
            <Field label="Status"><select value={btForm.status} onChange={setBtF('status')} style={{width:'100%'}}><option value="good">Good</option><option value="degraded">Degraded</option><option value="retired">Retired</option></select></Field>
          </div>
          <Field label="Notes"><textarea value={btForm.notes} onChange={setBtF('notes')} rows={2} style={{width:'100%',marginTop:4}}/></Field>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}><Btn onClick={closeBtModal}>Cancel</Btn><Btn variant='primary' onClick={saveBt}>{btEditId?'Save Changes':'Add Battery'}</Btn></div>
        </Modal>)}
      </div>)}

      {sub==='Pilots'&&(<div>
        <SectionHeader title="Pilot Registry" onAdd={canEditPilots?openPlNew:null} addLabel="+ Add Pilot"/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:12}}>
          {pilots.map(p=>{const days=daysTo(p.certExpiry),soon=days!==null&&days<90&&days>0,exp=days!==null&&days<=0;return(
            <Card key={p.id} style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:`${C.purple}18`,border:`1.5px solid ${C.purple}40`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.mono,fontSize:13,fontWeight:700,color:C.purple,flexShrink:0}}>{p.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                  <div><div style={{fontSize:13,fontWeight:500,color:C.text}}>{p.name}</div><div style={{fontSize:10,color:C.dim,fontFamily:C.mono,marginTop:1}}>{p.cert} #{p.certNum||'—'}</div></div>
                </div>
                <Badge status={p.status}/>
              </div>
              <div style={{padding:'12px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  {[['Cert Expiry',p.certExpiry||'—'],['Last Flight',p.lastFlight||'—'],['Logged Hrs',loggedHrs(p.id)+'h'],['Total Hrs',Number(p.hours).toFixed(1)+'h']].map(([l,v])=>(<div key={l}><div style={{fontSize:9,color:C.dim,fontFamily:C.mono,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>{l}</div><div style={{fontSize:11,color:C.text,fontFamily:C.mono}}>{v}</div></div>))}
                </div>
                {soon&&<div style={{background:`${C.amber}15`,border:`1px solid ${C.amber}40`,borderRadius:4,padding:'5px 10px',fontSize:10,color:C.amber,fontFamily:C.mono,marginBottom:10}}>Cert expires in {days} days</div>}
                {exp&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}40`,borderRadius:4,padding:'5px 10px',fontSize:10,color:C.red,fontFamily:C.mono,marginBottom:10}}>Cert EXPIRED {Math.abs(days)} days ago</div>}
                {canEditPilots&&<div style={{display:'flex',gap:6}}><Btn variant='amber' onClick={()=>openPlEdit(p)} xstyle={{padding:'5px 10px',fontSize:10}}>Edit</Btn><Btn onClick={()=>delPl(p)} xstyle={{padding:'5px 10px',fontSize:10}}>Remove</Btn></div>}
              </div>
            </Card>);})}
        </div>
        {plModal&&(<Modal title={plEditId?`Edit Pilot — ${plForm.name}`:'Add Pilot'} onClose={closePlModal}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Full Name"><input value={plForm.name} onChange={setPlF('name')} style={{width:'100%'}}/></Field>
            <Field label="Status"><select value={plForm.status} onChange={setPlF('status')} style={{width:'100%'}}><option value="current">Current</option><option value="expired">Expired</option><option value="pending">Pending Review</option></select></Field>
            <Field label="Certificate Type"><select value={plForm.cert} onChange={setPlF('cert')} style={{width:'100%'}}><option>Part 107</option><option>Recreational</option><option>Military</option><option>Foreign Certificate</option></select></Field>
            <Field label="Certificate Number"><input value={plForm.certNum} onChange={setPlF('certNum')} style={{width:'100%'}}/></Field>
            <Field label="Certificate Expiry"><input type="date" value={plForm.certExpiry} onChange={setPlF('certExpiry')} style={{width:'100%'}}/></Field>
            <Field label="Last Flight Date"><input type="date" value={plForm.lastFlight} onChange={setPlF('lastFlight')} style={{width:'100%'}}/></Field>
            <Field label="Total Hours"><input type="number" value={plForm.hours} onChange={setPlF('hours')} style={{width:'100%'}}/></Field>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}><Btn onClick={closePlModal}>Cancel</Btn><Btn variant='primary' onClick={savePl}>{plEditId?'Save Changes':'Add Pilot'}</Btn></div>
        </Modal>)}
      </div>)}

      {sub==='Equipment'&&(<div>
        <SectionHeader title="Equipment & Payload Registry" onAdd={canEditEq?openEqNew:null} addLabel="+ Add Item"/>
        <Card style={{padding:0}}>
          <DataTable headers={['Name','Type','Category','Aircraft','Serial','Status','Actions']} rows={equipment.map(eq=>[
            <div key="n"><div style={{fontSize:12,color:C.text,fontWeight:500}}>{eq.name}</div>{eq.notes&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>{eq.notes}</div>}</div>,
            <span key="t" style={{fontSize:11,color:C.mid}}>{eq.type}</span>,
            <span key="c" style={{fontSize:11,color:C.mid}}>{eq.category}</span>,
            <span key="a" style={{fontFamily:C.mono,fontSize:11,color:C.amber}}>{aTail(eq.aircraftId)}</span>,
            <span key="s" style={{fontFamily:C.mono,fontSize:11,color:C.dim}}>{eq.serialNum||'—'}</span>,
            <Badge key="st" status={eq.status}/>,
            <div key="ac" style={{display:'flex',gap:5}}>{canEditEq&&<Btn variant='amber' onClick={()=>openEqEdit(eq)} xstyle={{padding:'4px 9px',fontSize:10}}>Edit</Btn>}{canEditEq&&<Btn variant='red' onClick={()=>delEq(eq)} xstyle={{padding:'4px 9px',fontSize:10}}>X</Btn>}</div>,
          ])}/>
        </Card>
        {eqModal&&(<Modal title={eqEditId?`Edit Equipment — ${eqForm.name}`:'Add Equipment'} onClose={closeEqModal} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Item Name"><input value={eqForm.name} onChange={setEqF('name')} style={{width:'100%'}}/></Field>
            <Field label="Type"><select value={eqForm.type} onChange={setEqF('type')} style={{width:'100%'}}>{EQ_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Category"><select value={eqForm.category} onChange={setEqF('category')} style={{width:'100%'}}>{EQ_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Aircraft"><select value={eqForm.aircraftId} onChange={setEqF('aircraftId')} style={{width:'100%'}}><option value="">Unassigned</option>{aircraft.map(a=><option key={a.id} value={a.id}>{a.tail} – {a.model}</option>)}</select></Field>
            <Field label="Serial Number"><input value={eqForm.serialNum} onChange={setEqF('serialNum')} style={{width:'100%'}}/></Field>
            <Field label="Purchase Date"><input type="date" value={eqForm.purchaseDate} onChange={setEqF('purchaseDate')} style={{width:'100%'}}/></Field>
            <Field label="Status"><select value={eqForm.status} onChange={setEqF('status')} style={{width:'100%'}}><option value="operational">Operational</option><option value="unserviceable">Unserviceable</option><option value="storage">In Storage</option></select></Field>
          </div>
          <Field label="Notes"><textarea value={eqForm.notes} onChange={setEqF('notes')} rows={2} style={{width:'100%',marginTop:4}}/></Field>
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}><Btn onClick={closeEqModal}>Cancel</Btn><Btn variant='primary' onClick={saveEq}>{eqEditId?'Save Changes':'Add Item'}</Btn></div>
        </Modal>)}
      </div>)}

      {sub==='Schedule'&&(()=>{
        const urgColor=d=>d===null?C.dim:d<0?C.red:d<14?C.red:d<30?C.orange:d<60?C.amber:d<90?C.blue:C.green;
        const urgLabel=d=>d===null?'No date':d<0?'OVERDUE':d<14?'CRITICAL':d<30?'URGENT':d<60?'SOON':d<90?'UPCOMING':'OK';
        const events=[];
        aircraft.forEach(ac=>{if(ac.nextMaint){const d=daysTo(ac.nextMaint);events.push({type:'Aircraft Maintenance',label:`${ac.tail} — ${ac.model}`,date:ac.nextMaint,days:d,cat:'aircraft'});}});
        batteries.forEach(bt=>{const cp=Math.round(bt.totalCycles/bt.maxCycles*100);if(cp>80||bt.status==='degraded'){events.push({type:'Battery End of Life',label:`${bt.label} — ${bt.maxCycles-bt.totalCycles} cycles remaining`,date:'—',days:null,cycPct:cp,cat:'battery',custom:true});}});
        pilots.forEach(p=>{if(p.certExpiry){const d=daysTo(p.certExpiry);events.push({type:'Pilot Certificate Renewal',label:`${p.name} — ${p.cert} #${p.certNum}`,date:p.certExpiry,days:d,cat:'pilot'});}});
        const sorted=[...events].sort((a,b)=>(a.days??9999)-(b.days??9999));
        const catColor={aircraft:C.amber,battery:C.blue,pilot:C.green};
        const catIcon={aircraft:'AC',battery:'BAT',pilot:'ID'};
        return(
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {sorted.map((ev,i)=>{const col=urgColor(ev.days);return(
                <Card key={i} style={{padding:'13px 16px',borderLeft:`3px solid ${col}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <div style={{width:28,height:28,borderRadius:6,background:(catColor[ev.cat]||C.dim)+'18',border:`1px solid ${(catColor[ev.cat]||C.dim)}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{catIcon[ev.cat]}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontFamily:C.mono,color:catColor[ev.cat]||C.dim,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>{ev.type}</div><div style={{fontSize:13,color:C.text}}>{ev.label}</div></div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {ev.custom?<div style={{fontSize:11,fontFamily:C.mono,color:C.amber}}>Check needed<br/><span style={{fontSize:10,color:C.dim}}>{ev.cycPct}% of max cycles</span></div>
                        :<div><div style={{fontFamily:C.mono,fontSize:11,color:C.dim,marginBottom:4}}>{ev.date}</div><span style={{display:'inline-block',background:`${col}18`,border:`1px solid ${col}44`,color:col,borderRadius:4,padding:'2px 8px',fontSize:10,fontFamily:C.mono,fontWeight:700,textTransform:'uppercase',whiteSpace:'nowrap'}}>{ev.days!==null&&ev.days>=0?`${ev.days}d `:ev.days!==null?`${Math.abs(ev.days)}d overdue `:''}{urgLabel(ev.days)}</span></div>}
                    </div>
                  </div>
                </Card>);})}
              {!events.length&&<Card style={{padding:40,textAlign:'center'}}><span style={{fontFamily:C.mono,fontSize:11,color:C.green}}>No maintenance events tracked.</span></Card>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Analytics({ flights, aircraft, pilots, activeUser }) {
  const refMonthly = useRef(null), refAcUtil = useRef(null), refPilotHrs = useRef(null), refOpType = useRef(null);
  const chartInst = useRef({});
  const [chartReady, setChartReady] = useState(false);
  if (!can(activeUser, 'viewAnalytics')) return <PermDenied action="viewAnalytics"/>;
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    s.onload = () => setChartReady(true);
    document.head.appendChild(s);
  }, []);
  useEffect(() => {
    if (!chartReady || !window.Chart) return;
    const Ch = window.Chart;
    const GRID = { color:'rgba(255,255,255,0.05)' };
    const TICK = { color:'#475569', font:{ family:'Space Mono, monospace', size:10 } };
    const base = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#94A3B8', font:{ family:'Space Mono, monospace', size:10 }, boxWidth:10, padding:14 } }, tooltip:{ backgroundColor:'#141B28', titleColor:'#E2E8F0', bodyColor:'#94A3B8', borderColor:'#263147', borderWidth:1 } } };
    const destroy = k => { try { chartInst.current[k]?.destroy(); } catch(e) {} };
    if (refMonthly.current) { destroy('monthly'); const mo = {}; flights.forEach(f => { const m = f.date.slice(0,7); mo[m]=(mo[m]||0)+f.durationMin/60; }); const keys = Object.keys(mo).sort().slice(-8); chartInst.current.monthly = new Ch(refMonthly.current, { type:'bar', data:{ labels:keys.map(k=>k.slice(5)+'/'+k.slice(2,4)), datasets:[{ label:'Hours', data:keys.map(k=>+mo[k].toFixed(2)), backgroundColor:'#F59E0B33', borderColor:'#F59E0B', borderWidth:2, borderRadius:4 }] }, options:{ ...base, scales:{ y:{ grid:GRID, ticks:{ ...TICK, callback:v=>v+'h' } }, x:{ grid:GRID, ticks:TICK } } } }); }
    if (refAcUtil.current) { destroy('acUtil'); const ah = {}; flights.forEach(f => { const t=aircraft.find(a=>a.id===f.aircraftId)?.tail||'?'; ah[t]=(ah[t]||0)+f.durationMin/60; }); const keys = Object.keys(ah); const cols = ['#F59E0B','#60A5FA','#10B981','#A78BFA','#2DD4BF']; chartInst.current.acUtil = new Ch(refAcUtil.current, { type:'doughnut', data:{ labels:keys, datasets:[{ data:keys.map(k=>+ah[k].toFixed(2)), backgroundColor:keys.map((_,i)=>cols[i%cols.length]+'BB'), borderColor:keys.map((_,i)=>cols[i%cols.length]), borderWidth:2 }] }, options:{ ...base, cutout:'68%', plugins:{ ...base.plugins, legend:{ position:'bottom', labels:{ ...base.plugins.legend.labels } } } } }); }
    if (refPilotHrs.current) { destroy('pilotHrs'); const ph = {}; flights.forEach(f => { const n=pilots.find(p=>p.id===f.pilotId)?.name||'?'; ph[n]=(ph[n]||0)+f.durationMin/60; }); const keys = Object.keys(ph); chartInst.current.pilotHrs = new Ch(refPilotHrs.current, { type:'bar', data:{ labels:keys, datasets:[{ label:'Hours', data:keys.map(k=>+ph[k].toFixed(2)), backgroundColor:['#60A5FA33','#10B98133','#A78BFA33'], borderColor:['#60A5FA','#10B981','#A78BFA'], borderWidth:2, borderRadius:4 }] }, options:{ ...base, indexAxis:'y', scales:{ x:{ grid:GRID, ticks:{ ...TICK, callback:v=>v+'h' } }, y:{ grid:GRID, ticks:TICK } } } }); }
    if (refOpType.current) { destroy('opType'); const mo = {}; flights.forEach(f => { const m=f.date.slice(0,7); mo[m]=(mo[m]||0)+f.takeoffs; }); const keys = Object.keys(mo).sort().slice(-8); chartInst.current.opType = new Ch(refOpType.current, { type:'line', data:{ labels:keys.map(k=>k.slice(5)+'/'+k.slice(2,4)), datasets:[{ label:'Takeoffs', data:keys.map(k=>mo[k]), borderColor:'#2DD4BF', backgroundColor:'#2DD4BF18', pointBackgroundColor:'#2DD4BF', tension:0.4, fill:true, pointRadius:4 }] }, options:{ ...base, scales:{ y:{ grid:GRID, ticks:TICK }, x:{ grid:GRID, ticks:TICK } } } }); }
    return () => { Object.keys(chartInst.current).forEach(k => destroy(k)); };
  }, [chartReady, flights, aircraft, pilots]);
  const totHrs = flights.reduce((a,f) => a + f.durationMin/60, 0);
  if (!chartReady) return <div style={{ padding:60, textAlign:'center', fontFamily:C.mono, fontSize:11, color:C.dim }}>Loading Chart.js…</div>;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:22 }}>
        <StatCard label="Total Hours" value={totHrs.toFixed(1)} sub={`${flights.length} total flights`} accent={C.amber}/>
        <StatCard label="Total Takeoffs" value={flights.reduce((a,f)=>a+f.takeoffs,0)} accent={C.blue}/>
        <StatCard label="Avg Duration" value={flights.length?Math.round(flights.reduce((a,f)=>a+f.durationMin,0)/flights.length)+'min':'—'} accent={C.green}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <Card style={{ padding:'16px 20px' }}><div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Monthly Flight Hours</div><div style={{ height:220 }}><canvas ref={refMonthly}/></div></Card>
        <Card style={{ padding:'16px 20px' }}><div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Aircraft Utilization</div><div style={{ height:220 }}><canvas ref={refAcUtil}/></div></Card>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Card style={{ padding:'16px 20px' }}><div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Pilot Hours Breakdown</div><div style={{ height:200 }}><canvas ref={refPilotHrs}/></div></Card>
        <Card style={{ padding:'16px 20px' }}><div style={{ fontSize:10, fontFamily:C.mono, color:C.amber, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Monthly Operations</div><div style={{ height:200 }}><canvas ref={refOpType}/></div></Card>
      </div>
    </div>
  );
}

const INC_BLANK = { date:'', pilotId:'', aircraftId:'', location:'', type:'Airspace', severity:'low', description:'', asrs:'', status:'draft', notes:'' };
const INC_TYPES = ['Airspace','Loss of Control','Technical Failure','Weather','Near Miss','Ground Incident','Wildlife Strike','Communication','Other'];
const SEV_OPTS = ['low','medium','high','critical'];

function Incidents({ incidents, setIncidents, aircraft, pilots, activeUser }) {
  const canEdit = can(activeUser, 'editIncidents');
  const [modal, setModal] = useState(false), [viewInc, setViewInc] = useState(null), [form, setForm] = useState(INC_BLANK), [drafting, setDrafting] = useState(false);
  const { confirm, confirmEl } = useConfirm();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const add = () => { if (!form.date || !form.description) return; setIncidents(i => [...i, { ...form, id:uid() }]); setForm(INC_BLANK); setModal(false); };
  const del = async inc => { if (await confirm({ message:'Delete this incident report?', label:`${inc.date} · ${inc.type}` })) setIncidents(is => is.filter(i => i.id!==inc.id)); };
  const setStatus = (id, s) => setIncidents(is => is.map(i => i.id===id ? { ...i, status:s } : i));
  const pName = id => pilots.find(p => p.id===id)?.name || '—';
  const aTail = id => aircraft.find(a => a.id===id)?.tail || '—';
  const SEV_COL = { low:C.green, medium:C.amber, high:C.orange, critical:C.red };
  const draftASRS = async (inc) => {
    setDrafting(true);
    try {
      const sys = `You are an expert UAS safety officer specializing in FAA ASRS narratives. Write clear, factual, third-person ASRS report narratives in 150-250 words.`;
      const prompt = `Draft an ASRS safety report narrative for this UAS incident:\nDate: ${inc.date}\nLocation: ${inc.location}\nType: ${inc.type}\nSeverity: ${inc.severity}\nAircraft: ${aTail(inc.aircraftId)}\nPilot: ${pName(inc.pilotId)}\n\nDescription:\n${inc.description}\n\nNotes: ${inc.notes||'None'}\n\nWrite only the ASRS narrative text.`;
      const text = await callAI([{ role:'user', content:prompt }], sys, 600);
      setIncidents(is => is.map(i => i.id===inc.id ? { ...i, asrs:text } : i));
      setViewInc(v => v ? { ...v, asrs:text } : v);
    } catch (e) { console.error('ASRS draft error:', e); }
    setDrafting(false);
  };
  const sorted = [...incidents].sort((a,b) => b.date.localeCompare(a.date));
  return (
    <div style={{ position:'relative' }}>
      {confirmEl}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        <StatCard label="Total Reports" value={incidents.length}/><StatCard label="Draft" value={incidents.filter(i => i.status==='draft').length} accent={C.amber}/><StatCard label="Submitted" value={incidents.filter(i => i.status==='submitted').length} accent={C.blue}/><StatCard label="Closed" value={incidents.filter(i => i.status==='closed').length} accent={C.dim}/>
      </div>
      <SectionHeader title="Incident Reports" onAdd={canEdit ? () => setModal(true) : null} addLabel="+ Report Incident"/>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.map(inc => {
          const col = SEV_COL[inc.severity] || C.dim;
          return (
            <Card key={inc.id} style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:4, borderRadius:2, alignSelf:'stretch', background:col, flexShrink:0, minHeight:40 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:C.dim }}>{inc.date}</span>
                    <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{inc.type} Incident</span>
                    <Badge status={inc.severity}/><Badge status={inc.status}/>
                  </div>
                  <div style={{ fontSize:11, color:C.dim, marginBottom:8 }}>{inc.location} · {aTail(inc.aircraftId)} · {pName(inc.pilotId)}</div>
                  <div style={{ fontSize:12, color:C.mid, lineHeight:1.6, marginBottom:12, maxHeight:60, overflow:'hidden' }}>{inc.description}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Btn variant='blue' onClick={() => setViewInc(incidents.find(i => i.id===inc.id))} xstyle={{ padding:'5px 12px', fontSize:10 }}>View</Btn>
                    {canEdit && !inc.asrs && <Btn variant='purple' onClick={() => draftASRS(inc)} disabled={drafting} xstyle={{ padding:'5px 12px', fontSize:10 }}>{drafting ? 'Drafting…' : 'Draft ASRS'}</Btn>}
                    {inc.asrs && <Btn variant='teal' onClick={() => printIncident(inc, pName(inc.pilotId), aTail(inc.aircraftId))} xstyle={{ padding:'5px 12px', fontSize:10 }}>Print Report</Btn>}
                    {canEdit && inc.status==='draft' && <Btn variant='green' onClick={() => setStatus(inc.id,'submitted')} xstyle={{ padding:'5px 12px', fontSize:10 }}>Mark Submitted</Btn>}
                    {canEdit && inc.status==='submitted' && <Btn onClick={() => setStatus(inc.id,'closed')} xstyle={{ padding:'5px 12px', fontSize:10 }}>Close</Btn>}
                    {canEdit && <Btn variant='red' onClick={() => del(inc)} xstyle={{ padding:'5px 12px', fontSize:10 }}>Delete</Btn>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {!sorted.length && <Card style={{ padding:40, textAlign:'center' }}><span style={{ fontFamily:C.mono, fontSize:11, color:C.green }}>No incidents recorded — good flying!</span></Card>}
      </div>
      {modal && (
        <Modal title="Report Incident" onClose={() => setModal(false)} wide>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Date"><input type="date" value={form.date} onChange={set('date')} style={{ width:'100%' }}/></Field>
            <Field label="Location"><input value={form.location} onChange={set('location')} style={{ width:'100%' }}/></Field>
            <Field label="Type"><select value={form.type} onChange={set('type')} style={{ width:'100%' }}>{INC_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Severity"><select value={form.severity} onChange={set('severity')} style={{ width:'100%' }}>{SEV_OPTS.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Aircraft"><select value={form.aircraftId} onChange={set('aircraftId')} style={{ width:'100%' }}><option value="">Select…</option>{aircraft.map(a => <option key={a.id} value={a.id}>{a.tail}</option>)}</select></Field>
            <Field label="Pilot"><select value={form.pilotId} onChange={set('pilotId')} style={{ width:'100%' }}><option value="">Select…</option>{pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="Description"><textarea value={form.description} onChange={set('description')} rows={5} style={{ width:'100%', lineHeight:1.6 }}/></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={set('notes')} rows={2} style={{ width:'100%' }}/></Field>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}><Btn onClick={() => setModal(false)}>Cancel</Btn><Btn variant='primary' onClick={add}>Save Report</Btn></div>
        </Modal>
      )}
      {viewInc && (
        <Modal title={`Incident — ${viewInc.type} · ${viewInc.date}`} onClose={() => setViewInc(null)} wide>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16, padding:14, background:C.card2, borderRadius:8 }}>
            {[['Date',viewInc.date],['Location',viewInc.location],['Type',viewInc.type],['Severity',viewInc.severity.toUpperCase()],['Aircraft',aTail(viewInc.aircraftId)],['Pilot',pName(viewInc.pilotId)]].map(([l,v]) => (<div key={l}><div style={{ fontSize:9, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>{l}</div><div style={{ fontSize:12, color:C.text }}>{v}</div></div>))}
          </div>
          <div style={{ fontSize:12, color:C.mid, lineHeight:1.7, marginBottom:16, whiteSpace:'pre-wrap' }}>{viewInc.description}</div>
          {viewInc.asrs && <div style={{ background:C.card2, border:`1px solid ${C.purple}30`, borderRadius:6, padding:14, fontSize:12, color:C.text, lineHeight:1.8, whiteSpace:'pre-wrap', marginBottom:16 }}>{viewInc.asrs}</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            {viewInc.asrs && <Btn variant='teal' onClick={() => printIncident(viewInc, pName(viewInc.pilotId), aTail(viewInc.aircraftId))}>Print</Btn>}
            <Btn onClick={() => setViewInc(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

const QUICK_PROMPTS = [
  { label:'Risk Assessment', prompt:'Run a pre-flight risk assessment for our next upcoming mission.' },
  { label:'Hours Summary', prompt:'Summarize our flight hours and operations statistics broken down by pilot and by aircraft.' },
  { label:'Expiry Report', prompt:'List all certificate, maintenance, and battery expiry events requiring attention in the next 90 days.' },
  { label:'Fleet Status', prompt:'Give me a full operational status briefing on our fleet including battery health and equipment.' },
];

function AIAssistant({ flights, missions, aircraft, pilots, batteries, incidents, equipment }) {
  const [messages, setMessages] = useState([]), [input, setInput] = useState(''), [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const buildSys = () => {
    const totHrs = flights.reduce((a,f) => a+f.durationMin/60, 0).toFixed(1);
    return `You are EWEB UAS AI, an expert UAS flight operations assistant for EWEB. TODAY: ${TODAY}
FLEET: ${aircraft.map(a => `${a.tail} (${a.model}, ${a.status}, ${a.hours}h)`).join('; ')}
BATTERIES: ${batteries.map(b => `${b.label}: ${b.totalCycles}/${b.maxCycles} cycles, ${b.capacityPct}%, ${b.status}`).join('; ')}
PILOTS: ${pilots.map(p => `${p.name} (${p.cert}, exp:${p.certExpiry||'?'}, ${p.status})`).join('; ')}
MISSIONS: ${missions.map(m => `${m.name} ${m.date} — ${m.status}`).join('; ')}
FLIGHTS (${flights.length}, ${totHrs}h total): ${flights.slice(0,6).map(f => `${f.date} ${f.durationMin}min`).join('; ')}
INCIDENTS: ${incidents.map(i => `${i.date} ${i.type} ${i.severity}`).join('; ')}
Be direct, professional, concise. Flag safety/compliance issues.`;
  };
  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role:'user', content:text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try { const reply = await callAI(newMsgs, buildSys()); setMessages(m => [...m, { role:'assistant', content:reply }]); }
    catch (e) { setMessages(m => [...m, { role:'assistant', content:`Error: ${e.message}` }]); }
    setLoading(false);
  };
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 220px)', minHeight:500 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:`${C.purple}18`, border:`1px solid ${C.purple}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={C.purple} strokeWidth="1.5"/><path d="M6 9h6M9 6v6" stroke={C.purple} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div><div style={{ fontFamily:C.mono, fontSize:12, fontWeight:700, color:C.purple }}>EWEB UAS AI</div><div style={{ fontSize:10, color:C.dim, marginTop:1 }}>Claude · {flights.length} flights · {aircraft.length} aircraft</div></div>
        {messages.length > 0 && <button onClick={() => setMessages([])} style={{ marginLeft:'auto', background:'none', border:`1px solid ${C.border2}`, color:C.dim, borderRadius:4, padding:'4px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>Clear</button>}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
        {QUICK_PROMPTS.map(qp => (<button key={qp.label} onClick={() => send(qp.prompt)} disabled={loading} style={{ background:'transparent', border:`1px solid ${C.purple}50`, color:C.purple, borderRadius:20, padding:'5px 13px', fontSize:11, fontFamily:C.mono, cursor:loading?'not-allowed':'pointer', opacity:loading?0.5:1, whiteSpace:'nowrap' }}>{qp.label}</button>))}
      </div>
      <Card style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:0 }}>
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
          {!messages.length && (<div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, textAlign:'center' }}><div style={{ fontSize:14, color:C.mid, marginBottom:6 }}>AI ops assistant ready</div><div style={{ fontSize:12, color:C.dim, maxWidth:400, lineHeight:1.6 }}>Full ops context loaded. Ask anything or use the quick buttons above.</div></div>)}
          {messages.map((m, i) => (
            <div key={i} style={{ display:'flex', gap:10, flexDirection:m.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
              <div style={{ width:28, height:28, borderRadius:5, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:m.role==='user'?`${C.amber}18`:`${C.purple}18`, border:`1px solid ${m.role==='user'?C.amber:C.purple}30`, fontSize:10, fontWeight:700, fontFamily:C.mono, color:m.role==='user'?C.amber:C.purple }}>{m.role==='user' ? 'YOU' : 'AI'}</div>
              <div style={{ maxWidth:'78%', background:m.role==='user'?`${C.amber}10`:C.card2, border:`1px solid ${m.role==='user'?C.amber+'30':C.border}`, borderRadius:m.role==='user'?'10px 3px 10px 10px':'3px 10px 10px 10px', padding:'9px 13px' }}>
                <div style={{ fontSize:13, color:C.text, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (<div style={{ display:'flex', gap:10, alignItems:'flex-start' }}><div style={{ width:28, height:28, borderRadius:5, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:`${C.purple}18`, border:`1px solid ${C.purple}30`, fontSize:10, fontWeight:700, fontFamily:C.mono, color:C.purple }}>AI</div><div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:'3px 10px 10px 10px', padding:'12px 16px' }}><div style={{ display:'flex', gap:5 }}>{[0,1,2].map(i => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:C.purple, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`, display:'block' }}/>)}</div></div></div>)}
          <div ref={bottomRef}/>
        </div>
        <div style={{ borderTop:`1px solid ${C.border}`, padding:12, display:'flex', gap:8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && send(input)} placeholder="Ask about your operations…" style={{ flex:1, background:C.card2, border:`1px solid ${C.border2}`, color:C.text, borderRadius:8, padding:'10px 14px', fontFamily:C.sans, fontSize:13, outline:'none' }}/>
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ background:loading||!input.trim()?C.border:C.purple, border:'none', color:loading||!input.trim()?C.dim:'#fff', borderRadius:8, padding:'10px 18px', fontFamily:C.mono, fontSize:11, fontWeight:700, cursor:loading||!input.trim()?'not-allowed':'pointer' }}>{loading ? '…' : 'Send'}</button>
        </div>
      </Card>
    </div>
  );
}

const OU_BLANK = { name:'', roles:[], pilotId:'', email:'' };
function RoleCheckboxes({ selected, onChange }) {
  const toggle = r => { if (selected.includes(r)) onChange(selected.filter(x => x !== r)); else onChange([...selected, r]); };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
      {ORG_ROLES.map(r => {
        const on = selected.includes(r), rc = ROLE_COLORS[r] || C.dim;
        return (<div key={r} onClick={() => toggle(r)} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:6, cursor:'pointer', background: on ? `${rc}18` : C.card, border:`1px solid ${on ? rc+'60' : C.border}`, transition:'all 0.12s' }}>
          <div style={{ width:14, height:14, borderRadius:3, flexShrink:0, border:`1.5px solid ${on ? rc : C.border2}`, background: on ? rc : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{on && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
          <span style={{ fontSize:11, color: on ? rc : C.mid, fontFamily:C.mono, fontWeight: on ? 700 : 400 }}>{r}</span>
        </div>);
      })}
    </div>
  );
}

function OrgRoles({ orgUsers, setOrgUsers, activeUserId, setActiveUserId, auditLog, pilots }) {
  const [modal, setModal] = useState(false), [form, setForm] = useState(OU_BLANK), [editId, setEditId] = useState(null);
  const { confirm, confirmEl } = useConfirm();
  const set = k => e => setForm(f => ({ ...f, [k]:e.target.value }));
  const activeUser = orgUsers.find(u => u.id===activeUserId);
  const openNew = () => { setForm(OU_BLANK); setEditId(null); setModal(true); };
  const openEdit = u => { setForm({ ...u, roles: u.roles || [] }); setEditId(u.id); setModal(true); };
  const closeModal = () => { setModal(false); setEditId(null); setForm(OU_BLANK); };
  const save = () => { if (!form.name || !form.roles?.length) return; if (editId) setOrgUsers(us => us.map(u => u.id===editId ? { ...form, id:editId } : u)); else setOrgUsers(us => [...us, { ...form, id:uid() }]); closeModal(); };
  const del = async u => { if (u.id===activeUserId) return; if (await confirm({ message:'Remove this user?', label:u.name })) setOrgUsers(us => us.filter(x => x.id!==u.id)); };
  const activePerms = userPerms(activeUser);
  const activePrimary = primaryRole(activeUser);
  const activePrimaryColor = ROLE_COLORS[activePrimary] || C.amber;
  const permGroups = [...new Set(ALL_PERMS.map(p => p.group))];

  return (
    <div style={{ position:'relative' }}>
      {confirmEl}
      <Card style={{ padding:'20px 24px', marginBottom:16, background:`${activePrimaryColor}08`, border:`1px solid ${activePrimaryColor}40` }}>
        {activeUser ? (
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{ width:52, height:52, borderRadius:12, background:`${activePrimaryColor}18`, border:`2px solid ${activePrimaryColor}50`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:18, fontWeight:700, color:activePrimaryColor, flexShrink:0 }}>{activeUser.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:6 }}>{activeUser.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                {(activeUser.roles||[]).map(r => (<span key={r} style={{ fontFamily:C.mono, fontSize:10, color:ROLE_COLORS[r]||C.dim, background:`${ROLE_COLORS[r]||C.dim}18`, border:`1px solid ${ROLE_COLORS[r]||C.dim}44`, borderRadius:4, padding:'2px 8px', fontWeight:700, textTransform:'uppercase' }}>{r}</span>))}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {ALL_PERMS.map(p => { const granted = activePerms.includes(p.id); return (<span key={p.id} style={{ fontSize:9, fontFamily:C.mono, color: granted ? C.green : C.dim, background: granted ? `${C.green}12` : 'transparent', border:`1px solid ${granted ? C.green+'30' : C.border}`, borderRadius:3, padding:'2px 6px', textDecoration: granted ? 'none' : 'line-through' }}>{p.label}</span>); })}
              </div>
            </div>
          </div>
        ) : (<div style={{ fontSize:12, color:C.dim }}>No active user — select one below</div>)}
      </Card>
      <SectionHeader title="Org Roster" onAdd={openNew} addLabel="+ Add User"/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:12, marginBottom:24 }}>
        {orgUsers.map(u => {
          const isActive = u.id===activeUserId, pr = primaryRole(u), rc = ROLE_COLORS[pr] || C.amber;
          return (
            <Card key={u.id} style={{ padding:0, overflow:'hidden', border:`1px solid ${isActive?rc+'60':C.border}` }}>
              <div style={{ padding:'11px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, background:isActive?`${rc}10`:'transparent' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:`${rc}18`, border:`1.5px solid ${rc}40`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:12, fontWeight:700, color:rc, flexShrink:0 }}>{u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:12, color:C.text, fontWeight:500 }}>{u.name}{isActive && <span style={{ marginLeft:6, fontSize:9, background:rc+'20', color:rc, borderRadius:3, padding:'1px 5px', fontFamily:C.mono }}>ACTIVE</span>}</div><div style={{ fontSize:10, color:C.dim, marginTop:1 }}>{u.email}</div></div>
              </div>
              <div style={{ padding:'10px 14px' }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>{(u.roles||[]).map(r => (<span key={r} style={{ fontSize:10, fontFamily:C.mono, color:ROLE_COLORS[r]||C.dim, background:`${ROLE_COLORS[r]||C.dim}18`, border:`1px solid ${ROLE_COLORS[r]||C.dim}30`, borderRadius:3, padding:'2px 6px' }}>{r}</span>))}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {!isActive && <Btn variant='green' onClick={() => setActiveUserId(u.id)} xstyle={{ padding:'5px 10px', fontSize:10 }}>Sign In</Btn>}
                  <Btn variant='amber' onClick={() => openEdit(u)} xstyle={{ padding:'5px 10px', fontSize:10 }}>Edit</Btn>
                  {!isActive && <Btn variant='red' onClick={() => del(u)} xstyle={{ padding:'5px 10px', fontSize:10 }}>Remove</Btn>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <SectionHeader title="Audit Log"/>
      <Card style={{ padding:0 }}>
        {auditLog.length === 0 ? (<div style={{ padding:32, textAlign:'center', fontFamily:C.mono, fontSize:11, color:C.dim }}>No audit events recorded yet</div>) : (
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            {auditLog.map((e,i) => (
              <div key={e.id||i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 16px', borderBottom:`1px solid ${C.border}20` }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:C.amber, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}><div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, flexWrap:'wrap' }}><span style={{ fontSize:12, color:C.text }}>{e.action}</span><span style={{ fontSize:10, color:C.dim, fontFamily:C.mono, background:C.card2, padding:'1px 6px', borderRadius:3 }}>{e.userName}</span></div>{e.details && <div style={{ fontSize:11, color:C.dim }}>{e.details}</div>}</div>
                <div style={{ fontSize:10, color:C.dim, fontFamily:C.mono, flexShrink:0 }}>{new Date(e.ts).toLocaleDateString()}<br/>{new Date(e.ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {modal && (
        <Modal title={editId ? `Edit User — ${form.name}` : 'Add Org User'} onClose={closeModal} wide>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <Field label="Full Name"><input value={form.name} onChange={set('name')} style={{ width:'100%' }}/></Field>
            <Field label="Email"><input value={form.email} onChange={set('email')} style={{ width:'100%' }}/></Field>
            <Field label="Linked Pilot"><select value={form.pilotId||''} onChange={set('pilotId')} style={{ width:'100%' }}><option value="">None</option>{pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="Roles"><RoleCheckboxes selected={form.roles||[]} onChange={roles => setForm(f => ({ ...f, roles }))}/></Field>
          {(form.roles||[]).length > 0 && (
            <div style={{ marginTop:12, padding:'12px 14px', background:C.card2, border:`1px solid ${C.border}`, borderRadius:6 }}>
              <div style={{ fontSize:10, fontFamily:C.mono, color:C.dim, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Combined permissions from {(form.roles||[]).join(' + ')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {ALL_PERMS.filter(p => userPerms({ roles:form.roles }).includes(p.id)).map(p => <span key={p.id} style={{ fontSize:10, color:C.green, background:`${C.green}12`, border:`1px solid ${C.green}30`, borderRadius:3, padding:'1px 6px', fontFamily:C.mono }}>{p.label}</span>)}
              </div>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}><Btn onClick={closeModal}>Cancel</Btn><Btn variant='primary' onClick={save} disabled={!form.name || !(form.roles||[]).length}>{editId?'Save Changes':'Add User'}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

const TABS = ['Dashboard','Missions','Assets','Analytics','Incidents','AI Assistant','Org & Roles'];
const TAB_COL = { 'AI Assistant':C.purple, 'Analytics':C.orange, 'Incidents':C.orange, 'Assets':C.amber, 'Org & Roles':C.purple };

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [aircraft, setAircraft] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [missions, setMissions] = useState([]);
  const [flights, setFlights] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [ready, setReady] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const activeUser = orgUsers.find(u => u.id===activeUserId) || null;

  const addAudit = (action, details) => {
    setAuditLog(log => [{ id: uid(), ts: new Date().toISOString(), userId: activeUser?.id||'system', userName: activeUser?.name||'System', userRoles: activeUser?.roles || [], userRole: primaryRole(activeUser) || '—', action, details }, ...log].slice(0, 300));
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const handle = () => setUserMenuOpen(false);
    const t = setTimeout(() => window.addEventListener('click', handle, { once:true }), 0);
    return () => { clearTimeout(t); window.removeEventListener('click', handle); };
  }, [userMenuOpen]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    (async () => {
      setAircraft(migrate(await store.get('uas:ac'), migrateAircraft) || SEED_AC);
      setPilots(migrate(await store.get('uas:pilots'), migratePilot) || SEED_PILOTS);
      setMissions(migrate(await store.get('uas:missions'), migrateMission) || SEED_MISSIONS);
      setFlights(migrate(await store.get('uas:flights'), migrateFlight) || SEED_FLIGHTS);
      setBatteries(migrate(await store.get('uas:bat'), migrateBattery) || SEED_BATTERIES);
      setIncidents(migrate(await store.get('uas:incidents'), migrateIncident) || SEED_INCIDENTS);
      setEquipment(migrate(await store.get('uas:equipment'), migrateEquip) || SEED_EQUIPMENT);
      setOrgUsers(migrate(await store.get('uas:orgUsers'), migrateOrgUser) || SEED_ORG_USERS);
      const savedActiveId = await store.get('uas:activeUserId');
      setActiveUserId(savedActiveId?.id || SEED_ORG_USERS[0].id);
      setAuditLog((await store.get('uas:audit')) || []);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) store.set('uas:ac', aircraft); }, [aircraft, ready]);
  useEffect(() => { if (ready) store.set('uas:pilots', pilots); }, [pilots, ready]);
  useEffect(() => { if (ready) store.set('uas:missions', missions); }, [missions, ready]);
  useEffect(() => { if (ready) store.set('uas:flights', flights); }, [flights, ready]);
  useEffect(() => { if (ready) store.set('uas:bat', batteries); }, [batteries, ready]);
  useEffect(() => { if (ready) store.set('uas:incidents', incidents); }, [incidents, ready]);
  useEffect(() => { if (ready) store.set('uas:equipment', equipment); }, [equipment, ready]);
  useEffect(() => { if (ready) store.set('uas:orgUsers', orgUsers); }, [orgUsers, ready]);
  useEffect(() => { if (ready) store.set('uas:activeUserId', { id:activeUserId }); }, [activeUserId, ready]);
  useEffect(() => { if (ready) store.set('uas:audit', auditLog); }, [auditLog, ready]);

  if (!ready) return (<div style={{ background:C.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, color:C.dim, fontSize:11, letterSpacing:'0.1em' }}>INITIALIZING EWEB UAS OPS…</div>);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });

  return (
    <div style={{ position:'relative', background:C.bg, minHeight:'100vh', fontFamily:C.sans, color:C.text }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0B0E14; }
        ::-webkit-scrollbar-thumb { background:#263147; border-radius:2px; }
        input, select, textarea { background:#0D1220 !important; border:1px solid #1C2438 !important; color:#E2E8F0 !important; border-radius:6px; padding:8px 12px; font-family:inherit; font-size:13px; outline:none; transition:border-color 0.15s; }
        input:focus, select:focus, textarea:focus { border-color:#F59E0B !important; }
        select option { background:#0D1220; }
        button { cursor:pointer; font-family:inherit; transition:opacity 0.15s; }
        button:hover { opacity:0.85; }
        @keyframes pulse { 0%,100% { opacity:0.3 } 50% { opacity:1 } }
        .leaflet-container { background: #0F1520 !important; font-family: inherit !important; }
        .leaflet-control-zoom a { background: #141B28 !important; color: #94A3B8 !important; border-color: #1C2438 !important; }
        .leaflet-control-zoom a:hover { background: #1C2438 !important; color: #E2E8F0 !important; }
        .leaflet-popup-content-wrapper { background: #141B28 !important; color: #E2E8F0 !important; border: 1px solid #263147 !important; border-radius: 8px !important; box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-tip { background: #141B28 !important; border: 1px solid #263147 !important; }
        .leaflet-tooltip { background: #141B28 !important; color: #94A3B8 !important; border: 1px solid #263147 !important; font-family: 'Space Mono', monospace !important; font-size: 10px !important; }
      `}</style>
      <header style={{ borderBottom:`1px solid ${C.border}`, padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.bg, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="3.5" fill={C.amber}/>
            <line x1="13" y1="9.5" x2="13" y2="4" stroke={C.amber} strokeWidth="2" strokeLinecap="round"/>
            <line x1="13" y1="16.5" x2="13" y2="22" stroke={C.amber} strokeWidth="2" strokeLinecap="round"/>
            <line x1="9.5" y1="13" x2="4" y2="13" stroke={C.amber} strokeWidth="2" strokeLinecap="round"/>
            <line x1="16.5" y1="13" x2="22" y2="13" stroke={C.amber} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="13" cy="4" r="2.2" fill={C.card} stroke={C.amber} strokeWidth="1.5"/>
            <circle cx="13" cy="22" r="2.2" fill={C.card} stroke={C.amber} strokeWidth="1.5"/>
            <circle cx="4" cy="13" r="2.2" fill={C.card} stroke={C.amber} strokeWidth="1.5"/>
            <circle cx="22" cy="13" r="2.2" fill={C.card} stroke={C.amber} strokeWidth="1.5"/>
          </svg>
          <span style={{ fontFamily:C.mono, fontWeight:700, fontSize:14, letterSpacing:'0.06em', color:C.amber }}>EWEB UAS OPS</span>
          <span style={{ fontSize:10, color:C.orange, fontFamily:C.mono, background:`${C.orange}15`, border:`1px solid ${C.orange}40`, padding:'2px 7px', borderRadius:3 }}>PHASE V</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ position:'relative' }}>
            <button onClick={() => setUserMenuOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:`1px solid ${activeUser ? (ROLE_COLORS[primaryRole(activeUser)]||C.amber) : C.border}40`, borderRadius:6, padding:'5px 10px', cursor:'pointer' }}>
              {activeUser ? (<>
                <div style={{ width:22, height:22, borderRadius:5, background:`${ROLE_COLORS[primaryRole(activeUser)]||C.amber}18`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:9, fontWeight:700, color:ROLE_COLORS[primaryRole(activeUser)]||C.amber, flexShrink:0 }}>{activeUser.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                <div style={{ textAlign:'left' }}><div style={{ fontSize:11, color:C.text, lineHeight:1, fontFamily:C.mono }}>{activeUser.name.split(' ')[0]}</div><div style={{ fontSize:9, color:ROLE_COLORS[primaryRole(activeUser)]||C.amber, marginTop:1, fontFamily:C.mono }}>{primaryRole(activeUser)}</div></div>
              </>) : (<span style={{ fontSize:11, color:C.dim, fontFamily:C.mono }}>Select user</span>)}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft:2, opacity:0.5, transform: userMenuOpen ? 'rotate(180deg)' : 'none' }}><path d="M1 1L5 5L9 1" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {userMenuOpen && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:C.card2, border:`1px solid ${C.border2}`, borderRadius:8, minWidth:230, zIndex:500, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden' }}>
                <div style={{ padding:'8px 12px 6px', fontSize:9, fontFamily:C.mono, color:C.dim, letterSpacing:'0.12em', textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>Switch User</div>
                {orgUsers.map(u => {
                  const isActive = u.id === activeUserId, pr = primaryRole(u), rc = ROLE_COLORS[pr] || C.amber;
                  return (
                    <button key={u.id} onClick={() => {
                      if (!isActive) { const prev = activeUser?.name || '?'; setActiveUserId(u.id); setUserMenuOpen(false); setAuditLog(log => [{ id: uid(), ts: new Date().toISOString(), userId: u.id, userName: u.name, userRoles: u.roles||[], userRole: pr, action: 'User switched', details: `Signed in as ${u.name} (was ${prev})` }, ...log].slice(0, 300)); }
                      else setUserMenuOpen(false);
                    }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: isActive ? `${rc}12` : 'transparent', border:'none', cursor:'pointer', textAlign:'left', borderBottom:`1px solid ${C.border}20` }}>
                      <div style={{ width:30, height:30, borderRadius:7, background:`${rc}18`, border:`1.5px solid ${isActive?rc:rc+'44'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.mono, fontSize:10, fontWeight:700, color:rc, flexShrink:0 }}>{u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:12, color: isActive ? C.text : C.mid, fontWeight: isActive ? 500 : 400, fontFamily:C.mono }}>{u.name}{isActive && <span style={{ marginLeft:6, fontSize:9, color:rc, background:`${rc}18`, borderRadius:3, padding:'1px 5px' }}>ACTIVE</span>}</div><div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:2 }}>{(u.roles||[]).map((r,i) => <span key={r} style={{ fontSize:9, color:ROLE_COLORS[r]||C.dim, fontFamily:C.mono }}>{i>0?'· ':''}{r}</span>)}</div></div>
                    </button>
                  );
                })}
                <div style={{ padding:'8px 12px', borderTop:`1px solid ${C.border}` }}>
                  <button onClick={() => { setUserMenuOpen(false); setTab('Org & Roles'); }} style={{ width:'100%', background:'transparent', border:`1px solid ${C.border2}`, color:C.dim, borderRadius:5, padding:'6px 10px', fontSize:10, fontFamily:C.mono, cursor:'pointer' }}>Manage Org & Roles</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:6, height:6, borderRadius:'50%', background:C.green, boxShadow:`0 0 5px ${C.green}` }}/><span style={{ fontSize:10, color:C.dim, fontFamily:C.mono }}>ONLINE</span></div>
          <span style={{ fontSize:10, color:C.dim, fontFamily:C.mono }}>{TODAY} · {timeStr}</span>
        </div>
      </header>
      <nav style={{ borderBottom:`1px solid ${C.border}`, padding:'0 20px', display:'flex', background:C.bg, position:'sticky', top:52, zIndex:90, overflowX:'auto' }}>
        {TABS.map(t => { const col = TAB_COL[t] || C.amber; return (<button key={t} onClick={() => setTab(t)} style={{ background:'none', border:'none', padding:'12px 13px', fontSize:10, fontFamily:C.mono, letterSpacing:'0.07em', whiteSpace:'nowrap', color:tab===t?col:C.dim, borderBottom:tab===t?`2px solid ${col}`:'2px solid transparent', marginBottom:-1, textTransform:'uppercase' }}>{t}</button>); })}
      </nav>
      <main style={{ padding:'24px', maxWidth:1200, margin:'0 auto' }}>
        {tab==='Dashboard' && <ErrorBoundary tab="Dashboard"><Dashboard flights={flights} missions={missions} aircraft={aircraft} pilots={pilots} batteries={batteries} incidents={incidents} setTab={setTab}/></ErrorBoundary>}
        {tab==='Missions' && <ErrorBoundary tab="Missions"><Missions missions={missions} setMissions={setMissions} aircraft={aircraft} setAircraft={setAircraft} pilots={pilots} setPilots={setPilots} orgUsers={orgUsers} flights={flights} setFlights={setFlights} activeUser={activeUser} addAudit={addAudit}/></ErrorBoundary>}
        {tab==='Assets' && <ErrorBoundary tab="Assets"><Assets aircraft={aircraft} setAircraft={setAircraft} batteries={batteries} setBatteries={setBatteries} equipment={equipment} setEquipment={setEquipment} pilots={pilots} setPilots={setPilots} flights={flights} activeUser={activeUser} addAudit={addAudit}/></ErrorBoundary>}
        {tab==='Analytics' && <ErrorBoundary tab="Analytics"><Analytics flights={flights} aircraft={aircraft} pilots={pilots} activeUser={activeUser}/></ErrorBoundary>}
        {tab==='Incidents' && <ErrorBoundary tab="Incidents"><Incidents incidents={incidents} setIncidents={setIncidents} aircraft={aircraft} pilots={pilots} activeUser={activeUser}/></ErrorBoundary>}
        {tab==='AI Assistant' && <ErrorBoundary tab="AI Assistant"><AIAssistant flights={flights} missions={missions} aircraft={aircraft} pilots={pilots} batteries={batteries} incidents={incidents} equipment={equipment}/></ErrorBoundary>}
        {tab==='Org & Roles' && <ErrorBoundary tab="Org & Roles"><OrgRoles orgUsers={orgUsers} setOrgUsers={setOrgUsers} activeUserId={activeUserId} setActiveUserId={setActiveUserId} auditLog={auditLog} pilots={pilots}/></ErrorBoundary>}
      </main>
    </div>
  );
}
