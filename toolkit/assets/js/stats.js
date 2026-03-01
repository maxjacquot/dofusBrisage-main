'use strict';

/* ═══════════════════════════════════════════════════
   STATS MODULE — all IDs prefixed with "stats-"
   Exposed: window.statsAutoLoad (called lazily by app.js)
═══════════════════════════════════════════════════ */

/* ── Module state ──────────────────────────────── */
let allItems       = [];
let filterState    = { mode: 'all', budget: 'all', elem: 'all' };
let selectedClass  = null;
let selectedElem   = null;
let filterSetupDone = false;

/* ── Constants ─────────────────────────────────── */
const C = {
  goldBright: '#f2d96a', goldMain: '#c8a84b', goldMuted: '#7a6228',
  text300: '#b09070', text500: '#48404a', bgElevated: '#1c1c32',
  green: '#52c472', red: '#e05252', orange: '#e09030',
  border: 'rgba(80,60,40,.18)',
};

const ELEM_COLORS = {
  terre: '#b8860b', eau: '#4a9eff', feu: '#ff6347',
  air:   '#7ec8a0', multi: '#c8a84b', pp: '#9b59b6',
  doPou: '#e05252', tank: '#e09030',
};

const SLOT_META = {
  anneau_1: { icon: '💍', label: 'Anneau 1' },
  anneau_2: { icon: '💍', label: 'Anneau 2' },
  amulette: { icon: '📿', label: 'Amulette' },
  arme:     { icon: '⚔️', label: 'Arme'     },
  bottes:   { icon: '👢', label: 'Bottes'   },
  bouclier: { icon: '🛡️', label: 'Bouclier' },
  cape:     { icon: '🧣', label: 'Cape'     },
  ceinture: { icon: '🎗️', label: 'Ceinture' },
  coiffe:   { icon: '👑', label: 'Coiffe'   },
  dofus_1:  { icon: '🥚', label: 'Dofus 1'  },
  dofus_2:  { icon: '🥚', label: 'Dofus 2'  },
  dofus_3:  { icon: '🥚', label: 'Dofus 3'  },
  dofus_4:  { icon: '🥚', label: 'Dofus 4'  },
  dofus_5:  { icon: '🥚', label: 'Dofus 5'  },
  dofus_6:  { icon: '🥚', label: 'Dofus 6'  },
  familier: { icon: '🐾', label: 'Familier' },
};

const CLASS_EMOJI = {
  iop:'⚔️', sram:'🗡️', cra:'🏹', eniripsa:'✨', huppermage:'🌀',
  pandawa:'🍶', sadida:'🌿', forgelance:'🔥', sacrieur:'🩸', feca:'🛡️',
  eliotrope:'🌐', xelor:'⏰', ecaflip:'🃏', osamodas:'🐉', ouginak:'🐺',
  roublard:'💣', zobal:'🎭', steamer:'⚙️', enutrof:'💰',
};

const ELEMS_MAIN = ['terre','eau','feu','air','multi','pp'];
const BUDGETS    = ['high','mid','low'];

/* ── Chart.js defaults ─────────────────────────── */
Chart.defaults.color       = C.text300;
Chart.defaults.borderColor = C.border;
Chart.defaults.font.family = "'Nunito', sans-serif";
Chart.defaults.font.size   = 11;

/* ── Utils ─────────────────────────────────────── */
const groupCount = (arr, key) => {
  const m = {};
  arr.forEach(i => { const v = i[key] ?? 'N/A'; m[v] = (m[v]||0)+1; });
  return m;
};
const sorted = (obj, n = Infinity) =>
  Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0, n);
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : '—';
const fmt = n => Number(n).toLocaleString('fr');

function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
function yesterdayStr() {
  const d = new Date(Date.now()-86400000);
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}

function goldGrad(ctx, n) {
  return Array.from({length: n}, (_, i) => {
    const t = i / Math.max(n-1, 1);
    return `rgba(200,168,75,${(0.85 - t*0.5).toFixed(2)})`;
  });
}

function avg(arr) {
  return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
}

/* ── Data processing ───────────────────────────── */
function process(items) {
  const total = items.length;
  if (!total) return { total:0, pvm:0, pvp:0, byClasse:{}, topClasse:['—',0], byBudget:{}, budgetMode:{}, elemAll:{}, elemPvm:{}, elemPvp:{}, topElem:['—',0], byLevel:{}, topItems:[], numUnique:0, topBySlot:{}, metaWeapon:[], topWeapons:[] };

  const pvm = items.filter(i=>i.mode==='pvm').length;
  const pvp = items.filter(i=>i.mode==='pvp').length;

  const byClasse  = groupCount(items, 'classe');
  const topClasse = sorted(byClasse, 1)[0] || ['—',0];

  const byBudget = {};
  items.forEach(i => { const k=i.budget??'N/A'; byBudget[k]=(byBudget[k]||0)+1; });

  const budgetMode = {};
  ['high','mid','low','N/A'].forEach(b => { budgetMode[b]={pvm:0,pvp:0}; });
  items.forEach(i => {
    const b=i.budget??'N/A';
    if (budgetMode[b]) { if(i.mode==='pvm') budgetMode[b].pvm++; else if(i.mode==='pvp') budgetMode[b].pvp++; }
  });

  const elemAll={}, elemPvm={}, elemPvp={};
  ELEMS_MAIN.forEach(e => { elemAll[e]=0; elemPvm[e]=0; elemPvp[e]=0; });
  items.forEach(i => {
    (i.tags||[]).forEach(t => {
      if (t in elemAll) { elemAll[t]++; if(i.mode==='pvm') elemPvm[t]++; else if(i.mode==='pvp') elemPvp[t]++; }
    });
  });
  const topElem = sorted(elemAll,1)[0] || ['—',0];

  const rawLvl = groupCount(items, 'level');
  const byLevel = {};
  Object.entries(rawLvl).sort((a,b)=>Number(a[0])-Number(b[0])).forEach(([k,v])=>byLevel[k]=v);

  const allItems2 = {}, uniqueSet = new Set();
  items.forEach(b => {
    Object.values(b.slots||{}).forEach(eq => {
      if (eq?.name) { uniqueSet.add(eq.name); allItems2[eq.name]=(allItems2[eq.name]||0)+1; }
    });
  });
  const topItems  = sorted(allItems2, 20);
  const numUnique = uniqueSet.size;

  const slotCounts = {};
  Object.keys(SLOT_META).forEach(s => slotCounts[s]={});
  items.forEach(b => {
    Object.entries(b.slots||{}).forEach(([s,eq]) => {
      if (eq?.name && s in slotCounts) slotCounts[s][eq.name]=(slotCounts[s][eq.name]||0)+1;
    });
  });
  const topBySlot = {};
  Object.entries(slotCounts).forEach(([s,ctr]) => topBySlot[s]=sorted(ctr,5));

  const classWeapon={}, classTotals={};
  items.forEach(b => {
    const cl=b.classe; if(!cl) return;
    classTotals[cl]=(classTotals[cl]||0)+1;
    const arme=b.slots?.arme?.name; if(!arme) return;
    if(!classWeapon[cl]) classWeapon[cl]={};
    classWeapon[cl][arme]=(classWeapon[cl][arme]||0)+1;
  });
  const metaWeapon = sorted(byClasse).map(([cl]) => {
    const top=sorted(classWeapon[cl]||{},1)[0];
    return {classe:cl, weapon:top?.[0]||'—', count:top?.[1]||0, total:classTotals[cl]||0};
  });

  const weaponAll = {};
  metaWeapon.forEach(r => { if(r.weapon!=='—') weaponAll[r.weapon]=(weaponAll[r.weapon]||0)+r.count; });
  const topWeapons = sorted(weaponAll, 10);

  return { total,pvm,pvp,byClasse,topClasse,byBudget,budgetMode,elemAll,elemPvm,elemPvp,topElem,byLevel,topItems,numUnique,topBySlot,metaWeapon,topWeapons };
}

