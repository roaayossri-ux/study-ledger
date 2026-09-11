/* ============================================================
   Study Ledger — vanilla JS, localStorage-backed PWA
============================================================ */

const SUBJECTS = [
  { key: "arabic", label: "Arabic", color: "#2F5D8A" },
  { key: "english_al", label: "English AL", color: "#3E7CB1" },
  { key: "english_ol", label: "English OL", color: "#7FB3D9" },
  { key: "science", label: "Science", color: "#1F4E79" },
  { key: "math", label: "Math", color: "#5B8FB9" },
  { key: "history", label: "History", color: "#3A7CA5" },
  { key: "philosophy", label: "Philosophy", color: "#6A8FC2" },
];
const ACTIVITIES = [
  { key: "rest", label: "Rest", color: "#AFC4D6" },
  { key: "sport", label: "Sport", color: "#4FA3C7" },
  { key: "quran", label: "Quran", color: "#2E6F8E" },
  { key: "german", label: "German", color: "#3D6E99" },
  { key: "computer", label: "Computer", color: "#7BA7C9" },
];
const ALL_META = {};
SUBJECTS.forEach((s) => (ALL_META[s.key] = { ...s, category: "study" }));
ACTIVITIES.forEach((a) => (ALL_META[a.key] = { ...a, category: "activity" }));
const TIER_COLORS = { Bronze: "#8C6A3F", Silver: "#7B8FA1", Gold: "#B98A2E" };
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ---------------- helpers ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => toKey(new Date());
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function minutesFromHM(hm) { const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
function durationMinutes(start, end) { const d = minutesFromHM(end) - minutesFromHM(start); return d > 0 ? d : 0; }
function fmtHM(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtTime12(hm) {
  const [h, m] = hm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}
function startOfWeek(d) {
  const date = new Date(d); const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff); date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function niceDateLabel(d) { return `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`; }
function weekRangeLabel(wkStart) {
  const wkEnd = addDays(wkStart, 6);
  return `${wkStart.getDate()} ${MONTH_LABELS[wkStart.getMonth()].slice(0,3)} – ${wkEnd.getDate()} ${MONTH_LABELS[wkEnd.getMonth()].slice(0,3)}`;
}
function getGreeting() { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; return "Good evening"; }
function qualityColor(v) { if (v == null) return "#8CA6BA"; if (v >= 85) return "#1B3A57"; if (v >= 65) return "#3E7CB1"; if (v >= 40) return "#5B8FB9"; return "#8FA9BE"; }
function qualityLabel(v) { if (v >= 85) return "Excellent"; if (v >= 65) return "Good"; if (v >= 40) return "Fair"; return "Weak"; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------------- storage (device local) ---------------- */
const LS = {
  sessions: "sl_sessions",
  target: "sl_weekly_target",
  rewards: "sl_rewards",
  alarmed: "sl_alarmed_ids",
};
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/unavailable */ }
}

/* ---------------- state ---------------- */
const S = {
  sessions: load(LS.sessions, []),
  weeklyTarget: load(LS.target, 600),
  rewards: load(LS.rewards, []),
  alarmed: load(LS.alarmed, []),
  tab: "today",
  selectedDate: todayKey(),
  weekRef: todayKey(),
  monthRef: todayKey(),
  showAdd: false,
  addDraft: null,
  closingId: null,
  closeDraft: null,
  alarmId: null,
  newReward: null,
};

function persistSessions() { save(LS.sessions, S.sessions); }
function persistTarget() { save(LS.target, S.weeklyTarget); }
function persistRewards() { save(LS.rewards, S.rewards); }
function persistAlarmed() { save(LS.alarmed, S.alarmed); }

/* ---------------- alarm tone ---------------- */
function playAlarmTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const beep = (delay) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 830;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.4);
    };
    beep(0); beep(0.5);
  } catch (e) { /* audio unavailable */ }
}

