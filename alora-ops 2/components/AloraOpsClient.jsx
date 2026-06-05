'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKLY_DAY = 6   // Saturday
const MONTHLY_DATE = 30

const DEFAULT_DATA = {
  dailyEngines: [
    { id:'outreach', title:'Outreach Engine', color:'#3B9EE8', lightColor:'#EBF4FD', tasks:[
      { id:'o1', text:'Send 15 DMs to influencers for collab', tag:'×15' },
      { id:'o2', text:'Send 5 collab pitches to real estate agents', tag:'×5' },
      { id:'o3', text:'Follow up — past customers, emails, DMs' },
      { id:'o4', text:'Promote on Nextdoor — 20 min' }
    ]},
    { id:'conversion', title:'Conversion Engine', color:'#F2A840', lightColor:'#FFF8EE', tasks:[
      { id:'c1', text:'Call leads — customers, agents, PMs' },
      { id:'c2', text:'Answer Google reviews' },
      { id:'c3', text:'Send appreciation to returning customers' }
    ]},
    { id:'ops', title:'Ops Engine', color:'#5DBF9A', lightColor:'#EDFBF4', tasks:[
      { id:'p1', text:'Assign cleaners for upcoming bookings' },
      { id:'p2', text:'Check car supplies and inventory' },
      { id:'p3', text:'Check quality + ask new customers for Google review' }
    ]},
    { id:'content', title:'Content Engine', color:'#9B8FE0', lightColor:'#F2F0FD', tasks:[
      { id:'cn1', text:'Upload job site story or get photo from cleaner' },
      { id:'cn2', text:'Engage on social — 30 likes, 10 comments' }
    ]}
  ],
  weeklyTasks: [
    { id:'w1', engine:'📣 Marketing', title:'Content planning for the next week — ideas into Projects tab' },
    { id:'w2', engine:'📣 Marketing', title:'Marketing report — ad spend, top content, key metrics, growth' },
    { id:'w3', engine:'📣 Marketing', title:'Schedule 2 photos and 1 video to Google Business' },
    { id:'w4', engine:'📣 Marketing', title:'Promote ads on Instagram and Facebook' },
    { id:'w5', engine:'📣 Marketing', title:'Shoot content for the week' },
    { id:'w6', engine:'📣 Marketing', title:'Promote ads on Google' },
    { id:'w7', engine:'📣 Marketing', title:'Set promo codes for collabs' },
    { id:'w8', engine:'💰 Finance', title:'Payout cleaners and contractors' },
    { id:'w9', engine:'📦 Ops', title:'Check inventory and order — always stock for 20 cleanings' },
    { id:'w10', engine:'📊 Review', title:"Track results — what worked, what didn't, double down" },
    { id:'w11', engine:'📊 Review', title:"Follow up with people who haven't answered" }
  ],
  monthlyTasks: [
    { id:'m1', engine:'💰 Finance', title:'Full monthly finances review' },
    { id:'m2', engine:'⚖️ Legal', title:'Check legal docs are up to date — privacy policy, T&Cs, handbook, legal formation' },
    { id:'m3', engine:'⚙️ Systems', title:'Review SOPs — how can they be improved, faster, more efficient' },
    { id:'m4', engine:'🤖 AI', title:'Update AI answers in Quo' }
  ],
  completions: {},
  notes: {}
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function weekKey(d) {
  const mon = new Date(d)
  const day = mon.getDay()
  mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
  return `week-${dateKey(mon)}`
}
function monthKey(d) { return `month-${d.getFullYear()}-${d.getMonth()+1}` }
function isWeeklyDay(d) { return d.getDay() === WEEKLY_DAY }
function isMonthlyDay(d) {
  const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()
  return d.getDate() === Math.min(MONTHLY_DATE, lastDay)
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function AloraOpsClient() {
  const today = useRef(new Date()).current
  const [appData, setAppData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [activeTab, setActiveTab] = useState('daily')
  const [viewDate, setViewDate] = useState(new Date(today))
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [popup, setPopup] = useState(null) // { date }
  const saveTimer = useRef(null)

  // ── LOAD from Supabase on mount ──
  useEffect(() => {
    fetch('/api/load')
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          // Merge with defaults to pick up any new tasks added in updates
          const merged = {
            ...DEFAULT_DATA,
            ...data,
            dailyEngines: data.dailyEngines || DEFAULT_DATA.dailyEngines,
            weeklyTasks: data.weeklyTasks || DEFAULT_DATA.weeklyTasks,
            monthlyTasks: data.monthlyTasks || DEFAULT_DATA.monthlyTasks,
            completions: data.completions || {},
            notes: data.notes || {}
          }
          setAppData(merged)
        } else {
          setAppData(JSON.parse(JSON.stringify(DEFAULT_DATA)))
        }
      })
      .catch(() => setAppData(JSON.parse(JSON.stringify(DEFAULT_DATA))))
      .finally(() => setLoading(false))
  }, [])

  // ── AUTO-SAVE with debounce ──
  const triggerSave = useCallback((data) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      setSaveError(false)
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          console.error('Save failed:', json.error)
          setSaveError(true)
          setTimeout(() => setSaveError(false), 5000)
        } else {
          setSavedFlash(true)
          setTimeout(() => setSavedFlash(false), 2000)
        }
      } catch(e) {
        console.error('Save exception:', e)
        setSaveError(true)
        setTimeout(() => setSaveError(false), 5000)
      }
      finally { setSaving(false) }
    }, 1500)
  }, [])

  const updateData = useCallback((updater) => {
    setAppData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      triggerSave(next)
      return next
    })
  }, [triggerSave])

  // ── SCORE ──
  function getScore(data, forDate) {
    if (!data) return { done: 0, total: 0, pct: 0 }
    const key = dateKey(forDate)
    const comp = data.completions[key] || {}
    let total = 0, done = 0
    data.dailyEngines.forEach(e => e.tasks.forEach(t => {
      total++
      if (comp[t.id]) done++
    }))
    if (isWeeklyDay(forDate)) {
      const wk = weekKey(forDate)
      data.weeklyTasks.forEach(t => { total++; if (data.completions[wk+'-'+t.id]) done++ })
    }
    if (isMonthlyDay(forDate)) {
      const mk = monthKey(forDate)
      data.monthlyTasks.forEach(t => { total++; if (data.completions[mk+'-'+t.id]) done++ })
    }
    return { done, total, pct: total > 0 ? Math.round(done/total*100) : 0 }
  }

  function getStreak(data) {
    if (!data) return 0
    let streak = 0
    const d = new Date(today)
    while (streak < 365) {
      const k = dateKey(d)
      const comp = data.completions[k] || {}
      const allT = data.dailyEngines.flatMap(e => e.tasks)
      const dd = allT.filter(t => comp[t.id]).length
      if (dd === 0 && k !== dateKey(today)) break
      if (dd > 0) streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  function toggleDaily(dateStr, taskId) {
    updateData(prev => {
      const next = structuredClone(prev)
      if (!next.completions[dateStr]) next.completions[dateStr] = {}
      next.completions[dateStr][taskId] = !next.completions[dateStr][taskId]
      return next
    })
  }

  function togglePeriod(storeKey) {
    updateData(prev => {
      const next = structuredClone(prev)
      next.completions[storeKey] = !next.completions[storeKey]
      return next
    })
  }

  // ── RENDER LOADING ──
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'system-ui', color:'#9AAFCA', fontSize:14 }}>
      Loading Alora Ops...
    </div>
  )

  const score = getScore(appData, viewDate)
  const streak = getStreak(appData)
  const circ = 125.6
  const ringOffset = circ - (circ * score.pct / 100)
  const scoreMsg = score.pct === 100 ? 'Perfect day! 🏆' : score.pct >= 75 ? 'Almost there!' : score.pct >= 50 ? 'More than halfway!' : score.pct >= 25 ? 'Building the habit 💪' : "Keep pushing — let's go"

  // Build week days for strip
  const monday = new Date(viewDate)
  const dow = monday.getDay()
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        button{border:none;background:none;padding:0;margin:0;font-family:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;outline:none}
        :root{
          --bg:#F0F4F9;--surface:#fff;--surface2:#F7FAFD;
          --border:#E2EAF4;--border2:#D0DFF0;
          --blue:#3B9EE8;--blue-light:#EBF4FD;--blue-mid:#BDD9F5;--blue-dark:#1A6DB5;
          --gold:#F2A840;--gold-light:#FFF8EE;
          --green:#5DBF9A;--green-light:#EDFBF4;
          --purple:#9B8FE0;--purple-light:#F2F0FD;
          --red:#F07070;--red-light:#FEF0F0;
          --text:#1A2535;--text2:#4A6080;--text3:#9AAFCA;
          --display:'Bebas Neue',sans-serif;--body:'Outfit',sans-serif;--mono:'DM Mono',monospace;
        }
        body{background:var(--bg);font-family:var(--body);color:var(--text);min-height:100vh;font-size:14px}
        .app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--bg)}
        .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:16px 18px 0;position:sticky;top:0;z-index:100}
        .brand{font-family:var(--display);font-size:24px;letter-spacing:.08em;color:var(--text)}
        .brand span{color:var(--blue)}
        .date-badge{font-family:var(--mono);font-size:11px;color:var(--text3);background:var(--surface2);border:.5px solid var(--border2);border-radius:20px;padding:4px 11px}
        .sync-badge{font-family:var(--mono);font-size:10px;border-radius:20px;padding:3px 9px;white-space:nowrap}
        .sync-saving{color:#F2A840;background:#FFF8EE;border:.5px solid #F2C97E}
        .sync-saved{color:var(--green);background:var(--green-light);border:.5px solid var(--green)}
        .score-bar{display:flex;align-items:center;gap:12px;padding:10px 0 14px}
        .score-ring-wrap{position:relative;width:48px;height:48px;flex-shrink:0}
        .score-ring-wrap svg{transform:rotate(-90deg)}
        .score-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:11px;font-weight:500;color:var(--blue)}
        .score-info{flex:1}
        .score-label{font-size:13px;font-weight:600;color:var(--text)}
        .score-sub{font-family:var(--mono);font-size:11px;color:var(--text3);margin-top:1px}
        .score-streak{font-family:var(--mono);font-size:11px;color:var(--gold);background:var(--gold-light);border-radius:20px;padding:3px 10px;white-space:nowrap}
        .tabs{display:flex;overflow-x:auto;scrollbar-width:none}
        .tabs::-webkit-scrollbar{display:none}
        .tab{flex-shrink:0;padding:9px 14px;font-size:12px;font-weight:500;color:var(--text3);border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--body)}
        .tab.active{color:var(--blue);border-bottom-color:var(--blue)}
        .body{padding:16px 16px 80px}
        .day-strip{display:flex;gap:5px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px}
        .day-pill{flex-shrink:0;min-width:44px;text-align:center;padding:8px 4px 6px;border-radius:10px;font-size:10px;font-family:var(--mono);color:var(--text3);background:var(--surface);border:.5px solid var(--border);cursor:pointer;transition:all .15s;position:relative}
        .day-pill.active{background:var(--blue-light);border-color:var(--blue);color:var(--blue)}
        .day-pill.has-weekly::after{content:'W';position:absolute;top:3px;right:3px;font-size:7px;font-family:var(--mono);color:var(--green);font-weight:600}
        .day-pill.has-monthly::after{content:'M';position:absolute;top:3px;right:3px;font-size:7px;color:var(--purple);font-weight:600;font-family:var(--mono)}
        .dn{display:block;font-size:15px;font-weight:600;margin-top:2px;font-family:var(--body)}
        .engine{background:var(--surface);border:.5px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
        .engine-header{display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:.5px solid var(--border)}
        .engine-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .engine-title{font-family:var(--display);font-size:16px;letter-spacing:.05em}
        .engine-progress{margin-left:auto;display:flex;align-items:center;gap:7px}
        .engine-count{font-family:var(--mono);font-size:11px;color:var(--text3)}
        .mini-prog{width:50px;height:3px;background:var(--border);border-radius:2px;overflow:hidden}
        .mini-prog-fill{height:100%;border-radius:2px;transition:width .4s ease}
        .task-row{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:.5px solid var(--surface2);cursor:pointer;-webkit-tap-highlight-color:transparent;background:none;width:100%;text-align:left}
        .task-row:last-child{border-bottom:none}
        .task-row:active{background:var(--surface2)}
        .check-box{width:17px;height:17px;border-radius:5px;border:1.5px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s;background:var(--surface)}
        .check-box.done{background:var(--blue-light);border-color:var(--blue)}
        .check-box.done::after{content:'';width:4px;height:7px;border:1.5px solid var(--blue);border-top:none;border-left:none;transform:rotate(45deg) translate(-1px,-1px);display:block}
        .check-box.weekly-done{background:var(--green-light);border-color:var(--green)}
        .check-box.weekly-done::after{content:'';width:4px;height:7px;border:1.5px solid var(--green);border-top:none;border-left:none;transform:rotate(45deg) translate(-1px,-1px);display:block}
        .check-box.monthly-done{background:var(--purple-light);border-color:var(--purple)}
        .check-box.monthly-done::after{content:'';width:4px;height:7px;border:1.5px solid var(--purple);border-top:none;border-left:none;transform:rotate(45deg) translate(-1px,-1px);display:block}
        .task-label{flex:1;font-size:13px;color:var(--text)}
        .task-label.done{color:var(--text3);text-decoration:line-through}
        .task-tag{font-family:var(--mono);font-size:10px;color:var(--text3)}
        .period-divider{display:flex;align-items:center;gap:10px;margin:20px 0 12px}
        .period-divider-line{flex:1;height:.5px;background:var(--border)}
        .period-divider-label{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;white-space:nowrap}
        .period-divider-label.weekly{color:var(--green);background:var(--green-light);border:.5px solid var(--green)}
        .period-divider-label.monthly{color:var(--purple);background:var(--purple-light);border:.5px solid var(--purple)}
        .edit-section{margin-bottom:20px}
        .edit-section-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .edit-section-label{font-family:var(--display);font-size:14px;letter-spacing:.05em}
        .edit-row{display:flex;align-items:center;gap:8px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:8px 12px;margin-bottom:6px}
        .edit-input{flex:1;border:none;outline:none;font-family:var(--body);font-size:13px;color:var(--text);background:transparent}
        .del-btn{color:var(--border2);font-size:16px;cursor:pointer;padding:0 2px;line-height:1;transition:color .15s;background:none;border:none}
        .del-btn:hover{color:var(--red)}
        .add-task-btn{display:flex;align-items:center;gap:6px;width:100%;padding:9px 12px;background:var(--surface);border:.5px dashed var(--blue-mid);border-radius:9px;font-size:13px;color:var(--blue);cursor:pointer;font-family:var(--body)}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:14px}
        .cal-dl{text-align:center;font-family:var(--mono);font-size:10px;color:var(--text3);padding:3px 0}
        .cal-cell{aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:500;background:var(--surface);border:.5px solid var(--border);color:var(--text3);cursor:pointer;transition:all .15s}
        .cal-cell:hover{border-color:var(--blue-mid)}
        .cal-cell.full{background:var(--blue-light);border-color:var(--blue);color:var(--blue)}
        .cal-cell.partial{background:var(--gold-light);border-color:var(--gold);color:#B87A20}
        .cal-cell.missed{background:var(--red-light);border-color:var(--red);color:#B04040}
        .cal-cell.today-cell{border:2px solid var(--blue)}
        .cal-cell.faded{opacity:.25;cursor:default;pointer-events:none}
        .cal-dot{width:4px;height:4px;border-radius:50%;margin-top:1px}
        .streak-row{display:flex;gap:8px;margin-bottom:14px}
        .streak-card{flex:1;background:var(--surface);border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center}
        .streak-num{font-family:var(--display);font-size:30px;color:var(--blue);line-height:1}
        .streak-lbl{font-family:var(--mono);font-size:10px;color:var(--text3);margin-top:3px}
        .legend-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
        .legend-item{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text3)}
        .legend-sw{width:11px;height:11px;border-radius:3px}
        .heatmap-card{background:var(--surface);border:.5px solid var(--border);border-radius:12px;padding:14px 14px 16px;overflow:hidden}
        .heatmap-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .heatmap-title{font-family:var(--display);font-size:15px;letter-spacing:.05em;color:var(--text)}
        .heatmap-year-lbl{font-family:var(--mono);font-size:10px;color:var(--text3)}
        .hm-month-row{position:relative;height:14px;margin-bottom:4px}
        .hm-mlabel{font-family:var(--mono);font-size:9px;color:var(--text3);position:absolute;top:0}
        .heatmap-scroll{overflow-x:auto;padding-bottom:4px}
        .heatmap-scroll::-webkit-scrollbar{height:3px}
        .heatmap-scroll::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
        .heatmap-grid{display:flex;gap:2px}
        .hm-col{display:flex;flex-direction:column;gap:2px}
        .hm-cell{width:11px;height:11px;border-radius:2px;cursor:pointer;transition:opacity .15s}
        .hm-cell:hover{opacity:.7}
        .h0{background:#EFF4FA}.h1{background:#BDD9F5}.h2{background:#7DBCEE}.h3{background:#3B9EE8}.h4{background:#1A6DB5}
        .hm-legend{display:flex;align-items:center;gap:4px;margin-top:10px;justify-content:flex-end}
        .hm-ll{font-family:var(--mono);font-size:10px;color:var(--text3)}
        .hm-lc{width:11px;height:11px;border-radius:2px}
        .popup-overlay{display:none;position:fixed;inset:0;background:rgba(20,35,55,.45);z-index:300;align-items:flex-end;justify-content:center}
        .popup-overlay.open{display:flex}
        .popup{position:relative;background:var(--surface);border-radius:20px 20px 0 0;padding:20px 20px 36px;width:100%;max-width:480px;max-height:72vh;overflow-y:auto}
        .popup-handle{width:36px;height:4px;background:var(--border2);border-radius:2px;margin:0 auto 16px}
        .popup-date{font-family:var(--display);font-size:20px;letter-spacing:.06em;color:var(--text);margin-bottom:4px}
        .popup-score-line{font-family:var(--mono);font-size:12px;color:var(--text3);margin-bottom:16px}
        .popup-engine-label{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 6px}
        .popup-task-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:.5px solid var(--border)}
        .popup-task-row:last-child{border-bottom:none}
        .popup-check{width:14px;height:14px;border-radius:4px;border:1.5px solid var(--border2);flex-shrink:0}
        .popup-check.done{background:var(--blue-light);border-color:var(--blue)}
        .popup-task-text{font-size:13px;color:var(--text)}
        .popup-task-text.done{color:var(--text3);text-decoration:line-through}
        .popup-close{position:absolute;top:18px;right:20px;font-size:22px;color:var(--text3);cursor:pointer;line-height:1;background:none;border:none}
        .notes-label{font-family:var(--mono);font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:16px 0 6px}
        .notes-area{width:100%;border:.5px solid var(--border);border-radius:8px;padding:10px 12px;font-family:var(--body);font-size:13px;color:var(--text);resize:none;outline:none;background:var(--surface2);min-height:70px}
        .save-note-btn{margin-top:8px;padding:8px 18px;background:var(--blue);color:#fff;border:none;border-radius:8px;font-family:var(--body);font-size:13px;font-weight:500;cursor:pointer}
        .section-cap{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 8px 2px;font-weight:500}
      `}</style>

      <div className="app">
        {/* TOP BAR */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="brand">ALORA <span>OPS</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {saving && <span className="sync-badge sync-saving">syncing…</span>}
              {!saving && savedFlash && <span className="sync-badge sync-saved">✓ saved</span>}
              {!saving && saveError && <span className="sync-badge" style={{color:'#F07070',background:'#FEF0F0',border:'.5px solid #F07070'}}>✕ save failed</span>}
              <div className="date-badge">
                {DAYS[today.getDay()]} · {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][today.getMonth()]} {today.getDate()}
              </div>
            </div>
          </div>

          {/* SCORE RING — daily tab only */}
          {activeTab === 'daily' && (
            <div className="score-bar">
              <div className="score-ring-wrap">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle fill="none" stroke="#E2EAF4" strokeWidth="3.5" cx="24" cy="24" r="20"/>
                  <circle fill="none" stroke="#3B9EE8" strokeWidth="3.5" strokeLinecap="round"
                    cx="24" cy="24" r="20"
                    strokeDasharray="125.6"
                    strokeDashoffset={ringOffset}
                    style={{ transition:'stroke-dashoffset .6s ease' }}
                  />
                </svg>
                <div className="score-center">{score.pct}%</div>
              </div>
              <div className="score-info">
                <div className="score-label">{score.done} / {score.total} tasks done</div>
                <div className="score-sub">{scoreMsg}</div>
              </div>
              <div className="score-streak">🔥 {streak} day{streak !== 1 ? 's' : ''}</div>
            </div>
          )}

          <div className="tabs">
            {[['daily','✓ Daily'],['edit','✎ Edit'],['completion','◈ Completion']].map(([id, label]) => (
              <button key={id} className={`tab${activeTab===id?' active':''}`} onClick={() => setActiveTab(id)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="body">
          {/* ── DAILY TAB ── */}
          {activeTab === 'daily' && (
            <DailyTab
              appData={appData}
              today={today}
              viewDate={viewDate}
              setViewDate={setViewDate}
              toggleDaily={toggleDaily}
              togglePeriod={togglePeriod}
            />
          )}

          {/* ── EDIT TAB ── */}
          {activeTab === 'edit' && (
            <EditTab appData={appData} updateData={updateData} />
          )}

          {/* ── COMPLETION TAB ── */}
          {activeTab === 'completion' && (
            <CompletionTab
              appData={appData}
              today={today}
              calMonth={calMonth}
              calYear={calYear}
              setCalMonth={setCalMonth}
              setCalYear={setCalYear}
              onDayClick={(date) => setPopup({ date })}
            />
          )}
        </div>
      </div>

      {/* POPUP */}
      {popup && (
        <DayPopup
          date={popup.date}
          appData={appData}
          onClose={() => setPopup(null)}
          onSaveNote={(note) => {
            const k = dateKey(popup.date)
            updateData(prev => {
              const next = structuredClone(prev)
              next.notes[k] = note
              return next
            })
            setPopup(null)
          }}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────
// DAILY TAB
// ─────────────────────────────────────────
function DailyTab({ appData, today, viewDate, setViewDate, toggleDaily, togglePeriod }) {
  const monday = new Date(viewDate)
  const dow = monday.getDay()
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })

  const key = dateKey(viewDate)
  const comp = appData.completions[key] || {}
  const wk = weekKey(viewDate)
  const mk = monthKey(viewDate)
  const showWeekly = isWeeklyDay(viewDate)
  const showMonthly = isMonthlyDay(viewDate)

  // Group weekly by engine
  const wEngines = {}
  if (showWeekly) appData.weeklyTasks.forEach(t => { if (!wEngines[t.engine]) wEngines[t.engine] = []; wEngines[t.engine].push(t) })
  const mEngines = {}
  if (showMonthly) appData.monthlyTasks.forEach(t => { if (!mEngines[t.engine]) mEngines[t.engine] = []; mEngines[t.engine].push(t) })

  return (
    <>
      {/* Day strip */}
      <div className="day-strip">
        {weekDays.map(d => {
          const isActive = dateKey(d) === dateKey(viewDate)
          const weekly = isWeeklyDay(d)
          const monthly = isMonthlyDay(d)
          return (
            <div
              key={dateKey(d)}
              className={`day-pill${isActive?' active':''}${weekly?' has-weekly':''}${monthly?' has-monthly':''}`}
              onClick={() => setViewDate(new Date(d))}
            >
              {DAYS[d.getDay()]}<span className="dn">{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      {/* Daily engines */}
      {appData.dailyEngines.map(engine => {
        const done = engine.tasks.filter(t => comp[t.id]).length
        const total = engine.tasks.length
        const pct = total > 0 ? done/total*100 : 0
        return (
          <div className="engine" key={engine.id}>
            <div className="engine-header">
              <div className="engine-dot" style={{ background: engine.color }} />
              <div className="engine-title" style={{ color: engine.color }}>{engine.title}</div>
              <div className="engine-progress">
                <span className="engine-count">{done}/{total}</span>
                <div className="mini-prog"><div className="mini-prog-fill" style={{ background: engine.color, width: pct+'%' }} /></div>
              </div>
            </div>
            {engine.tasks.map(t => (
              <button key={t.id} className="task-row" onClick={() => toggleDaily(key, t.id)}>
                <div className={`check-box${comp[t.id]?' done':''}`} />
                <span className={`task-label${comp[t.id]?' done':''}`}>{t.text}</span>
                {t.tag && <span className="task-tag">{t.tag}</span>}
              </button>
            ))}
          </div>
        )
      })}

      {/* Weekly section */}
      {showWeekly && (
        <>
          <div className="period-divider">
            <div className="period-divider-line" />
            <div className="period-divider-label weekly">📋 Weekly Tasks</div>
            <div className="period-divider-line" />
          </div>
          {Object.entries(wEngines).map(([eng, tasks]) => {
            const done = tasks.filter(t => appData.completions[wk+'-'+t.id]).length
            const total = tasks.length
            const pct = total > 0 ? done/total*100 : 0
            return (
              <div className="engine" key={eng}>
                <div className="engine-header">
                  <div className="engine-dot" style={{ background:'#5DBF9A' }} />
                  <div className="engine-title" style={{ color:'#5DBF9A' }}>{eng}</div>
                  <div className="engine-progress">
                    <span className="engine-count" style={{ color:'#5DBF9A' }}>{done}/{total}</span>
                    <div className="mini-prog"><div className="mini-prog-fill" style={{ background:'#5DBF9A', width: pct+'%' }} /></div>
                  </div>
                </div>
                {tasks.map(t => (
                  <button key={t.id} className="task-row" onClick={() => togglePeriod(wk+'-'+t.id)}>
                    <div className={`check-box${appData.completions[wk+'-'+t.id]?' weekly-done':''}`} />
                    <span className={`task-label${appData.completions[wk+'-'+t.id]?' done':''}`}>{t.title}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </>
      )}

      {/* Monthly section */}
      {showMonthly && (
        <>
          <div className="period-divider">
            <div className="period-divider-line" />
            <div className="period-divider-label monthly">📅 Monthly Tasks</div>
            <div className="period-divider-line" />
          </div>
          {Object.entries(mEngines).map(([eng, tasks]) => {
            const done = tasks.filter(t => appData.completions[mk+'-'+t.id]).length
            const total = tasks.length
            const pct = total > 0 ? done/total*100 : 0
            return (
              <div className="engine" key={eng}>
                <div className="engine-header">
                  <div className="engine-dot" style={{ background:'#9B8FE0' }} />
                  <div className="engine-title" style={{ color:'#9B8FE0' }}>{eng}</div>
                  <div className="engine-progress">
                    <span className="engine-count" style={{ color:'#9B8FE0' }}>{done}/{total}</span>
                    <div className="mini-prog"><div className="mini-prog-fill" style={{ background:'#9B8FE0', width: pct+'%' }} /></div>
                  </div>
                </div>
                {tasks.map(t => (
                  <button key={t.id} className="task-row" onClick={() => togglePeriod(mk+'-'+t.id)}>
                    <div className={`check-box${appData.completions[mk+'-'+t.id]?' monthly-done':''}`} />
                    <span className={`task-label${appData.completions[mk+'-'+t.id]?' done':''}`}>{t.title}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

// ─────────────────────────────────────────
// EDIT TAB
// ─────────────────────────────────────────
function EditTab({ appData, updateData }) {
  return (
    <>
      {/* Daily engines */}
      <div className="section-cap" style={{ color:'var(--blue)' }}>— Daily Engines —</div>
      {appData.dailyEngines.map((engine, ei) => (
        <div className="edit-section" key={engine.id}>
          <div className="edit-section-head">
            <div className="engine-dot" style={{ background: engine.color, width:8, height:8, borderRadius:'50%' }} />
            <div className="edit-section-label" style={{ color: engine.color }}>{engine.title}</div>
          </div>
          {engine.tasks.map((t, ti) => (
            <div className="edit-row" key={t.id}>
              <span style={{ color:'var(--border2)', fontSize:16, userSelect:'none' }}>⠿</span>
              <input
                className="edit-input"
                defaultValue={t.text}
                onBlur={e => updateData(prev => {
                  const next = structuredClone(prev)
                  next.dailyEngines[ei].tasks[ti].text = e.target.value
                  return next
                })}
              />
              <button className="del-btn" onClick={() => updateData(prev => {
                const next = structuredClone(prev)
                next.dailyEngines[ei].tasks.splice(ti, 1)
                return next
              })}>✕</button>
            </div>
          ))}
          <button className="add-task-btn" onClick={() => updateData(prev => {
            const next = structuredClone(prev)
            next.dailyEngines[ei].tasks.push({ id:'t'+Date.now(), text:'New task' })
            return next
          })}>+ Add task</button>
        </div>
      ))}

      {/* Weekly tasks */}
      <div className="section-cap" style={{ color:'var(--green)' }}>— Weekly Tasks (every Saturday) —</div>
      {appData.weeklyTasks.map((t, ti) => (
        <div className="edit-row" key={t.id}>
          <span style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', fontFamily:'var(--mono)', minWidth:80 }}>{t.engine}</span>
          <input
            className="edit-input"
            defaultValue={t.title}
            onBlur={e => updateData(prev => {
              const next = structuredClone(prev)
              next.weeklyTasks[ti].title = e.target.value
              return next
            })}
          />
          <button className="del-btn" onClick={() => updateData(prev => {
            const next = structuredClone(prev)
            next.weeklyTasks.splice(ti, 1)
            return next
          })}>✕</button>
        </div>
      ))}
      <button className="add-task-btn" style={{ borderColor:'var(--green)', color:'var(--green)', marginBottom:20 }}
        onClick={() => updateData(prev => {
          const next = structuredClone(prev)
          next.weeklyTasks.push({ id:'w'+Date.now(), engine:'📋 New', title:'New weekly task' })
          return next
        })}>+ Add weekly task</button>

      {/* Monthly tasks */}
      <div className="section-cap" style={{ color:'var(--purple)' }}>— Monthly Tasks (every 30th) —</div>
      {appData.monthlyTasks.map((t, ti) => (
        <div className="edit-row" key={t.id}>
          <span style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', fontFamily:'var(--mono)', minWidth:80 }}>{t.engine}</span>
          <input
            className="edit-input"
            defaultValue={t.title}
            onBlur={e => updateData(prev => {
              const next = structuredClone(prev)
              next.monthlyTasks[ti].title = e.target.value
              return next
            })}
          />
          <button className="del-btn" onClick={() => updateData(prev => {
            const next = structuredClone(prev)
            next.monthlyTasks.splice(ti, 1)
            return next
          })}>✕</button>
        </div>
      ))}
      <button className="add-task-btn" style={{ borderColor:'var(--purple)', color:'var(--purple)' }}
        onClick={() => updateData(prev => {
          const next = structuredClone(prev)
          next.monthlyTasks.push({ id:'m'+Date.now(), engine:'📅 New', title:'New monthly task' })
          return next
        })}>+ Add monthly task</button>
    </>
  )
}

// ─────────────────────────────────────────
// COMPLETION TAB
// ─────────────────────────────────────────
function CompletionTab({ appData, today, calMonth, calYear, setCalMonth, setCalYear, onDayClick }) {
  function getDayStatus(d) {
    const key = dateKey(d)
    const comp = appData.completions[key] || {}
    const allT = appData.dailyEngines.flatMap(e => e.tasks)
    const done = allT.filter(t => comp[t.id]).length
    if (done === 0) return 'none'
    if (done === allT.length) return 'full'
    return 'partial'
  }

  // Calendar
  const first = new Date(calYear, calMonth, 1)
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
  const emptyCells = Array.from({ length: first.getDay() })

  // Streak
  let streak = 0
  const sd = new Date(today)
  while (streak < 365) {
    const s = getDayStatus(sd)
    if (s === 'none' && dateKey(sd) !== dateKey(today)) break
    if (s !== 'none') streak++
    sd.setDate(sd.getDate() - 1)
  }
  let activeDays = 0
  for (let i = 1; i <= today.getDate(); i++) {
    if (getDayStatus(new Date(today.getFullYear(), today.getMonth(), i)) !== 'none') activeDays++
  }
  const monthPct = Math.round(activeDays / today.getDate() * 100)
  const todayComp = appData.completions[dateKey(today)] || {}
  const todayDone = appData.dailyEngines.flatMap(e => e.tasks).filter(t => todayComp[t.id]).length

  // Heatmap
  const heatStart = new Date(2026, 0, 1)
  heatStart.setDate(heatStart.getDate() - heatStart.getDay())
  const allT = appData.dailyEngines.flatMap(e => e.tasks)
  const total = allT.length || 1
  const monthPositions = {}
  const heatCols = Array.from({ length: 53 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const cd = new Date(heatStart)
      cd.setDate(heatStart.getDate() + w*7 + d)
      if (cd.getFullYear() !== 2026) return { cd, level: -1 }
      if (cd > today) return { cd, level: 0, future: true }
      const k = dateKey(cd)
      const comp = appData.completions[k] || {}
      const done = allT.filter(t => comp[t.id]).length
      const pct = done / total
      const level = pct === 0 ? 0 : pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4
      if (cd.getDate() <= 7 && !monthPositions[cd.getMonth()]) monthPositions[cd.getMonth()] = w
      return { cd, level, title: `${cd.toDateString()}: ${done}/${total} tasks` }
    })
  )

  function changeMonth(dir) {
    let m = calMonth + dir, y = calYear
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setCalMonth(m); setCalYear(y)
  }

  return (
    <>
      {/* Calendar header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontFamily:'var(--display)', fontSize:20, letterSpacing:'.06em' }}>{MONTHS[calMonth]} {calYear}</div>
        <div style={{ display:'flex', gap:7 }}>
          {['‹','›'].map((ch, i) => (
            <button key={ch} onClick={() => changeMonth(i===0?-1:1)}
              style={{ width:30, height:30, borderRadius:7, border:'.5px solid var(--border)', background:'var(--surface)', color:'var(--blue)', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-dl">{d[0]}</div>)}
        {emptyCells.map((_, i) => <div key={'e'+i} className="cal-cell faded" />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(calYear, calMonth, i+1)
          const isFuture = d > today && dateKey(d) !== dateKey(today)
          if (isFuture) return <div key={i} className="cal-cell faded">{i+1}</div>
          const status = getDayStatus(d)
          const isToday = dateKey(d) === dateKey(today)
          const dotColor = status==='full' ? 'var(--blue)' : status==='partial' ? 'var(--gold)' : d < today ? 'var(--red)' : 'transparent'
          const cls = `cal-cell${status==='full'?' full':status==='partial'?' partial':d<today?' missed':''}${isToday?' today-cell':''}`
          return (
            <div key={i} className={cls} onClick={() => onDayClick(d)}>
              {i+1}
              <div className="cal-dot" style={{ background: dotColor }} />
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="streak-row">
        <div className="streak-card"><div className="streak-num">{streak}</div><div className="streak-lbl">day streak</div></div>
        <div className="streak-card"><div className="streak-num">{monthPct}%</div><div className="streak-lbl">this month</div></div>
        <div className="streak-card"><div className="streak-num">{todayDone}</div><div className="streak-lbl">tasks today</div></div>
      </div>

      <div className="legend-row">
        {[['var(--blue-light)','var(--blue)','All done'],['var(--gold-light)','var(--gold)','Partial'],['var(--red-light)','var(--red)','Missed'],['var(--surface)','var(--border)','No data']].map(([bg, border, label]) => (
          <div key={label} className="legend-item">
            <div className="legend-sw" style={{ background:bg, border:`.5px solid ${border}` }} />
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="heatmap-card">
        <div className="heatmap-top">
          <div className="heatmap-title">Task Activity — 2026</div>
          <div className="heatmap-year-lbl">365 days</div>
        </div>
        <div className="hm-month-row">
          {Object.entries(monthPositions).map(([m, w]) => (
            <div key={m} className="hm-mlabel" style={{ left: w*13+'px' }}>{MONTHS_SHORT[m]}</div>
          ))}
        </div>
        <div className="heatmap-scroll">
          <div className="heatmap-grid">
            {heatCols.map((col, w) => (
              <div key={w} className="hm-col">
                {col.map((cell, d) => {
                  if (cell.level === -1) return <div key={d} className="hm-cell h0" style={{ opacity:.15 }} />
                  const isToday = dateKey(cell.cd) === dateKey(today)
                  return (
                    <div key={d}
                      className={`hm-cell h${cell.level}`}
                      title={cell.title}
                      style={{ cursor: cell.future ? 'default' : 'pointer', outline: isToday ? '1.5px solid var(--blue-dark)' : 'none', outlineOffset: 1 }}
                      onClick={() => !cell.future && onDayClick(cell.cd)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="hm-legend">
          <span className="hm-ll">Less</span>
          {[0,1,2,3,4].map(i => <div key={i} className={`hm-lc h${i}`} />)}
          <span className="hm-ll">More</span>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────
// DAY POPUP
// ─────────────────────────────────────────
function DayPopup({ date, appData, onClose, onSaveNote }) {
  const [note, setNote] = useState(appData.notes[dateKey(date)] || '')
  const key = dateKey(date)
  const comp = appData.completions[key] || {}
  const allT = appData.dailyEngines.flatMap(e => e.tasks)
  const done = allT.filter(t => comp[t.id]).length

  const showWeekly = isWeeklyDay(date)
  const showMonthly = isMonthlyDay(date)
  const wk = weekKey(date)
  const mk = monthKey(date)

  return (
    <div className="popup-overlay open" onClick={e => { if (e.target.classList.contains('popup-overlay')) onClose() }}>
      <div className="popup">
        <div className="popup-handle" />
        <button className="popup-close" onClick={onClose}>×</button>
        <div className="popup-date">{date.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</div>
        <div className="popup-score-line">{done} / {allT.length} daily tasks completed</div>

        {appData.dailyEngines.map(engine => (
          <div key={engine.id}>
            <div className="popup-engine-label" style={{ color: engine.color }}>{engine.title}</div>
            {engine.tasks.map(t => (
              <div key={t.id} className="popup-task-row">
                <div className={`popup-check${comp[t.id]?' done':''}`} />
                <span className={`popup-task-text${comp[t.id]?' done':''}`}>{t.text}</span>
              </div>
            ))}
          </div>
        ))}

        {showWeekly && (
          <>
            <div className="popup-engine-label" style={{ color:'var(--green)' }}>📋 Weekly Tasks</div>
            {appData.weeklyTasks.map(t => (
              <div key={t.id} className="popup-task-row">
                <div className={`popup-check${appData.completions[wk+'-'+t.id]?' done':''}`} />
                <span className={`popup-task-text${appData.completions[wk+'-'+t.id]?' done':''}`}>{t.title}</span>
              </div>
            ))}
          </>
        )}

        {showMonthly && (
          <>
            <div className="popup-engine-label" style={{ color:'var(--purple)' }}>📅 Monthly Tasks</div>
            {appData.monthlyTasks.map(t => (
              <div key={t.id} className="popup-task-row">
                <div className={`popup-check${appData.completions[mk+'-'+t.id]?' done':''}`} />
                <span className={`popup-task-text${appData.completions[mk+'-'+t.id]?' done':''}`}>{t.title}</span>
              </div>
            ))}
          </>
        )}

        <div className="notes-label">Notes</div>
        <textarea className="notes-area" value={note} onChange={e => setNote(e.target.value)} placeholder="What happened today..." />
        <button className="save-note-btn" onClick={() => onSaveNote(note)}>Save note</button>
      </div>
    </div>
  )
}