/* ════════════════════════════════════════════════
   FILTER LOGIC
════════════════════════════════════════════════ */
function getFilteredItems() {
  return allItems.filter(item => {
    if (filterState.mode   !== 'all' && item.mode  !== filterState.mode)  return false;
    if (filterState.budget !== 'all' && (item.budget??'N/A') !== filterState.budget) return false;
    if (filterState.elem   !== 'all' && !(item.tags||[]).includes(filterState.elem)) return false;
    return true;
  });
}

function applyFilters() {
  if (!allItems.length) return;
  const filtered = getFilteredItems();

  // Auto-deselect if selected class/elem has no items in current filter
  if (selectedClass && !filtered.some(i => i.classe === selectedClass)) selectedClass = null;
  if (selectedElem  && !filtered.some(i => (i.tags||[]).includes(selectedElem)))  selectedElem  = null;

  updateFilterCount(filtered.length);

  const s = process(filtered);
  renderInsights(s);
  renderKPIs(s);
  renderCharts(s);
  renderSlots(s);
  renderWeaponsTable(s);

  renderClassSection(filtered);
  renderElemSection(filtered);
  renderMatrix(filtered);
}

function updateFilterCount(count) {
  const el = document.getElementById('stats-filterResult');
  if (!el) return;
  if (count === allItems.length) {
    el.innerHTML = `<b>${fmt(count)}</b> builds`;
  } else {
    el.innerHTML = `<b>${fmt(count)}</b> / ${fmt(allItems.length)} builds filtrés`;
  }
}

function renderFilterSetup() {
  if (filterSetupDone) return;
  filterSetupDone = true;

  // Populate element pills
  const elemDiv = document.getElementById('stats-filterElem');
  ELEMS_MAIN.forEach(e => {
    const color = ELEM_COLORS[e] || C.goldMain;
    const btn = document.createElement('button');
    btn.className = 'fpill';
    btn.dataset.fkey = 'elem';
    btn.dataset.fval = e;
    btn.textContent = cap(e);
    btn.style.color = color;
    btn.style.borderColor = color + '55';
    elemDiv.appendChild(btn);
  });

  // Attach handlers to ALL filter pills
  document.querySelectorAll('#stats-filterBar .fpill').forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.fkey;
      const val = pill.dataset.fval;
      filterState[key] = val;

      // Update active state within group
      document.querySelectorAll(`#stats-filterBar .fpill[data-fkey="${key}"]`).forEach(p => {
        const isActive = p.dataset.fval === val;
        p.classList.toggle('active', isActive);
        // Element pills: color when inactive, bright when active
        if (key === 'elem' && p.dataset.fval !== 'all') {
          const color = ELEM_COLORS[p.dataset.fval] || C.goldMain;
          p.style.color        = color;
          p.style.borderColor  = isActive ? color : color + '55';
          p.style.background   = isActive ? color + '22' : '';
        }
      });

      applyFilters();
    });
  });
}

function resetFilters() {
  filterState = { mode: 'all', budget: 'all', elem: 'all' };
  selectedClass = null;
  selectedElem  = null;
  document.querySelectorAll('#stats-filterBar .fpill').forEach(p => {
    p.classList.toggle('active', p.dataset.fval === 'all');
    if (p.dataset.fkey === 'elem' && p.dataset.fval !== 'all') {
      const color = ELEM_COLORS[p.dataset.fval] || C.goldMain;
      p.style.color = color; p.style.borderColor = color + '55'; p.style.background = '';
    }
  });
}

/* ════════════════════════════════════════════════
   EXISTING RENDER FUNCTIONS (unchanged logic)
════════════════════════════════════════════════ */
function renderInsights(s) {
  const pvmPct    = s.total ? Math.round(s.pvm/s.total*100) : 0;
  const topElem   = cap(s.topElem?.[0]||'—');
  const topClass  = cap(s.topClasse?.[0]||'—');
  const topItem   = s.topItems?.[0]?.[0]||'—';
  const topWeapon = s.topWeapons?.[0]?.[0]||'—';

  const pills = [
    `<b>${pvmPct}%</b> des builds sont PvM`,
    `Élément dominant : <b>${topElem}</b>`,
    `Classe la plus couverte : <b>${topClass}</b>`,
    `Item n°1 toutes classes : <b>${topItem}</b>`,
    `Arme méta globale : <b>${topWeapon}</b>`,
    `<b>${fmt(s.numUnique)}</b> items distincts référencés`,
    `Niveau le + documenté : <b>Lv ${sorted(s.byLevel,1)[0]?.[0]||'—'}</b>`,
  ];
  document.getElementById('stats-insightsRow').innerHTML =
    pills.map(p=>`<div class="pill">${p}</div>`).join('');
}

function renderKPIs(s) {
  document.getElementById('stats-kTotal').textContent    = fmt(s.total);
  document.getElementById('stats-kTotalSub').textContent = `${fmt(s.pvm)} PvM · ${fmt(s.pvp)} PvP`;
  document.getElementById('stats-kClasses').textContent    = Object.keys(s.byClasse).length;
  document.getElementById('stats-kClassesSub').textContent = `Top: ${cap(s.topClasse[0])} (${s.topClasse[1]})`;
  document.getElementById('stats-kItems').textContent    = fmt(s.numUnique);
  document.getElementById('stats-kItemsSub').textContent = 'items distincts dans tous les builds';
  document.getElementById('stats-kTopItem').textContent    = s.topItems[0]?.[0]||'—';
  document.getElementById('stats-kTopItemSub').textContent = `présent dans ${fmt(s.topItems[0]?.[1]||0)} builds`;
  const sub = document.getElementById('stats-topItemsSub');
  if (sub) sub.textContent = s.total ? `sur ${fmt(s.total)} builds` : '';
}

/* ── Charts ── */
const _charts = {};
const mk = (id, type, data, opts) => {
  _charts[id]?.destroy();
  const canvas = document.getElementById(id);
  if (!canvas) return;
  _charts[id] = new Chart(canvas, { type, data, options: opts });
};

const tooltipLabel = suffix =>
  ({ callbacks: { label: ctx => ` ${cap(ctx.label||'')}: ${fmt(ctx.raw)} ${suffix}` } });

const donutOpts = () => ({
  responsive: true, maintainAspectRatio: false, cutout: '62%',
  plugins: {
    legend: { position:'bottom', labels:{ color:C.text300, font:{size:10}, padding:10, boxWidth:10 } },
    tooltip: { callbacks: { label: ctx => {
      const tot = ctx.dataset.data.reduce((a,b)=>a+b,0);
      return ` ${ctx.label}: ${fmt(ctx.raw)} (${Math.round(ctx.raw/tot*100)}%)`;
    }}},
  },
});

const barOptsV = () => ({
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{display:false}, tooltip: tooltipLabel('builds') },
  scales:{
    x:{ grid:{display:false}, ticks:{color:C.text300, font:{size:10}} },
    y:{ grid:{color:C.border},  ticks:{color:C.text500, font:{size:10}} },
  },
});