/* ---------------- alarm + reward checks ---------------- */
function checkAlarms() {
  if (S.alarmId) return; // one at a time
  const now = new Date();
  const due = S.sessions.find((s) => {
    if (s.category !== "study" || s.status !== "planned") return false;
    if (S.alarmed.includes(s.id)) return false;
    const startDt = new Date(`${s.date}T${s.start}:00`);
    return startDt <= now;
  });
  if (due) {
    S.alarmId = due.id;
    S.alarmed.push(due.id);
    persistAlarmed();
    playAlarmTone();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Time to study", { body: `${ALL_META[due.key].label} starts now` });
      }
    } catch (e) {}
    render();
  }
}
function checkRewards() {
  if (S.weeklyTarget <= 0) return;
  const wkStart = startOfWeek(new Date());
  const wkKey = toKey(wkStart);
  const keysInWeek = Array.from({ length: 7 }, (_, i) => toKey(addDays(wkStart, i)));
  const minutes = S.sessions
    .filter((s) => s.category === "study" && s.status === "completed" && keysInWeek.includes(s.date))
    .reduce((sum, s) => sum + durationMinutes(s.start, s.actualEnd), 0);
  if (minutes >= S.weeklyTarget && !S.rewards.some((r) => r.weekKey === wkKey)) {
    const ratio = minutes / S.weeklyTarget;
    const tier = ratio >= 1.5 ? "Gold" : ratio >= 1.2 ? "Silver" : "Bronze";
    const reward = { id: uid(), weekKey: wkKey, weekLabel: weekRangeLabel(wkStart), minutes, target: S.weeklyTarget, tier };
    S.rewards.push(reward);
    persistRewards();
    S.newReward = reward;
    render();
  }
}

/* ---------------- mutations ---------------- */
function addSession(data) {
  S.sessions.push(data);
  persistSessions();
  S.showAdd = false;
  render();
  checkAlarms();
}
function deleteSession(id) {
  S.sessions = S.sessions.filter((s) => s.id !== id);
  persistSessions();
  render();
}
function closeSession(id, actualEnd, quality) {
  S.sessions = S.sessions.map((s) => (s.id === id ? { ...s, status: "completed", actualEnd, quality } : s));
  persistSessions();
  S.closingId = null;
  render();
  checkRewards();
}

/* ============================================================
   Rendering
============================================================ */
const root = document.getElementById("app-root");

function render() {
  root.innerHTML = `
    <div class="phone-frame">
      ${renderHeader()}
      ${renderNotifBanner()}
      <div class="header-rule"></div>
      <div class="content">
        ${S.tab === "today" ? renderToday() : S.tab === "week" ? renderWeek() : S.tab === "month" ? renderMonth() : renderGoals()}
        <div style="height:80px"></div>
      </div>
      ${renderBottomNav()}
    </div>
    ${S.showAdd ? renderAddSheet() : ""}
    ${S.closingId ? renderCloseSheet() : ""}
    ${S.alarmId ? renderAlarmOverlay() : ""}
    ${S.newReward ? renderCelebrate() : ""}
  `;
  attachHandlers();
}

function renderHeader() {
  return `
    <div class="header">
      <div>
        <div class="logo-line"><span class="logo-mark"></span><span class="logo-text serif">${getGreeting()}, Roaa</span></div>
        <div class="logo-sub">Study Ledger · Plan · Track · Review</div>
      </div>
      <button class="add-btn" id="btn-open-add">+ Add</button>
    </div>`;
}
function renderNotifBanner() {
  const status = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  if (status !== "default") return "";
  return `
    <div class="notif-banner">
      <span>Turn on reminders so alarms reach you when sessions start.</span>
      <button class="notif-btn" id="btn-enable-notif">Enable</button>
    </div>`;
}
function renderBottomNav() {
  const tabs = [["today","Today"],["week","Week"],["month","Month"],["goals","Goals"]];
  return `<div class="bottom-nav">${tabs.map(([k,l]) => `
    <button class="nav-btn ${S.tab===k?"active":""}" data-tab="${k}"><span class="nav-dot"></span>${l}</button>
  `).join("")}</div>`;
}