const barOptsH = (max) => ({
  responsive:true, maintainAspectRatio:false, indexAxis:'y',
  plugins:{ legend:{display:false}, tooltip: tooltipLabel('builds') },
  scales:{
    x:{ max, grid:{color:C.border}, ticks:{color:C.text500, font:{size:10}} },
    y:{ grid:{display:false},        ticks:{color:C.text300, font:{size:11}} },
  },
});

function renderCharts(s) {
  mk('stats-cMode','doughnut',{
    labels:['PvM','PvP'],
    datasets:[{ data:[s.pvm,s.pvp],
      backgroundColor:['rgba(82,196,114,.55)','rgba(224,82,82,.55)'],
      borderColor:['#52c472','#e05252'], borderWidth:1.5 }],
  }, donutOpts());

  const budgEntries = BUDGETS.map(b=>[b,s.byBudget[b]||0]).concat([['N/A',s.byBudget['N/A']||0]]).filter(([,v])=>v>0);
  const BCOL = { high:'rgba(200,168,75,.6)',mid:'rgba(224,144,48,.6)',low:'rgba(72,64,74,.6)','N/A':'rgba(40,30,50,.6)' };
  const BBRD = { high:'#c8a84b',mid:'#e09030',low:'#48404a','N/A':'#302040' };
  mk('stats-cBudget','doughnut',{
    labels: budgEntries.map(([k])=>k==='N/A'?'Non défini':cap(k)),
    datasets:[{ data:budgEntries.map(([,v])=>v), backgroundColor:budgEntries.map(([k])=>BCOL[k]), borderColor:budgEntries.map(([k])=>BBRD[k]), borderWidth:1.5 }],
  }, donutOpts());

  mk('stats-cElem','doughnut',{
    labels: ELEMS_MAIN.map(cap),
    datasets:[{ data:ELEMS_MAIN.map(e=>s.elemAll[e]||0), backgroundColor:ELEMS_MAIN.map(e=>(ELEM_COLORS[e]||'#888')+'99'), borderColor:ELEMS_MAIN.map(e=>ELEM_COLORS[e]||'#888'), borderWidth:1.5 }],
  }, donutOpts());

  const clEntries = sorted(s.byClasse);
  mk('stats-cClasses','bar',{
    labels: clEntries.map(([k])=>`${CLASS_EMOJI[k]||''} ${cap(k)}`),
    datasets:[{ data:clEntries.map(([,v])=>v), backgroundColor:goldGrad(null,clEntries.length), borderColor:'rgba(200,168,75,.25)', borderWidth:1, borderRadius:4 }],
  }, barOptsV());

  mk('stats-cElemModes','bar',{
    labels: ELEMS_MAIN.map(cap),
    datasets:[
      { label:'PvM', data:ELEMS_MAIN.map(e=>s.elemPvm[e]||0), backgroundColor:'rgba(82,196,114,.5)', borderColor:'#52c472', borderWidth:1, borderRadius:4 },
      { label:'PvP', data:ELEMS_MAIN.map(e=>s.elemPvp[e]||0), backgroundColor:'rgba(224,82,82,.5)',  borderColor:'#e05252', borderWidth:1, borderRadius:4 },
    ],
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{labels:{color:C.text300,font:{size:11}}}, tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw)} builds`}} },
    scales:{ x:{grid:{display:false},ticks:{color:C.text300,font:{size:12}}}, y:{grid:{color:C.border},ticks:{color:C.text500,font:{size:10}}} },
  });

  const lvlEntries = Object.entries(s.byLevel);
  mk('stats-cLevels','bar',{
    labels: lvlEntries.map(([k])=>`${k}`),
    datasets:[{ data:lvlEntries.map(([,v])=>v), backgroundColor:lvlEntries.map(([k])=>{ const n=Number(k); return n>=190?'rgba(200,168,75,.75)':n>=100?'rgba(200,168,75,.4)':'rgba(200,168,75,.2)'; }), borderColor:'rgba(200,168,75,.25)', borderWidth:1, borderRadius:3 }],
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:tooltipLabel('builds') },
    scales:{ x:{grid:{display:false},ticks:{color:C.text500,font:{size:9},maxRotation:45}}, y:{grid:{color:C.border},ticks:{color:C.text500,font:{size:9}}} },
  });

  const maxV = s.topItems[0]?.[1]??1;
  mk('stats-cTopItems','bar',{
    labels: s.topItems.map(([k])=>k),
    datasets:[{ data:s.topItems.map(([,v])=>v), backgroundColor:goldGrad(null,s.topItems.length), borderColor:'rgba(200,168,75,.2)', borderWidth:1, borderRadius:4 }],
  }, barOptsH(Math.ceil(maxV*1.1)));

  mk('stats-cWeapons','bar',{
    labels: s.topWeapons.map(([k])=>k),
    datasets:[{ data:s.topWeapons.map(([,v])=>v), backgroundColor:goldGrad(null,s.topWeapons.length), borderColor:'rgba(200,168,75,.25)', borderWidth:1, borderRadius:4 }],
  }, barOptsH(s.topWeapons[0]?.[1]*1.15||10));

  const bm = s.budgetMode;
  mk('stats-cBudgetMode','bar',{
    labels:['High','Mid','Low'],
    datasets:[
      { label:'PvM', data:BUDGETS.map(b=>bm[b]?.pvm||0), backgroundColor:'rgba(82,196,114,.5)', borderColor:'#52c472', borderWidth:1, borderRadius:4 },
      { label:'PvP', data:BUDGETS.map(b=>bm[b]?.pvp||0), backgroundColor:'rgba(224,82,82,.5)',  borderColor:'#e05252', borderWidth:1, borderRadius:4 },
    ],
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{labels:{color:C.text300,font:{size:11}}}, tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.raw)} builds`}} },
    scales:{ x:{grid:{display:false},ticks:{color:C.text300,font:{size:12}}}, y:{grid:{color:C.border},ticks:{color:C.text500,font:{size:10}}} },
  });
}

function renderSlots(s) {
  const grid = document.getElementById('stats-slotsGrid');
  grid.innerHTML = '';
  Object.entries(SLOT_META).forEach(([slot, meta]) => {
    const top = s.topBySlot[slot] || [];
    if (!top.length) return;
    const maxC = top[0][1];
    const card = document.createElement('div');
    card.className = 'meta-slot-card';
    card.innerHTML = `
      <div class="slot-hd">
        <span class="slot-icon">${meta.icon}</span>
        <span class="slot-nm">${meta.label}</span>
      </div>
      <div class="slot-items-list">
        ${top.map(([name,cnt]) => `
          <div class="s-item">
            <div class="s-item-top">
              <span class="s-item-name" title="${name}">${name}</span>
              <span class="s-item-count">${cnt}×</span>
            </div>
            <div class="s-bar"><div class="s-bar-fill" style="width:${Math.round(cnt/maxC*100)}%"></div></div>
          </div>
        `).join('')}
      </div>`;
    grid.appendChild(card);
  });
}

function renderWeaponsTable(s) {
  const tbody = document.getElementById('stats-tblWeapons');
  tbody.innerHTML = s.metaWeapon.map((r,i) => {
    const pct = r.total ? Math.round(r.count/r.total*100) : 0;
    const em  = CLASS_EMOJI[r.classe]||'';
    return `<tr>
      <td class="td-rk">${i+1}</td>
      <td class="td-cl">${em} ${r.classe}</td>
      <td class="td-wp">${r.weapon}</td>
      <td class="td-nb">${fmt(r.count)}</td>
      <td class="td-pc">${pct}%</td>
    </tr>`;
  }).join('');
}

/* ════════════════════════════════════════════════
   CLASS ANALYSIS
════════════════════════════════════════════════ */
function renderClassSection(items) {
  const section = document.getElementById('stats-classSection');
  if (!items.length) { section.innerHTML = ''; return; }

  const byClasse = groupCount(items, 'classe');
  const classes  = sorted(byClasse);

  // Build class grid
  let html = '<div class="class-grid">';
  classes.forEach(([classe, count]) => {
    const em = CLASS_EMOJI[classe] || '?';
    const classItems = items.filter(i => i.classe === classe);
    const pvmPct = Math.round(classItems.filter(i=>i.mode==='pvm').length / count * 100);

    // Top 3 elements for this class
    const ecounts = {};
    classItems.forEach(i => (i.tags||[]).forEach(t => { if(ELEMS_MAIN.includes(t)) ecounts[t]=(ecounts[t]||0)+1; }));
    const topElems = sorted(ecounts, 3);

    const isActive = selectedClass === classe;
    html += `
      <div class="class-chip${isActive?' active':''}" data-classe="${classe}">
        <div class="cc-head">
          <span class="cc-emoji">${em}</span>
          <span class="cc-name">${classe}</span>
          <span class="cc-count">${count}</span>
        </div>
        <div class="cc-bars">
          <div class="cc-bar-row">
            <span class="cc-bar-label">PvM</span>
            <div class="cc-bar-track"><div class="cc-bar-fill cc-bar-pvm" style="width:${pvmPct}%"></div></div>
            <span>${pvmPct}%</span>
          </div>
          <div class="cc-bar-row">
            <span class="cc-bar-label">PvP</span>
            <div class="cc-bar-track"><div class="cc-bar-fill cc-bar-pvp" style="width:${100-pvmPct}%"></div></div>
            <span>${100-pvmPct}%</span>
          </div>
        </div>
        <div class="cc-top-elem">
          ${topElems.map(([e])=>{
            const color=ELEM_COLORS[e]||C.goldMain;
            return `<span class="cc-elem-dot" style="background:${color}22;color:${color};border:1px solid ${color}44">${cap(e)}</span>`;
          }).join('')}
        </div>
      </div>`;
  });
  html += '</div>';

  // Class detail panel
  if (selectedClass && byClasse[selectedClass]) {
    const classItems = items.filter(i => i.classe === selectedClass);
    html += buildClassDetailHTML(selectedClass, classItems, items.length);
  }

  section.innerHTML = html;

  // Attach class chip click handlers
  section.querySelectorAll('.class-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cl = chip.dataset.classe;
      selectedClass = (selectedClass === cl) ? null : cl;
      renderClassSection(items);
    });
  });

  // Attach close button
  const closeBtn = section.querySelector('.cdp-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { selectedClass = null; renderClassSection(items); });

  // Render charts after DOM update
  if (selectedClass && byClasse[selectedClass]) {
    const classItems = items.filter(i => i.classe === selectedClass);
    setTimeout(() => renderClassCharts(selectedClass, classItems), 0);
  }
}

function buildClassDetailHTML(classe, classItems, total) {
  const em    = CLASS_EMOJI[classe] || '';
  const count = classItems.length;
  const pvm   = classItems.filter(i=>i.mode==='pvm').length;
  const pvp   = count - pvm;

  const budgetCounts = {};
  classItems.forEach(i => { const b=i.budget||'N/A'; budgetCounts[b]=(budgetCounts[b]||0)+1; });
  const topBudget = sorted(budgetCounts,1)[0];

  const levels = classItems.map(i=>Number(i.level)).filter(Boolean);
  const avgLvl  = avg(levels);

  // Top slots for this class (top item per slot)
  const slotTops = {};
  Object.keys(SLOT_META).forEach(s => slotTops[s] = {});
  classItems.forEach(b => {
    Object.entries(b.slots||{}).forEach(([s,eq]) => {
      if (eq?.name && s in slotTops) slotTops[s][eq.name]=(slotTops[s][eq.name]||0)+1;
    });
  });

  // Top 3 slots with highest consensus (most popular item / total builds)
  const slotConsensus = Object.entries(slotTops).map(([s,ctr]) => {
    const top = sorted(ctr,1)[0];
    if (!top) return null;
    const pct = Math.round(top[1]/count*100);
    return { slot:s, item:top[0], count:top[1], pct, meta:SLOT_META[s] };
  }).filter(Boolean).sort((a,b)=>b.pct-a.pct).slice(0,6);

  return `
    <div class="class-detail-panel">
      <div class="cdp-head">
        <span class="cdp-emoji">${em}</span>
        <div>
          <div class="cdp-name">${classe}</div>
          <div class="cdp-count">${fmt(count)} builds · ${total ? Math.round(count/total*100) : 0}% du total</div>
        </div>
        <button class="cdp-close">✕ Fermer</button>
      </div>

      <div class="kpi-row" style="margin-bottom:1.1rem">
        <div class="kpi">
          <div class="kpi-ico">${em}</div>
          <div class="kpi-lbl">Builds</div>
          <div class="kpi-val">${fmt(count)}</div>
          <div class="kpi-sub">${total ? Math.round(count/total*100) : 0}% du total</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">⚔️</div>
          <div class="kpi-lbl">PvM / PvP</div>
          <div class="kpi-val sm">${Math.round(pvm/count*100)}% / ${Math.round(pvp/count*100)}%</div>
          <div class="kpi-sub">${fmt(pvm)} PvM · ${fmt(pvp)} PvP</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">💰</div>
          <div class="kpi-lbl">Budget majoritaire</div>
          <div class="kpi-val sm">${cap(topBudget?.[0]||'—')}</div>
          <div class="kpi-sub">${topBudget?.[1]||0} builds</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">📊</div>
          <div class="kpi-lbl">Niveau moyen</div>
          <div class="kpi-val">${avgLvl||'—'}</div>
          <div class="kpi-sub">sur ${count} builds</div>
        </div>
      </div>

      <div class="row row-2" style="margin-bottom:1rem">
        <div class="chart-card">
          <div class="chart-ttl">🌡️ Éléments joués</div>
          <div class="h220"><canvas id="stats-cd-elem"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-ttl">💰 Budget</div>
          <div class="h220"><canvas id="stats-cd-budget"></canvas></div>
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:1rem">
        <div class="chart-ttl">
          🏆 Top 15 items — ${cap(classe)}
          <span class="chart-sub">fréquence tous slots confondus</span>
        </div>
        <div class="h360"><canvas id="stats-cd-items"></canvas></div>
      </div>

      ${slotConsensus.length ? `
      <div class="chart-card">
        <div class="chart-ttl">🎒 Item BIS par slot <span class="chart-sub">item le plus porté chez ${cap(classe)}</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.6rem;padding:.5rem 0">
          ${slotConsensus.map(r=>`
            <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .7rem;background:var(--bg-elevated);border-radius:var(--r);border:1px solid var(--border)">
              <span style="font-size:.9rem">${r.meta.icon}</span>
              <div style="min-width:0;flex:1">
                <div style="font-size:.6rem;color:var(--text-500);text-transform:uppercase;letter-spacing:.07em">${r.meta.label}</div>
                <div style="font-size:.72rem;color:var(--gold-main);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.item}">${r.item}</div>
                <div style="font-size:.6rem;color:var(--text-500)">${r.count}× · ${r.pct}% des builds</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>`;
}

function renderClassCharts(classe, classItems) {
  const count = classItems.length;

  // Elements bar
  const ecounts = {};
  ELEMS_MAIN.forEach(e => ecounts[e]=0);
  classItems.forEach(i => (i.tags||[]).forEach(t => { if(t in ecounts) ecounts[t]++; }));
  const eentries = Object.entries(ecounts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  mk('stats-cd-elem','bar',{
    labels: eentries.map(([k])=>cap(k)),
    datasets:[{ data:eentries.map(([,v])=>v),
      backgroundColor:eentries.map(([k])=>(ELEM_COLORS[k]||'#888')+'99'),
      borderColor:eentries.map(([k])=>ELEM_COLORS[k]||'#888'), borderWidth:1.5, borderRadius:4 }]
  },{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:tooltipLabel('builds') },
    scales:{ x:{grid:{display:false},ticks:{color:C.text300,font:{size:12}}}, y:{grid:{color:C.border},ticks:{color:C.text500,font:{size:10}}} },
  });

  // Budget donut
  const budgetCounts = {};
  ['high','mid','low','N/A'].forEach(b=>budgetCounts[b]=0);
  classItems.forEach(i => { const b=i.budget||'N/A'; budgetCounts[b]++; });
  const budgEntries = Object.entries(budgetCounts).filter(([,v])=>v>0);
  const BCOL = { high:'rgba(200,168,75,.6)',mid:'rgba(224,144,48,.6)',low:'rgba(72,64,74,.6)','N/A':'rgba(40,30,50,.6)' };
  const BBRD = { high:'#c8a84b',mid:'#e09030',low:'#48404a','N/A':'#302040' };
  mk('stats-cd-budget','doughnut',{
    labels: budgEntries.map(([k])=>k==='N/A'?'Non défini':cap(k)),
    datasets:[{ data:budgEntries.map(([,v])=>v), backgroundColor:budgEntries.map(([k])=>BCOL[k]), borderColor:budgEntries.map(([k])=>BBRD[k]), borderWidth:1.5 }]
  }, donutOpts());

  // Top items bar
  const itemCounts = {};
  classItems.forEach(b => Object.values(b.slots||{}).forEach(eq => { if(eq?.name) itemCounts[eq.name]=(itemCounts[eq.name]||0)+1; }));
  const topItems = sorted(itemCounts, 15);
  mk('stats-cd-items','bar',{
    labels: topItems.map(([k])=>k),
    datasets:[{ data:topItems.map(([,v])=>v), backgroundColor:goldGrad(null,topItems.length), borderColor:'rgba(200,168,75,.2)', borderWidth:1, borderRadius:4 }]
  }, barOptsH(Math.ceil((topItems[0]?.[1]??1)*1.1)));
}

/* ════════════════════════════════════════════════
   ELEMENT ANALYSIS
════════════════════════════════════════════════ */
function renderElemSection(items) {
  const section = document.getElementById('stats-elemSection');
  if (!items.length) { section.innerHTML = ''; return; }

  // Count builds per element
  const elemCounts = {};
  ELEMS_MAIN.forEach(e => elemCounts[e]=0);
  items.forEach(i => (i.tags||[]).forEach(t => { if(t in elemCounts) elemCounts[t]++; }));

  // Element chips
  let html = '<div class="elem-grid">';
  ELEMS_MAIN.forEach(e => {
    const count = elemCounts[e];
    if (!count) return;
    const color = ELEM_COLORS[e] || C.goldMain;
    const isActive = selectedElem === e;
    const style = isActive
      ? `background:${color}22;border-color:${color};border-width:2px;color:${color}`
      : `border-color:${color}55;color:${color}`;
    html += `
      <div class="elem-chip" data-elem="${e}" style="${style}">
        <span class="ec-name">${cap(e)}</span>
        <span class="ec-count">${fmt(count)} builds</span>
      </div>`;
  });
  html += '</div>';

  // Detail panel
  if (selectedElem && elemCounts[selectedElem]) {
    const elemItems = items.filter(i=>(i.tags||[]).includes(selectedElem));
    html += buildElemDetailHTML(selectedElem, elemItems, items.length);
  }

  section.innerHTML = html;

  // Attach click handlers
  section.querySelectorAll('.elem-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const e = chip.dataset.elem;
      selectedElem = (selectedElem === e) ? null : e;
      renderElemSection(items);
    });
  });

  const closeBtn = section.querySelector('.edp-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { selectedElem = null; renderElemSection(items); });

  if (selectedElem && elemCounts[selectedElem]) {
    const elemItems = items.filter(i=>(i.tags||[]).includes(selectedElem));
    setTimeout(() => renderElemCharts(selectedElem, elemItems), 0);
  }
}