/* ---- Today ---- */
function renderToday() {
  const dayKey = S.selectedDate;
  const list = S.sessions.filter((s) => s.date === dayKey).sort((a,b) => minutesFromHM(a.start)-minutesFromHM(b.start));
  const completedStudy = list.filter((s) => s.category==="study" && s.status==="completed");
  const totalStudyMin = completedStudy.reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
  const avgQuality = completedStudy.length ? Math.round(completedStudy.reduce((a,s)=>a+s.quality,0)/completedStudy.length) : null;
  const dateObj = new Date(dayKey+"T00:00:00");

  return `
    <div class="day-nav">
      <button class="nav-arrow" data-nav="day-prev">‹</button>
      <div class="day-title">
        <div class="serif">${niceDateLabel(dateObj)}</div>
        ${dayKey!==todayKey() ? `<button class="today-link" data-nav="day-today">back to today</button>` : ""}
      </div>
      <button class="nav-arrow" data-nav="day-next">›</button>
    </div>
    <div class="stat-strip">
      <div class="stat-block"><div class="stat-value">${fmtHM(totalStudyMin)}</div><div class="stat-label">Studied</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${list.length}</div><div class="stat-label">Sessions</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${avgQuality===null?"—":avgQuality+"%"}</div><div class="stat-label">Avg. quality</div></div>
    </div>
    <div class="list-wrap">
      ${list.length===0 ? `<div class="empty-state">Nothing on the plan yet. Add a study block or an activity to start the day.</div>` : list.map(renderRow).join("")}
    </div>`;
}
function renderRow(s) {
  const meta = ALL_META[s.key];
  const finished = s.status === "completed";
  const shownEnd = finished ? s.actualEnd : s.end;
  const dur = durationMinutes(s.start, shownEnd);
  return `
    <div class="row">
      <div class="row-bar" style="background:${meta.color}"></div>
      <div class="row-main">
        <div class="row-top">
          <span class="serif">${esc(meta.label)}</span>
          <span class="row-time">${fmtTime12(s.start)} – ${fmtTime12(shownEnd)}</span>
        </div>
        <div class="row-sub">
          <span class="row-status">${finished?`Completed · ${fmtHM(dur)}`:`Planned · ${fmtHM(dur)}`}${finished && s.quality!==null?` · <span style="color:${qualityColor(s.quality)}">${s.quality}%</span>`:""}</span>
          <div class="row-actions">
            ${!finished ? `<button class="close-btn" data-close="${s.id}">Close</button>` : ""}
            <button class="delete-btn" data-delete="${s.id}">×</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---- Week ---- */
function renderWeek() {
  const weekStart = startOfWeek(new Date(S.weekRef+"T00:00:00"));
  const keysInWeek = Array.from({length:7},(_,i)=>toKey(addDays(weekStart,i)));
  const weekSessions = S.sessions.filter((s)=>keysInWeek.includes(s.date));
  const completedStudy = weekSessions.filter((s)=>s.category==="study"&&s.status==="completed");
  const totalStudyMin = completedStudy.reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
  const activityMin = weekSessions.filter((s)=>s.category==="activity"&&s.status==="completed").reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
  const avgQuality = completedStudy.length ? Math.round(completedStudy.reduce((a,s)=>a+s.quality,0)/completedStudy.length) : null;

  const chartData = keysInWeek.map((k,i)=>{
    const dayMin = completedStudy.filter((s)=>s.date===k).reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
    return { day: WEEKDAY_LABELS[i], hours: +(dayMin/60).toFixed(2), isToday: k===todayKey() };
  });
  const maxHours = Math.max(1, ...chartData.map((d)=>d.hours));

  const bySubject = SUBJECTS.map((s)=>{
    const items = completedStudy.filter((x)=>x.key===s.key);
    const min = items.reduce((sum,x)=>sum+durationMinutes(x.start,x.actualEnd),0);
    const q = items.length ? Math.round(items.reduce((a,x)=>a+x.quality,0)/items.length) : null;
    return {...s, min, count: items.length, q};
  }).filter((s)=>s.count>0).sort((a,b)=>b.min-a.min);

  return `
    <div class="day-nav">
      <button class="nav-arrow" data-nav="week-prev">‹</button>
      <div class="serif" style="font-size:15px;text-align:center">${weekRangeLabel(weekStart)}</div>
      <button class="nav-arrow" data-nav="week-next">›</button>
    </div>
    <div class="stat-strip">
      <div class="stat-block"><div class="stat-value">${fmtHM(totalStudyMin)}</div><div class="stat-label">Study time</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${fmtHM(activityMin)}</div><div class="stat-label">Rest &amp; activity</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${avgQuality===null?"—":avgQuality+"%"}</div><div class="stat-label">Avg. quality</div></div>
    </div>
    <div class="section-label">Hours studied per day</div>
    <div class="card">
      <div class="bar-chart-wrap">
        ${chartData.map((d)=>`
          <div class="bar-col">
            <div class="bar-value">${d.hours>0?d.hours:""}</div>
            <div class="bar-fill" style="height:${Math.max(2,(d.hours/maxHours)*110)}px;background:${d.isToday?"#2F6F9E":"#A9CBE8"}"></div>
            <div class="bar-label">${d.day}</div>
          </div>`).join("")}
      </div>
    </div>
    <div class="section-label">By subject</div>
    <div class="card">
      ${bySubject.length===0 ? `<div class="empty-state">No completed study sessions this week yet.</div>` : bySubject.map((s)=>`
        <div class="subject-row">
          <span class="swatch" style="background:${s.color}"></span>
          <span style="flex:1;font-size:13.5px;margin-left:8px">${esc(s.label)}</span>
          <span style="font-size:12px;color:#5E7A90;margin-right:10px">${s.count} session${s.count>1?"s":""}</span>
          <span style="font-size:12px;color:#5E7A90;margin-right:10px;width:52px;text-align:right">${fmtHM(s.min)}</span>
          <span style="font-size:12px;color:${qualityColor(s.q)};width:34px;text-align:right">${s.q}%</span>
        </div>`).join("")}
    </div>`;
}

/* ---- Month ---- */
function renderMonth() {
  const ref = new Date(S.monthRef+"T00:00:00");
  const year = ref.getFullYear(), month = ref.getMonth();
  const monthSessions = S.sessions.filter((s)=>{ const d=new Date(s.date+"T00:00:00"); return d.getFullYear()===year && d.getMonth()===month; });
  const completedStudy = monthSessions.filter((s)=>s.category==="study"&&s.status==="completed");
  const totalStudyMin = completedStudy.reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
  const avgQuality = completedStudy.length ? Math.round(completedStudy.reduce((a,s)=>a+s.quality,0)/completedStudy.length) : null;
  const bySubject = SUBJECTS.map((s)=>{
    const items = completedStudy.filter((x)=>x.key===s.key);
    const min = items.reduce((sum,x)=>sum+durationMinutes(x.start,x.actualEnd),0);
    return {...s, min};
  }).filter((s)=>s.min>0).sort((a,b)=>b.min-a.min);
  const topSubject = bySubject[0];

  const firstOfMonth = new Date(year, month, 1);
  const startGrid = startOfWeek(firstOfMonth);
  const daysInGrid = [];
  let cursor = startGrid;
  while (cursor.getMonth()===month || cursor<firstOfMonth || daysInGrid.length%7!==0 || cursor.getDate()<=7) {
    daysInGrid.push(new Date(cursor));
    cursor = addDays(cursor,1);
    if (daysInGrid.length>41) break;
    if (cursor.getMonth()!==month && daysInGrid.length%7===0) break;
  }
  const dayTotals = {};
  completedStudy.forEach((s)=>{ dayTotals[s.date]=(dayTotals[s.date]||0)+durationMinutes(s.start,s.actualEnd); });
  const maxDay = Math.max(1, ...Object.values(dayTotals));

  return `
    <div class="day-nav">
      <button class="nav-arrow" data-nav="month-prev">‹</button>
      <div class="serif" style="font-size:17px">${MONTH_LABELS[month]} ${year}</div>
      <button class="nav-arrow" data-nav="month-next">›</button>
    </div>
    <div class="stat-strip">
      <div class="stat-block"><div class="stat-value">${fmtHM(totalStudyMin)}</div><div class="stat-label">Study time</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${avgQuality===null?"—":avgQuality+"%"}</div><div class="stat-label">Avg. quality</div></div>
      <div class="v-divider"></div>
      <div class="stat-block"><div class="stat-value">${topSubject?topSubject.label.split(" ")[0]:"—"}</div><div class="stat-label">Top subject</div></div>
    </div>
    <div class="section-label">Study intensity</div>
    <div class="card">
      <div class="calendar-grid" style="margin-bottom:6px">
        ${WEEKDAY_LABELS.map((d)=>`<div class="calendar-dow">${d[0]}</div>`).join("")}
      </div>
      <div class="calendar-grid">
        ${daysInGrid.map((d)=>{
          const inMonth = d.getMonth()===month;
          const k = toKey(d);
          const min = dayTotals[k]||0;
          const intensity = min/maxDay;
          const bg = !inMonth ? "transparent" : min===0 ? "#DCEBF5" : `rgba(47,111,158,${0.18+intensity*0.72})`;
          const fg = inMonth ? (intensity>0.5 ? "#F4F8FB" : "#3B6A87") : "#B9D3E5";
          return `<div class="calendar-cell" style="background:${bg};color:${fg}" title="${k}: ${fmtHM(min)}">${inMonth?d.getDate():""}</div>`;
        }).join("")}
      </div>
    </div>
    <div class="section-label">By subject</div>
    <div class="card">
      ${bySubject.length===0 ? `<div class="empty-state">No completed study sessions this month yet.</div>` : bySubject.map((s)=>{
        const pct = Math.round((s.min/totalStudyMin)*100);
        return `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">
              <span style="display:flex;align-items:center;gap:6px"><span class="swatch" style="background:${s.color}"></span>${esc(s.label)}</span>
              <span style="color:#5E7A90">${fmtHM(s.min)}</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${s.color}"></div></div>
          </div>`;
      }).join("")}
    </div>`;
}

/* ---- Goals ---- */
function renderGoals() {
  const wkStart = startOfWeek(new Date());
  const keysInWeek = Array.from({length:7},(_,i)=>toKey(addDays(wkStart,i)));
  const minutes = S.sessions.filter((s)=>s.category==="study"&&s.status==="completed"&&keysInWeek.includes(s.date)).reduce((sum,s)=>sum+durationMinutes(s.start,s.actualEnd),0);
  const pct = S.weeklyTarget>0 ? Math.min(100, Math.round((minutes/S.weeklyTarget)*100)) : 0;
  const achieved = S.weeklyTarget>0 && minutes>=S.weeklyTarget;
  const rewardsSorted = [...S.rewards].sort((a,b)=> a.weekKey<b.weekKey?1:-1);

  return `
    <div class="section-label">Weekly target</div>
    <div class="card">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
        <input type="number" min="0" step="30" id="target-input" value="${S.weeklyTarget}" style="flex:1">
        <span style="font-size:12px;color:#5E7A90;white-space:nowrap">min / week</span>
        <button class="close-btn" id="btn-save-target" style="padding:8px 12px">Save</button>
      </div>
      <div class="hint" style="margin:0 0 10px">Current target: ${fmtHM(S.weeklyTarget)} · This week: ${fmtHM(minutes)} (${pct}%)</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${achieved?"#2F6F9E":"#7FB3D9"}"></div></div>
      ${achieved
        ? `<div style="font-size:12px;color:#1F4E79;margin-top:10px">Target reached for ${weekRangeLabel(wkStart)}. New badge collected below.</div>`
        : S.weeklyTarget>0 ? `<div style="font-size:12px;color:#5E7A90;margin-top:10px">${fmtHM(Math.max(0,S.weeklyTarget-minutes))} to go this week.</div>` : ""}
    </div>
    <div class="section-label">Achievements</div>
    <div class="card">
      ${rewardsSorted.length===0
        ? `<div class="empty-state">No badges yet — set a weekly target and complete study sessions to earn your first one.</div>`
        : rewardsSorted.map((r)=>`
          <div class="reward-row">
            <div class="badge-circle" style="background:${TIER_COLORS[r.tier]}">${r.tier[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px">${r.tier} badge · ${r.weekLabel}</div>
              <div style="font-size:11px;color:#5E7A90">${fmtHM(r.minutes)} of ${fmtHM(r.target)} target</div>
            </div>
          </div>`).join("")}
    </div>`;
}

/* ---- Add sheet ---- */
function renderAddSheet() {
  const d = S.addDraft;
  const key = d.category === "study" ? d.subject : d.activity;
  return `
  <div class="backdrop" id="backdrop-add">
    <div class="sheet" id="sheet-add">
      <div class="sheet-handle"></div>
      <div class="sheet-title serif">New block</div>
      <div class="segment-row">
        <button class="segment-btn ${d.category==="study"?"active":""}" data-cat="study">Study</button>
        <button class="segment-btn ${d.category==="activity"?"active":""}" data-cat="activity">Rest &amp; activity</button>
      </div>
      <label class="field-label">${d.category==="study"?"Subject":"Activity"}</label>
      <select id="field-key">
        ${(d.category==="study"?SUBJECTS:ACTIVITIES).map((o)=>`<option value="${o.key}" ${o.key===key?"selected":""}>${o.label}</option>`).join("")}
      </select>
      <label class="field-label">Date</label>
      <input type="date" id="field-date" value="${d.date}">
      <div class="field-row">
        <div class="field-col"><label class="field-label">From</label><input type="time" id="field-start" value="${d.start}"></div>
        <div class="field-col"><label class="field-label">To</label><input type="time" id="field-end" value="${d.end}"></div>
      </div>
      ${d.category==="study" ? `<div class="hint">You'll get an alarm and reminder when this session starts.</div>` : ""}
      <div class="hint" id="planned-length">Planned length: ${fmtHM(durationMinutes(d.start,d.end))}</div>
      <div id="add-error" class="error-text"></div>
      <div class="btn-row">
        <button class="secondary-btn" id="btn-cancel-add">Cancel</button>
        <button class="primary-btn" id="btn-save-add" style="background:${ALL_META[key].color}">Add to plan</button>
      </div>
    </div>
  </div>`;
}

/* ---- Close sheet ---- */
function renderCloseSheet() {
  const session = S.sessions.find((s)=>s.id===S.closingId);
  if (!session) return "";
  const meta = ALL_META[session.key];
  const d = S.closeDraft;
  const dur = durationMinutes(session.start, d.actualEnd);
  return `
  <div class="backdrop" id="backdrop-close">
    <div class="sheet" id="sheet-close">
      <div class="sheet-handle"></div>
      <div class="sheet-title serif">Close session</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span class="swatch" style="background:${meta.color};width:12px;height:12px"></span>
        <span class="serif" style="font-size:17px">${esc(meta.label)}</span>
      </div>
      <label class="field-label">Actual finish time</label>
      <input type="time" id="field-actual-end" value="${d.actualEnd}">
      <div class="hint">Time studied: ${fmtHM(dur)}</div>
      ${session.category==="study" ? `
        <label class="field-label" style="margin-top:18px">Study quality</label>
        <div class="serif" id="quality-display" style="font-size:30px;color:${qualityColor(d.quality)};text-align:center;margin:4px 0 2px">${d.quality}%</div>
        <div style="text-align:center;font-size:11.5px;color:#5E7A90;margin-bottom:10px" id="quality-label">${qualityLabel(d.quality)}</div>
        <input type="range" min="0" max="100" step="5" value="${d.quality}" id="field-quality" style="width:100%;accent-color:${qualityColor(d.quality)}">
      ` : ""}
      <div class="btn-row">
        <button class="secondary-btn" id="btn-cancel-close">Cancel</button>
        <button class="primary-btn" id="btn-confirm-close" style="background:${meta.color}">Confirm &amp; close</button>
      </div>
    </div>
  </div>`;
}

/* ---- Alarm overlay ---- */
function renderAlarmOverlay() {
  const session = S.sessions.find((s)=>s.id===S.alarmId);
  if (!session) { S.alarmId = null; return ""; }
  const meta = ALL_META[session.key];
  return `
  <div class="backdrop center">
    <div class="alarm-card">
      <div class="alarm-pulse"></div>
      <div style="font-size:11px;color:#5E7A90;letter-spacing:0.4px;margin-bottom:6px">TIME TO STUDY</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px">
        <span class="swatch" style="background:${meta.color};width:12px;height:12px"></span>
        <span class="serif" style="font-size:22px">${esc(meta.label)}</span>
      </div>
      <div style="font-size:12.5px;color:#5E7A90;margin-bottom:20px">Planned from ${fmtTime12(session.start)} to ${fmtTime12(session.end)}</div>
      <div class="btn-row" style="margin-top:0">
        <button class="secondary-btn" id="btn-snooze">Snooze 5m</button>
        <button class="primary-btn" id="btn-dismiss-alarm" style="background:${meta.color}">Start now</button>
      </div>
    </div>
  </div>`;
}

/* ---- Celebrate overlay ---- */
function renderCelebrate() {
  const r = S.newReward;
  return `
  <div class="backdrop center">
    <div class="alarm-card">
      <div class="badge-circle lg" style="background:${TIER_COLORS[r.tier]}">${r.tier[0]}</div>
      <div class="serif" style="font-size:20px;margin-bottom:4px">Weekly target reached</div>
      <div style="font-size:12.5px;color:#5E7A90;margin-bottom:18px">${r.tier} badge · ${fmtHM(r.minutes)} of ${fmtHM(r.target)} · ${r.weekLabel}</div>
      <button class="primary-btn" id="btn-collect-reward" style="background:#2F6F9E;width:100%">Collect reward</button>
    </div>
  </div>`;
}

/* ============================================================
   Event handling
============================================================ */
function attachHandlers() {
  // header
  const btnAdd = document.getElementById("btn-open-add");
  if (btnAdd) btnAdd.onclick = () => {
    S.addDraft = { category:"study", subject:SUBJECTS[0].key, activity:ACTIVITIES[0].key, date: S.tab==="today"?S.selectedDate:todayKey(), start:"16:00", end:"17:00" };
    S.showAdd = true; render();
  };
  const btnNotif = document.getElementById("btn-enable-notif");
  if (btnNotif) btnNotif.onclick = () => { if (typeof Notification!=="undefined") Notification.requestPermission().then(()=>render()); };

  // bottom nav
  root.querySelectorAll("[data-tab]").forEach((el)=> el.onclick = () => { S.tab = el.dataset.tab; render(); });

  // day/week/month nav
  root.querySelectorAll("[data-nav]").forEach((el)=> el.onclick = () => {
    const n = el.dataset.nav;
    if (n==="day-prev") S.selectedDate = toKey(addDays(new Date(S.selectedDate+"T00:00:00"),-1));
    if (n==="day-next") S.selectedDate = toKey(addDays(new Date(S.selectedDate+"T00:00:00"),1));
    if (n==="day-today") S.selectedDate = todayKey();
    if (n==="week-prev") S.weekRef = toKey(addDays(startOfWeek(new Date(S.weekRef+"T00:00:00")),-7));
    if (n==="week-next") S.weekRef = toKey(addDays(startOfWeek(new Date(S.weekRef+"T00:00:00")),7));
    if (n==="month-prev") { const r=new Date(S.monthRef+"T00:00:00"); S.monthRef = toKey(new Date(r.getFullYear(), r.getMonth()-1, 1)); }
    if (n==="month-next") { const r=new Date(S.monthRef+"T00:00:00"); S.monthRef = toKey(new Date(r.getFullYear(), r.getMonth()+1, 1)); }
    render();
  });

  // session rows
  root.querySelectorAll("[data-close]").forEach((el)=> el.onclick = () => {
    const session = S.sessions.find((s)=>s.id===el.dataset.close);
    S.closingId = session.id;
    S.closeDraft = { actualEnd: session.end, quality: 70 };
    render();
  });
  root.querySelectorAll("[data-delete]").forEach((el)=> el.onclick = () => deleteSession(el.dataset.delete));

  // add sheet
  const backdropAdd = document.getElementById("backdrop-add");
  if (backdropAdd) {
    backdropAdd.onclick = (e) => { if (e.target.id==="backdrop-add") { S.showAdd=false; render(); } };
    document.getElementById("btn-cancel-add").onclick = () => { S.showAdd=false; render(); };
    root.querySelectorAll("[data-cat]").forEach((el)=> el.onclick = () => { S.addDraft.category = el.dataset.cat; render(); });
    const fKey = document.getElementById("field-key");
    fKey.onchange = () => { if (S.addDraft.category==="study") S.addDraft.subject = fKey.value; else S.addDraft.activity = fKey.value; render(); };
    const fDate = document.getElementById("field-date"); fDate.onchange = () => { S.addDraft.date = fDate.value; };
    const fStart = document.getElementById("field-start"), fEnd = document.getElementById("field-end");
    const updateLength = () => {
      S.addDraft.start = fStart.value; S.addDraft.end = fEnd.value;
      document.getElementById("planned-length").textContent = "Planned length: " + fmtHM(durationMinutes(fStart.value, fEnd.value));
    };
    fStart.onchange = updateLength; fEnd.onchange = updateLength;
    document.getElementById("btn-save-add").onclick = () => {
      const start = fStart.value, end = fEnd.value;
      if (durationMinutes(start,end) <= 0) { document.getElementById("add-error").textContent = "End time must be after start time."; return; }
      const key = S.addDraft.category==="study" ? S.addDraft.subject : S.addDraft.activity;
      addSession({ id: uid(), date: fDate.value, category: S.addDraft.category, key, start, end, actualEnd: null, status:"planned", quality: null });
    };
  }

  // close sheet
  const backdropClose = document.getElementById("backdrop-close");
  if (backdropClose) {
    backdropClose.onclick = (e) => { if (e.target.id==="backdrop-close") { S.closingId=null; render(); } };
    document.getElementById("btn-cancel-close").onclick = () => { S.closingId=null; render(); };
    const fEnd = document.getElementById("field-actual-end");
    fEnd.onchange = () => { S.closeDraft.actualEnd = fEnd.value; render(); };
    const fQuality = document.getElementById("field-quality");
    if (fQuality) fQuality.oninput = () => {
      S.closeDraft.quality = Number(fQuality.value);
      const c = qualityColor(S.closeDraft.quality);
      document.getElementById("quality-display").textContent = S.closeDraft.quality + "%";
      document.getElementById("quality-display").style.color = c;
      document.getElementById("quality-label").textContent = qualityLabel(S.closeDraft.quality);
      fQuality.style.accentColor = c;
    };
    document.getElementById("btn-confirm-close").onclick = () => {
      closeSession(S.closingId, S.closeDraft.actualEnd, S.closeDraft.quality);
    };
  }

  // alarm overlay
  const btnDismiss = document.getElementById("btn-dismiss-alarm");
  if (btnDismiss) btnDismiss.onclick = () => { S.alarmId = null; render(); };
  const btnSnooze = document.getElementById("btn-snooze");
  if (btnSnooze) btnSnooze.onclick = () => {
    const id = S.alarmId;
    S.alarmed = S.alarmed.filter((x)=>x!==id); // allow re-trigger after snooze window
    persistAlarmed();
    S.alarmId = null;
    render();
    setTimeout(checkAlarms, 5*60*1000);
  };

  // celebrate overlay
  const btnCollect = document.getElementById("btn-collect-reward");
  if (btnCollect) btnCollect.onclick = () => { S.newReward = null; render(); };

  // goals: target save
  const btnSaveTarget = document.getElementById("btn-save-target");
  if (btnSaveTarget) btnSaveTarget.onclick = () => {
    const v = Math.max(0, Number(document.getElementById("target-input").value) || 0);
    S.weeklyTarget = v; persistTarget(); render(); checkRewards();
  };
}

/* ============================================================
   Boot
============================================================ */
render();
checkAlarms();
checkRewards();
setInterval(checkAlarms, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkAlarms(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