function buildElemDetailHTML(elem, elemItems, total) {
  const count  = elemItems.length;
  const pvm    = elemItems.filter(i=>i.mode==='pvm').length;
  const pvp    = count - pvm;
  const color  = ELEM_COLORS[elem] || C.goldMain;

  const budgetCounts = {};
  elemItems.forEach(i => { const b=i.budget||'N/A'; budgetCounts[b]=(budgetCounts[b]||0)+1; });
  const topBudget = sorted(budgetCounts,1)[0];

  const classCounts = groupCount(elemItems,'classe');
  const topClass = sorted(classCounts,1)[0];

  const levels = elemItems.map(i=>Number(i.level)).filter(Boolean);
  const avgLvl = avg(levels);

  return `
    <div class="elem-detail-panel" style="border-color:${color}55">
      <div class="edp-head">
        <div style="font-size:2rem">🌊</div>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:${color};text-transform:capitalize">${elem}</div>
          <div style="font-size:.72rem;color:var(--text-500)">${fmt(count)} builds · ${total?Math.round(count/total*100):0}% du total</div>
        </div>
        <button class="edp-close">✕ Fermer</button>
      </div>

      <div class="kpi-row" style="margin-bottom:1.1rem">
        <div class="kpi">
          <div class="kpi-ico" style="color:${color}">●</div>
          <div class="kpi-lbl">Builds ${cap(elem)}</div>
          <div class="kpi-val" style="color:${color}">${fmt(count)}</div>
          <div class="kpi-sub">${total?Math.round(count/total*100):0}% du total</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">⚔️</div>
          <div class="kpi-lbl">PvM / PvP</div>
          <div class="kpi-val sm">${Math.round(pvm/count*100)}% / ${Math.round(pvp/count*100)}%</div>
          <div class="kpi-sub">${fmt(pvm)} PvM · ${fmt(pvp)} PvP</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">🎭</div>
          <div class="kpi-lbl">Classe principale</div>
          <div class="kpi-val sm">${cap(topClass?.[0]||'—')}</div>
          <div class="kpi-sub">${topClass?.[1]||0} builds</div>
        </div>
        <div class="kpi">
          <div class="kpi-ico">📊</div>
          <div class="kpi-lbl">Niveau moyen</div>
          <div class="kpi-val">${avgLvl||'—'}</div>
          <div class="kpi-sub">budget top : ${cap(topBudget?.[0]||'—')}</div>
        </div>
      </div>

      <div class="row row-2" style="margin-bottom:1rem">
        <div class="chart-card">
          <div class="chart-ttl">🎭 Classes jouant ${cap(elem)} <span class="chart-sub">top 10</span></div>
          <div class="h280"><canvas id="stats-ed-classes"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-ttl">Mode &amp; Budget</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;height:280px">
            <div style="position:relative"><canvas id="stats-ed-mode"></canvas></div>
            <div style="position:relative"><canvas id="stats-ed-budget"></canvas></div>
          </div>
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:1rem">
        <div class="chart-ttl">🏆 Top 15 items dans les builds ${cap(elem)} <span class="chart-sub">tous slots</span></div>
        <div class="h360"><canvas id="stats-ed-items"></canvas></div>
      </div>
    </div>`;
}

function renderElemCharts(elem, elemItems) {
  // Classes bar
  const classCounts = groupCount(elemItems,'classe');
  const clEntries   = sorted(classCounts, 10);
  mk('stats-ed-classes','bar',{
    labels: clEntries.map(([k])=>`${CLASS_EMOJI[k]||''} ${cap(k)}`),
    datasets:[{ data:clEntries.map(([,v])=>v), backgroundColor:goldGrad(null,clEntries.length), borderColor:'rgba(200,168,75,.25)', borderWidth:1, borderRadius:4 }]
  }, barOptsV());

  // Mode donut
  const pvm = elemItems.filter(i=>i.mode==='pvm').length;
  mk('stats-ed-mode','doughnut',{
    labels:['PvM','PvP'],
    datasets:[{ data:[pvm,elemItems.length-pvm], backgroundColor:['rgba(82,196,114,.55)','rgba(224,82,82,.55)'], borderColor:['#52c472','#e05252'], borderWidth:1.5 }]
  }, donutOpts());

  // Budget donut
  const budgetCounts = {};
  ['high','mid','low','N/A'].forEach(b=>budgetCounts[b]=0);
  elemItems.forEach(i => { const b=i.budget||'N/A'; budgetCounts[b]++; });
  const budgEntries = Object.entries(budgetCounts).filter(([,v])=>v>0);
  const BCOL={high:'rgba(200,168,75,.6)',mid:'rgba(224,144,48,.6)',low:'rgba(72,64,74,.6)','N/A':'rgba(40,30,50,.6)'};
  const BBRD={high:'#c8a84b',mid:'#e09030',low:'#48404a','N/A':'#302040'};
  mk('stats-ed-budget','doughnut',{
    labels: budgEntries.map(([k])=>k==='N/A'?'Non défini':cap(k)),
    datasets:[{ data:budgEntries.map(([,v])=>v), backgroundColor:budgEntries.map(([k])=>BCOL[k]), borderColor:budgEntries.map(([k])=>BBRD[k]), borderWidth:1.5 }]
  }, donutOpts());

  // Top items bar
  const itemCounts = {};
  elemItems.forEach(b => Object.values(b.slots||{}).forEach(eq => { if(eq?.name) itemCounts[eq.name]=(itemCounts[eq.name]||0)+1; }));
  const topItems = sorted(itemCounts, 15);
  mk('stats-ed-items','bar',{
    labels: topItems.map(([k])=>k),
    datasets:[{ data:topItems.map(([,v])=>v), backgroundColor:goldGrad(null,topItems.length), borderColor:'rgba(200,168,75,.2)', borderWidth:1, borderRadius:4 }]
  }, barOptsH(Math.ceil((topItems[0]?.[1]??1)*1.1)));
}

/* ════════════════════════════════════════════════
   CLASS × ELEMENT MATRIX
════════════════════════════════════════════════ */
function renderMatrix(items) {
  const wrap = document.getElementById('stats-matrixWrap');
  if (!items.length) { wrap.innerHTML = ''; return; }

  const byClasse = groupCount(items, 'classe');
  const classes  = sorted(byClasse).map(([k])=>k);
  const elems    = ELEMS_MAIN;

  // Build counts
  const matrix = {};
  const classTotals = {};
  classes.forEach(cl => { matrix[cl]={}; elems.forEach(e=>matrix[cl][e]=0); classTotals[cl]=0; });
  items.forEach(b => {
    const cl=b.classe; if(!cl||!matrix[cl]) return;
    classTotals[cl]++;
    (b.tags||[]).forEach(t => { if(t in matrix[cl]) matrix[cl][t]++; });
  });

  let html = '<table class="matrix-tbl"><thead><tr>';
  html += '<th>Classe</th>';
  elems.forEach(e => html += `<th style="color:${ELEM_COLORS[e]||C.goldMain}">${cap(e)}</th>`);
  html += '<th>Total</th></tr></thead><tbody>';

  classes.forEach(cl => {
    const total  = classTotals[cl];
    const rowMax = Math.max(...elems.map(e=>matrix[cl][e]), 1);
    const em     = CLASS_EMOJI[cl] || '';
    html += `<tr><td class="m-row-label">${em} ${cl}</td>`;
    elems.forEach(e => {
      const val = matrix[cl][e];
      const pct = total ? Math.round(val/total*100) : 0;
      const intensity = val / rowMax;
      const bg = val > 0 ? `rgba(200,168,75,${(intensity*0.42).toFixed(2)})` : '';
      const textColor = pct > 60 ? 'var(--gold-bright)' : pct > 30 ? 'var(--gold-main)' : pct > 0 ? 'var(--text-300)' : 'var(--text-500)';
      html += `<td style="background:${bg};color:${textColor}" title="${val} builds (${pct}%)">`;
      html += val > 0 ? `${val}<small style="opacity:.55;font-size:.62em"> ${pct}%</small>` : `<span style="opacity:.2">—</span>`;
      html += '</td>';
    });
    html += `<td class="m-total">${fmt(total)}</td></tr>`;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

/* ════════════════════════════════════════════════
   MAIN RENDER + FILE HANDLING + AUTO-LOAD
════════════════════════════════════════════════ */
function render(data, filename) {
  allItems = data.items || [];

  document.getElementById('stats-dumpChip').innerHTML =
    `<b>${filename}</b> · ${fmt(allItems.length)} builds · ${(data.scraped_at||'').slice(0,10)}`;

  resetFilters();
  renderFilterSetup();
  applyFilters();

  document.getElementById('stats-loadScreen').classList.add('hidden');
  document.getElementById('stats-content').classList.add('on');

  /* notifier le module Analyse Item */
  itemMetaInit();
}

function loadFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    try { render(JSON.parse(e.target.result), file.name); }
    catch { alert('Fichier JSON invalide ou corrompu.'); }
  };
  r.readAsText(file);
}

document.getElementById('stats-fileInput')      .addEventListener('change', e => loadFile(e.target.files[0]));
document.getElementById('stats-fileInputChange').addEventListener('change', e => loadFile(e.target.files[0]));
document.getElementById('stats-btnChange')      .addEventListener('click',  () => document.getElementById('stats-fileInputChange').click());

const statsFileDrop = document.getElementById('stats-fileDrop');
statsFileDrop.addEventListener('dragover',  e => { e.preventDefault(); statsFileDrop.style.borderColor = C.goldMain; });
statsFileDrop.addEventListener('dragleave', () => { statsFileDrop.style.borderColor = ''; });
statsFileDrop.addEventListener('drop', e => {
  e.preventDefault(); statsFileDrop.style.borderColor = '';
  loadFile(e.dataTransfer.files[0]);
});

async function autoLoad() {
  const spin  = document.getElementById('stats-autoSpin');
  const msg   = document.getElementById('stats-autoMsg');
  const dates = [todayStr(), yesterdayStr()];

  for (const date of dates) {
    const name = `dump_${date}.json`;
    msg.textContent = name;
    try {
      const resp = await fetch(`./dumps/${name}`);
      if (resp.ok) { render(await resp.json(), name); return; }
    } catch(_) {}
  }

  spin.style.display = 'none';
  msg.textContent = 'Aucun dump trouvé automatiquement.';
  statsFileDrop.style.display = 'flex';
}

window.statsAutoLoad = autoLoad;

/* ════════════════════════════════════════════════
   ANALYSE ITEM — lookup d'un item dans le dump
════════════════════════════════════════════════ */
const imState = { index: new Map() };

/* Constantes de l'analyse */
const IM_LEVEL_TIERS = [
  { label: '≤ 100',   min:   0, max: 100 },
  { label: '101–130', min: 101, max: 130 },
  { label: '131–160', min: 131, max: 160 },
  { label: '161–180', min: 161, max: 180 },
  { label: '181–199', min: 181, max: 199 },
  { label: '200',     min: 200, max: 200 },
];
const IM_TYPO_COLORS = {
  'Do Pou':'#e05252', 'Tank':'#e09030', 'PP':'#9b59b6',
  'No Crit':'#4a9eff', 'Crit':'#f2d96a', 'Ret PM':'#7ec8a0',
  'Ret PA':'#52c472', 'Boost':'#c8a84b', 'Sustain':'#b8860b',
  'Standard':'#48404a',
};
const IM_TAG_COLORS = {
  terre:'#b8860b', eau:'#4a9eff', feu:'#ff6347', air:'#7ec8a0',
  multi:'#c8a84b', pp:'#9b59b6', doPou:'#e05252', tank:'#e09030',
};
const IM_SLOT_LABELS = {
  anneau_1:'Anneau 1', anneau_2:'Anneau 2', amulette:'Amulette',
  arme:'Arme', bottes:'Bottes', bouclier:'Bouclier', cape:'Cape',
  ceinture:'Ceinture', coiffe:'Coiffe',
  dofus_1:'Dofus 1', dofus_2:'Dofus 2', dofus_3:'Dofus 3',
  dofus_4:'Dofus 4', dofus_5:'Dofus 5', dofus_6:'Dofus 6',
  familier:'Familier',
};

/* ── Construire l'index nom → nb builds ── */
function itemMetaBuildIndex() {
  imState.index.clear();
  allItems.forEach(b => {
    Object.values(b.slots || {}).forEach(eq => {
      if (eq?.name) imState.index.set(eq.name, (imState.index.get(eq.name) || 0) + 1);
    });
  });
}

/* ── Dériver la typologie d'un build ── */
function imTypo(build) {
  const n = (build.name || '').toUpperCase();
  const t = build.tags || [];
  const r = [];
  if (t.includes('doPou'))                              r.push('Do Pou');
  if (t.includes('tank') || /\bTANK\b/.test(n))        r.push('Tank');
  if (t.includes('pp')   || /\bPP\b/.test(n))          r.push('PP');
  if (/NO[\s-]?CRIT|SANS[\s-]?CRIT/.test(n))           r.push('No Crit');
  else if (/\bCRIT\b/.test(n))                          r.push('Crit');
  if (/RET[\s-]?PM|RETRAIT[\s-]?PM/.test(n))           r.push('Ret PM');
  if (/RET[\s-]?PA|RETRAIT[\s-]?PA/.test(n))           r.push('Ret PA');
  if (/\bBOOST\b/.test(n))                             r.push('Boost');
  if (build.orientation === 'substain')                 r.push('Sustain');
  return r.length ? r : ['Standard'];
}

/* ── Initialiser le module (appelé après chargement dump) ── */
function itemMetaInit() {
  const noD  = document.getElementById('im-no-dump');
  const ready = document.getElementById('im-ready');
  if (!noD || !ready || !allItems.length) return;
  noD.style.display   = 'none';
  ready.style.display = '';
  itemMetaBuildIndex();
  imSetupSearch();
}
window.itemMetaInit = itemMetaInit;

/* ── Autocomplete depuis l'index ── */
function imSetupSearch() {
  const inp   = document.getElementById('im-input');
  const clear = document.getElementById('im-clear');
  const drop  = document.getElementById('im-drop');
  if (!inp || inp.dataset.imReady) return;
  inp.dataset.imReady = '1';

  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    clear.classList.toggle('vis', inp.value.length > 0);
    if (q.length < 2) { drop.classList.remove('open'); return; }

    const hits = [];
    for (const [name, count] of imState.index) {
      if (name.toLowerCase().includes(q)) hits.push({ name, count });
    }
    hits.sort((a, b) => b.count - a.count);
    const top = hits.slice(0, 12);

    if (!top.length) {
      drop.innerHTML = `<div class="drop-state">Aucun item trouvé pour « ${inp.value} »</div>`;
      drop.classList.add('open');
      return;
    }
    drop.innerHTML = top.map(h =>
      `<div class="drop-item" data-name="${h.name.replace(/"/g,'&quot;')}">
        <div>
          <div class="drop-name">${h.name}</div>
          <div class="drop-meta">Présent dans ${h.count} build${h.count > 1 ? 's' : ''}</div>
        </div>
        <span class="drop-lvl">${h.count}×</span>
      </div>`
    ).join('');
    drop.classList.add('open');

    drop.querySelectorAll('.drop-item').forEach(d => {
      d.addEventListener('click', () => {
        inp.value = d.dataset.name;
        clear.classList.add('vis');
        drop.classList.remove('open');
        imAnalyse(d.dataset.name);
      });
    });
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) {
      drop.classList.remove('open');
      imAnalyse(inp.value.trim());
    }
  });

  clear.addEventListener('click', () => {
    inp.value = ''; clear.classList.remove('vis'); drop.classList.remove('open');
    document.getElementById('im-results').innerHTML = imPlaceholder();
  });
}

function imPlaceholder() {
  return `<div class="placeholder" style="margin-top:2rem">
    <div class="placeholder-icon">🔎</div>
    <h3>Recherchez un item</h3>
    <p>Tapez le nom d'un équipement pour voir dans quels builds il apparaît,<br>
    quelles typologies l'utilisent et quelle tranche de level le requiert.</p>
  </div>`;
}

/* ── Analyse et rendu ── */
function imAnalyse(itemName) {
  const matches = allItems.filter(b =>
    Object.values(b.slots || {}).some(eq => eq?.name === itemName)
  );
  imRender(itemName, matches);
}

function imBar(label, count, total, color) {
  const w = total ? Math.round(count / total * 100) : 0;
  const bg  = color ? `background:${color}20;border-color:${color}60` : '';
  return `<div class="im-bar-row">
    <div class="im-bar-label">${label}</div>
    <div class="im-bar-track"><div class="im-bar-fill" style="width:${w}%;${bg}"></div></div>
    <div class="im-bar-count">${count} <span style="color:var(--text-500);font-size:.7rem">(${w}%)</span></div>
  </div>`;
}

function imRender(itemName, matches) {
  const wrap = document.getElementById('im-results');
  if (!wrap) return;
  const total = allItems.length;
  const n = matches.length;

  if (!n) {
    wrap.innerHTML = `<div class="placeholder" style="margin-top:1.5rem">
      <div class="placeholder-icon">📭</div>
      <h3>Non trouvé</h3>
      <p><strong>${itemName}</strong> n'apparaît dans aucun build du dump.</p>
    </div>`;
    return;
  }

  /* Slot distribution */
  const slotCnt = {};
  matches.forEach(b => {
    Object.entries(b.slots || {}).forEach(([s, eq]) => {
      if (eq?.name === itemName) slotCnt[s] = (slotCnt[s] || 0) + 1;
    });
  });
  const topSlot = Object.entries(slotCnt).sort((a,b) => b[1]-a[1])[0];

  /* Typologies */
  const typoCnt = {};
  matches.forEach(b => imTypo(b).forEach(t => { typoCnt[t] = (typoCnt[t]||0)+1; }));

  /* Tags / éléments */
  const tagCnt = {};
  matches.forEach(b => (b.tags||[]).forEach(t => { tagCnt[t] = (tagCnt[t]||0)+1; }));

  /* Level tiers */
  const tierCnt = {};
  IM_LEVEL_TIERS.forEach(t => { tierCnt[t.label] = 0; });
  matches.forEach(b => {
    const lvl = Number(b.level) || 0;
    const tier = IM_LEVEL_TIERS.find(t => lvl >= t.min && lvl <= t.max);
    if (tier) tierCnt[tier.label]++;
  });

  /* Classes */
  const classCnt = {};
  matches.forEach(b => { if (b.classe) classCnt[b.classe] = (classCnt[b.classe]||0)+1; });
  const sortedClasses = Object.entries(classCnt).sort((a,b) => b[1]-a[1]);

  /* Budget */
  const budCnt = { high:0, mid:0, low:0, 'N/A':0 };
  matches.forEach(b => { const k = b.budget||'N/A'; budCnt[k] = (budCnt[k]||0)+1; });

  /* Mode */
  const pvmN = matches.filter(b => b.mode === 'pvm').length;
  const pvpN = n - pvmN;

  wrap.innerHTML = `
    <!-- KPI bar -->
    <div class="im-kpis">
      <div class="im-kpi"><div class="im-kpi-val">${n}</div><div class="im-kpi-lbl">builds</div></div>
      <div class="im-kpi"><div class="im-kpi-val">${Math.round(n/total*100)}%</div><div class="im-kpi-lbl">du dump</div></div>
      <div class="im-kpi"><div class="im-kpi-val">${sortedClasses.length}</div><div class="im-kpi-lbl">classes</div></div>
      <div class="im-kpi">
        <div class="im-kpi-val">${pvmN >= pvpN ? pvmN : pvpN}</div>
        <div class="im-kpi-lbl">${pvmN >= pvpN ? 'PvM' : 'PvP'}</div>
      </div>
      <div class="im-kpi">
        <div class="im-kpi-val" style="font-size:.95rem">${topSlot ? (IM_SLOT_LABELS[topSlot[0]]||topSlot[0]) : '—'}</div>
        <div class="im-kpi-lbl">slot principal</div>
      </div>
    </div>

    <!-- Typologies + Tags -->
    <div class="im-row">
      <div class="card im-card">
        <div class="card-head"><span class="card-title">🏷️ Typologies</span></div>
        <div class="card-body">
          ${Object.entries(typoCnt).sort((a,b)=>b[1]-a[1]).map(([t,c]) =>
            imBar(t, c, n, IM_TYPO_COLORS[t])
          ).join('')}
        </div>
      </div>
      <div class="card im-card">
        <div class="card-head"><span class="card-title">🔮 Éléments / Rôles</span></div>
        <div class="card-body">
          ${Object.entries(tagCnt).sort((a,b)=>b[1]-a[1]).map(([t,c]) =>
            imBar(cap(t), c, n, IM_TAG_COLORS[t])
          ).join('')}
          ${!Object.keys(tagCnt).length ? '<div style="color:var(--text-500);font-size:.8rem">Aucun tag sur ces builds.</div>' : ''}
        </div>
      </div>
    </div>

    <!-- Niveaux + Classes -->
    <div class="im-row">
      <div class="card im-card">
        <div class="card-head"><span class="card-title">📈 Tranches de niveau</span></div>
        <div class="card-body">
          ${Object.entries(tierCnt).map(([t,c]) => imBar(t, c, n)).join('')}
        </div>
      </div>
      <div class="card im-card">
        <div class="card-head"><span class="card-title">⚔️ Classes</span></div>
        <div class="card-body">
          ${sortedClasses.slice(0, 10).map(([cl, c]) =>
            imBar(`${CLASS_EMOJI[cl]||'?'} ${cap(cl)}`, c, n)
          ).join('')}
          ${sortedClasses.length > 10 ? `<div class="im-more">+ ${sortedClasses.length - 10} autres classes</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Slots + Budget + Mode -->
    <div class="im-row-3">
      <div class="card im-card">
        <div class="card-head"><span class="card-title">🗂️ Slots utilisés</span></div>
        <div class="card-body">
          <div class="im-slots-grid">
            ${Object.entries(slotCnt).sort((a,b)=>b[1]-a[1]).map(([s,c]) =>
              `<div class="im-slot-chip">
                <span class="im-slot-name">${IM_SLOT_LABELS[s]||s}</span>
                <span class="im-slot-cnt">${c}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="card im-card">
        <div class="card-head"><span class="card-title">💰 Budget</span></div>
        <div class="card-body">
          ${[['high','Premium','var(--gold-bright)'],['mid','Medium','var(--gold-main)'],['low','Low Cost','var(--gold-muted)'],['N/A','N/A','var(--text-500)']].map(
            ([k,l,col]) => imBar(`<span style="color:${col}">${l}</span>`, budCnt[k]||0, n, col)
          ).join('')}
        </div>
      </div>
      <div class="card im-card">
        <div class="card-head"><span class="card-title">⚡ Mode de jeu</span></div>
        <div class="card-body im-pvm-body">
          <div class="im-pvm-row">
            <div style="color:var(--green);width:32px">PvM</div>
            <div class="im-pvm-bar-wrap"><div class="im-pvm-bar" style="width:${Math.round(pvmN/n*100)}%;background:var(--green)"></div></div>
            <div style="font-size:.78rem">${pvmN} (${Math.round(pvmN/n*100)}%)</div>
          </div>
          <div class="im-pvm-row">
            <div style="color:var(--red);width:32px">PvP</div>
            <div class="im-pvm-bar-wrap"><div class="im-pvm-bar" style="width:${Math.round(pvpN/n*100)}%;background:var(--red)"></div></div>
            <div style="font-size:.78rem">${pvpN} (${Math.round(pvpN/n*100)}%)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste des builds -->
    <div class="card">
      <div class="card-head">
        <span class="card-title">📋 Builds utilisant cet item</span>
        <span style="font-size:.72rem;color:var(--text-500);margin-left:.5rem">${n > 50 ? `50 / ${n} affichés` : n}</span>
      </div>
      <div class="overflow-x">
        <table class="tbl">
          <thead><tr>
            <th>Classe</th><th>Nom du build</th>
            <th class="tc">Niv.</th><th class="tc">Mode</th>
            <th class="tc">Budget</th><th>Tags</th><th class="tc">Lien</th>
          </tr></thead>
          <tbody>
            ${matches.slice(0, 50).map(b => `
              <tr>
                <td style="white-space:nowrap">${CLASS_EMOJI[b.classe]||'?'} ${cap(b.classe)}</td>
                <td class="im-build-name" title="${(b.name||'').replace(/"/g,'&quot;')}">${b.name||'—'}</td>
                <td class="tc">${b.level||'—'}</td>
                <td class="tc"><span class="badge${b.mode==='pvp'?' im-badge-pvp':''}">${(b.mode||'—').toUpperCase()}</span></td>
                <td class="tc" style="color:var(--text-300);font-size:.76rem">${b.budget ? cap(b.budget) : '—'}</td>
                <td>${(b.tags||[]).map(t=>`<span class="im-tag" style="color:${IM_TAG_COLORS[t]||'var(--text-300)'}">${cap(t)}</span>`).join(' ')}</td>
                <td class="tc">${b.link ? `<a href="${b.link}" target="_blank" rel="noopener" class="im-link">↗</a>` : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${n > 50 ? `<div class="im-more">… et ${n-50} builds supplémentaires</div>` : ''}
    </div>`;
}
