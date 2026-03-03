/* ============================================================
   ÉLEVAGE — Refonte 3.5
   Arbre généalogique, calculateur de générations & probabilités
============================================================ */

// ─── Données espèces ──────────────────────────────────────────────────────────

const ELV_SPECIES = [
  { id: 'dragodinde', name: 'Dragodinde', emoji: '🦕', img: 'assets/img/elevage/tuto3i7dragos_orig.png' },
  { id: 'muldo',      name: 'Muldo',      emoji: '🦏', img: 'assets/img/elevage/tuto3i8muldos_orig.png' },
  { id: 'volkorne',   name: 'Volkorne',   emoji: '🐉', img: 'assets/img/elevage/tuto3i9volkornes_orig.png' },
];

// ─── Données montures par espèce ──────────────────────────────────────────────

// gen : génération confirmée par le guide DPLN ; null = non documentée dans le guide texte
const ELV_MOUNTS = {
  dragodinde: [
    { id: 'orchidee',        name: 'Dragodinde Orchidée',         short: 'Orchidée',       color: '#d87cff', bg: '#2d0a42', gen: 1,    capture: true  },
    { id: 'ivoire',          name: 'Dragodinde Ivoire',           short: 'Ivoire',         color: '#fffde7', bg: '#2a2a18', gen: 1,    capture: true  },
    { id: 'doree',           name: 'Dragodinde Dorée',            short: 'Dorée',          color: '#ffd700', bg: '#3a2800', gen: null, capture: false },
    { id: 'indigo',          name: 'Dragodinde Indigo',           short: 'Indigo',         color: '#7986ff', bg: '#0d0d40', gen: null, capture: false },
    { id: 'rousse',          name: 'Dragodinde Rousse',           short: 'Rousse',         color: '#ff7043', bg: '#3a1000', gen: null, capture: false },
    { id: 'prune',           name: 'Dragodinde Prune',            short: 'Prune',          color: '#ba68c8', bg: '#250030', gen: null, capture: false },
    { id: 'creme',           name: 'Dragodinde Crème',            short: 'Crème',          color: '#ffcc80', bg: '#2a1800', gen: null, capture: false },
    { id: 'turquoise',       name: 'Dragodinde Turquoise',        short: 'Turquoise',      color: '#1de9b6', bg: '#003328', gen: null, capture: false },
    { id: 'pourpre',         name: 'Dragodinde Pourpre',          short: 'Pourpre',        color: '#d87cff', bg: '#1e0028', gen: 5,    capture: false },
    { id: 'ebene-orchidee',  name: 'Dragodinde Ébène et Orchidée',short: 'Ébène & Orchidée',color: '#90a4ae', bg: '#111c22', gen: 6,    capture: false },
    { id: 'ivoire-turquoise',name: 'Dragodinde Ivoire et Turquoise', short: 'Ivoire & Turquoise', color: '#b2dfdb', bg: '#00201e', gen: 8, capture: false },
    { id: 'ivoire-pourpre',  name: 'Dragodinde Ivoire et Pourpre', short: 'Ivoire & Pourpre',  color: '#e1bee7', bg: '#1e0028', gen: 8,    capture: false },
    { id: 'emeraude',        name: 'Dragodinde Émeraude',         short: 'Émeraude',       color: '#3ddc84', bg: '#003820', gen: 9,    capture: false },
    { id: 'emeraude-ivoire', name: 'Dragodinde Émeraude et Ivoire', short: 'Émeraude & Ivoire', color: '#b9f6ca', bg: '#0a2012', gen: 10, capture: false },
  ],
  muldo: [
    { id: 'muldo-dore',         name: 'Muldo Doré',            short: 'Doré',          color: '#ffd700', bg: '#3a2800', gen: 1,    capture: true  },
    { id: 'muldo-orchidee',     name: 'Muldo Orchidée',        short: 'Orchidée',      color: '#d87cff', bg: '#2d0a42', gen: 1,    capture: true  },
    { id: 'muldo-dore-orchidee',name: 'Muldo Doré et Orchidée',short: 'Doré & Orchidée',color: '#f3e5f5', bg: '#1a0028', gen: 2,    capture: false },
    { id: 'muldo-dore-indigo',  name: 'Muldo Doré et Indigo',  short: 'Doré & Indigo', color: '#a5d6a7', bg: '#0a2012', gen: 2,    capture: false },
    { id: 'muldo-indigo',       name: 'Muldo Indigo',          short: 'Indigo',        color: '#7986ff', bg: '#0d0d40', gen: null, capture: false },
    { id: 'muldo-pourpre',      name: 'Muldo Pourpre',         short: 'Pourpre',       color: '#ce93d8', bg: '#250030', gen: null, capture: false },
    { id: 'muldo-ebene',        name: 'Muldo Ébène',           short: 'Ébène',         color: '#78909c', bg: '#111c22', gen: null, capture: false },
    { id: 'muldo-corail',       name: 'Muldo Corail',          short: 'Corail',        color: '#ff8a65', bg: '#3a1000', gen: 9,    capture: false },
  ],
  volkorne: [
    { id: 'volk-celeste',   name: 'Volkorne Céleste',   short: 'Céleste',   color: '#81d4fa', bg: '#00141a', gen: null, capture: false },
    { id: 'volk-corail',    name: 'Volkorne Corail',    short: 'Corail',    color: '#ef9a9a', bg: '#2a0000', gen: null, capture: false },
    { id: 'volk-emeraude',  name: 'Volkorne Émeraude',  short: 'Émeraude',  color: '#80cbc4', bg: '#00201e', gen: null, capture: false },
    { id: 'volk-ambre',     name: 'Volkorne Ambre',     short: 'Ambre',     color: '#ffcc80', bg: '#2a1800', gen: null, capture: false },
    { id: 'volk-nebuleux',  name: 'Volkorne Nébuleux',  short: 'Nébuleux',  color: '#ce93d8', bg: '#200028', gen: null, capture: false },
    { id: 'volk-cramoisi',  name: 'Volkorne Cramoisi',  short: 'Cramoisi',  color: '#e57373', bg: '#2a0000', gen: null, capture: false },
  ],
};

const ELV_MAX_GEN   = 10;
const ELV_MAX_NODES = 8;

// Multiplicateurs de stats estimés par génération (relatif à Gen 1)
const ELV_STAT_MULT = { 1:1.0, 2:1.15, 3:1.32, 4:1.52, 5:1.75, 6:2.0, 7:2.3, 8:2.65, 9:3.05, 10:3.5 };

// ─── État ─────────────────────────────────────────────────────────────────────

let elvSpecies    = 'dragodinde';
let elvMount      = ELV_MOUNTS.dragodinde[0];
let elvTargetGen  = 3;
let elvView       = 'tree';
let elvP1Level    = 1;
let elvP2Level    = 1;
let elvOpti       = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elvCount(targetGen, gen) {
  if (gen > targetGen) return 0;
  if (gen === targetGen) return 1;
  return Math.pow(2, targetGen - gen);
}

function elvFmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function elvDimColor(hex, ratio) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const f = 0.25 + ratio * 0.75;
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function elvAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function elvMountSVG(color, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="14.5" rx="5.5" ry="5" fill="${color}" opacity=".9"/>
    <ellipse cx="12" cy="8" rx="3.8" ry="3.8" fill="${color}"/>
    <path d="M10 5.5 L12 2 L14 5.5" fill="${color}"/>
    <line x1="9.5" y1="19" x2="8.5" y2="22.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14.5" y1="19" x2="15.5" y2="22.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="10.5" cy="7.5" r="1" fill="#08080f"/>
  </svg>`;
}

function elvCalcProb() {
  const base   = 30;
  const levels = (elvP1Level + elvP2Level) * 0.15;
  const opti   = elvOpti ? 10 : 0;
  return Math.min(100, base + levels + opti);
}

// ─── Rendu : sélecteur d'espèce ───────────────────────────────────────────────

function elvRenderSpecies() {
  const wrap = document.getElementById('elv-species-tabs');
  if (!wrap) return;
  wrap.innerHTML = ELV_SPECIES.map(s => `
    <button
      class="elv-species-btn ${s.id === elvSpecies ? 'active' : ''}"
      data-species="${s.id}"
    >${s.emoji} ${s.name}</button>
  `).join('');

  wrap.querySelectorAll('.elv-species-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elvSpecies = btn.dataset.species;
      elvMount   = ELV_MOUNTS[elvSpecies][0];
      elvRender();
    });
  });
}

// ─── Rendu : grille de montures ───────────────────────────────────────────────

function elvRenderMountGrid() {
  const grid = document.getElementById('elv-mount-grid');
  if (!grid) return;
  const mounts = ELV_MOUNTS[elvSpecies];
  grid.innerHTML = mounts.map(m => {
    const genLabel = m.gen != null
      ? `<span class="elv-mount-gen" style="color:${m.gen === 1 ? '#a8e07a' : m.gen >= 9 ? 'var(--gold-bright)' : 'var(--text-500)'}">G${m.gen}${m.capture ? '⚡' : ''}</span>`
      : `<span class="elv-mount-gen" style="color:#48404a">G?</span>`;
    return `<button
      class="elv-mount-btn ${m.id === elvMount.id ? 'active' : ''}"
      data-mount="${m.id}"
      title="${m.name}${m.gen != null ? ` — Génération ${m.gen}` : ''}${m.capture ? ' (capturable)' : ''}"
      style="${m.id === elvMount.id ? `border-color:${m.color};background:${m.bg}` : ''}"
    >
      ${elvMountSVG(m.color, 18)}
      <span class="elv-mount-name">${m.short}</span>
      ${genLabel}
    </button>`;
  }).join('');

  grid.querySelectorAll('.elv-mount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elvMount = ELV_MOUNTS[elvSpecies].find(m => m.id === btn.dataset.mount) || ELV_MOUNTS[elvSpecies][0];
      elvRender();
    });
  });
}

// ─── Rendu : affichage génération ─────────────────────────────────────────────

function elvRenderGenDisplay() {
  const numEl  = document.getElementById('elv-gen-number');
  const infoEl = document.getElementById('elv-gen-info');
  const minBtn = document.getElementById('elv-gen-minus');
  const maxBtn = document.getElementById('elv-gen-plus');
  if (!numEl) return;

  const total = elvCount(elvTargetGen, 1);

  numEl.textContent  = `Gen ${elvTargetGen}`;
  numEl.style.color  = elvMount.color;
  numEl.style.textShadow = `0 0 18px ${elvAlpha(elvMount.color, 0.4)}`;

  infoEl.textContent = elvTargetGen === 1
    ? 'Monture de base — aucun ancêtre requis'
    : `${elvFmt(total)} Gen 1 requises dans l'arbre (parents stériles après accouplement)`;

  minBtn.disabled = elvTargetGen <= 1;
  maxBtn.disabled = elvTargetGen >= ELV_MAX_GEN;
}

// ─── Rendu : dots de génération ───────────────────────────────────────────────

function elvRenderGenDots() {
  const wrap = document.getElementById('elv-gen-dots');
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: ELV_MAX_GEN }, (_, i) => i + 1).map(g => {
    const isActive  = g === elvTargetGen;
    const isPassed  = g < elvTargetGen;
    const style     = isActive ? `background:${elvMount.color};border-color:${elvMount.color};color:#08080f;box-shadow:0 0 8px ${elvMount.color}` : '';
    return `<button
      class="elv-gen-dot ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}"
      data-gen="${g}"
      style="${style}"
      title="Gen ${g}"
    >${g}</button>`;
  }).join('');

  wrap.querySelectorAll('.elv-gen-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      elvTargetGen = parseInt(btn.dataset.gen);
      elvRender();
    });
  });
}

// ─── Rendu : arbre généalogique ───────────────────────────────────────────────

function elvRenderTree() {
  const container = document.getElementById('elv-tree');
  if (!container) return;

  const levels = Array.from({ length: elvTargetGen }, (_, i) => elvTargetGen - i);
  let html = '';

  levels.forEach((gen, idx) => {
    const isTarget = gen === elvTargetGen;
    const isBase   = gen === 1;
    const count    = elvCount(elvTargetGen, gen);
    const visible  = Math.min(count, ELV_MAX_NODES);
    const hidden   = count - visible;
    const fraction = gen / elvTargetGen;
    const nodeColor = isTarget ? elvMount.color : elvDimColor(elvMount.color, fraction * 0.85);
    const levelBg  = isTarget ? `background:${elvMount.bg};border:1px solid ${elvAlpha(elvMount.color, 0.35)}` : '';

    let nodes = '';
    for (let i = 0; i < visible; i++) {
      nodes += `<div class="elv-node ${isTarget ? 'target' : ''}" style="border-color:${nodeColor};${isTarget ? `background:${elvMount.bg};box-shadow:0 0 8px ${elvAlpha(elvMount.color,0.3)}` : ''}">
        ${elvMountSVG(nodeColor, isTarget ? 18 : 13)}
      </div>`;
    }
    if (hidden > 0) {
      nodes += `<div class="elv-node overflow">
        <span style="color:#48404a;font-size:.7rem;font-weight:700">+${elvFmt(hidden)}</span>
      </div>`;
    }

    html += `
      <div class="elv-level ${isTarget ? 'target' : ''}" style="${levelBg}">
        <div class="elv-level-label">
          <span class="elv-gen-tag" style="color:${isTarget ? elvMount.color : '#7a6228'};border-color:${isTarget ? elvAlpha(elvMount.color,0.4) : 'rgba(80,60,40,.35)'}">
            Gen ${gen}
          </span>
          ${isTarget ? '<span class="elv-badge target-badge">🎯 Objectif</span>' : ''}
          ${isBase && !isTarget ? '<span class="elv-badge base-badge">Capture</span>' : ''}
        </div>
        <div class="elv-nodes">${nodes}</div>
        <div class="elv-count" style="color:${isTarget ? elvMount.color : '#7a6228'}">
          ×${elvFmt(count)}
        </div>
      </div>`;

    if (idx < levels.length - 1) {
      html += `<div class="elv-connector">
        <div class="elv-connector-line" style="border-color:${elvAlpha(elvMount.color, 0.15)}"></div>
        <span style="color:${elvAlpha(elvMount.color, 0.35)};font-size:.7rem">▼</span>
        <div class="elv-connector-line" style="border-color:${elvAlpha(elvMount.color, 0.15)}"></div>
      </div>`;
    }
  });

  if (elvTargetGen === 1) {
    html = `<div class="elv-empty">Gen 1 — monture de base, se capture dans le monde. Aucun ancêtre requis.</div>`;
  }

  container.innerHTML = html;
}

// ─── Rendu : tableau récapitulatif ────────────────────────────────────────────

function elvRenderTable() {
  const wrap    = document.getElementById('elv-table-wrap');
  const totalEl = document.getElementById('elv-total-row');
  if (!wrap) return;

  const rows = Array.from({ length: elvTargetGen }, (_, i) => elvTargetGen - i);
  const totalGen1 = elvCount(elvTargetGen, 1);

  const tableRows = rows.map(gen => {
    const isTarget = gen === elvTargetGen;
    const count    = elvCount(elvTargetGen, gen);
    const mult     = ELV_STAT_MULT[gen] ?? 1.0;
    const role     = isTarget
      ? 'Objectif final'
      : gen === 1
      ? 'À capturer (stériles après usage)'
      : `Intermédiaires — parent des Gen ${gen + 1}`;

    const rowStyle = isTarget
      ? `style="background:${elvAlpha(elvMount.color, 0.07)};outline:1px solid ${elvAlpha(elvMount.color, 0.2)}"`
      : '';

    return `<tr ${rowStyle}>
      <td>
        <span class="elv-gen-tag" style="color:${isTarget ? elvMount.color : '#7a6228'};border-color:${isTarget ? elvAlpha(elvMount.color,0.4) : 'rgba(80,60,40,.35)'}">
          Gen ${gen}
        </span>
        ${isTarget ? ' 🎯' : ''}
      </td>
      <td style="color:${isTarget ? elvMount.color : '#f5e8c8'};font-weight:${isTarget ? '700' : '400'}">
        ${elvFmt(count)} monture${count > 1 ? 's' : ''}
      </td>
      <td style="color:#52c472;font-size:.85rem">×${mult.toFixed(2)}</td>
      <td style="color:#48404a;font-size:.82rem">${role}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="elv-table">
      <thead>
        <tr>
          <th>Génération</th>
          <th>Montures requises</th>
          <th>Bonus stats est.</th>
          <th>Rôle</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  totalEl.innerHTML = `
    <div class="elv-total-card" style="border-color:${elvAlpha(elvMount.color, 0.4)}">
      <span class="elv-total-label">Gen 1 nécessaires (arbre complet)</span>
      <span class="elv-total-value" style="color:${elvMount.color}">
        ${elvFmt(totalGen1)} monture${totalGen1 > 1 ? 's' : ''}
      </span>
    </div>
    <div class="elv-sterile-note">
      ⚠️ Les parents deviennent <strong>stériles</strong> après un accouplement — ils ne peuvent pas être réutilisés.
      Le <strong>clonage</strong> (2 montures → 1 fertile) est le seul moyen d'en récupérer une fertile.
    </div>`;
}

// ─── Rendu : calculateur de probabilité génération cible ──────────────────────

function elvRenderProbCalc() {
  const el = document.getElementById('elv-prob-result');
  if (!el) return;

  const prob = elvCalcProb();
  const bar  = document.getElementById('elv-prob-bar');
  if (bar) {
    bar.style.width = prob.toFixed(1) + '%';
    bar.style.background = prob >= 90 ? '#52c472' : prob >= 60 ? elvMount.color : '#ff7043';
  }
  el.textContent = prob.toFixed(2) + '%';
  el.style.color  = prob >= 90 ? '#52c472' : prob >= 60 ? elvMount.color : '#ff7043';
}

// ─── Rendu global ─────────────────────────────────────────────────────────────

function elvRender() {
  elvRenderSpecies();
  elvRenderMountGrid();
  elvRenderGenDisplay();
  elvRenderGenDots();
  if (elvView === 'tree') {
    elvRenderTree();
  } else {
    elvRenderTable();
  }
  elvRenderProbCalc();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Boutons +/-
  document.getElementById('elv-gen-minus')?.addEventListener('click', () => {
    if (elvTargetGen > 1) { elvTargetGen--; elvRender(); }
  });
  document.getElementById('elv-gen-plus')?.addEventListener('click', () => {
    if (elvTargetGen < ELV_MAX_GEN) { elvTargetGen++; elvRender(); }
  });

  // Toggle vue
  document.getElementById('elv-view-toggle')?.querySelectorAll('.elv-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elvView = btn.dataset.view;
      document.querySelectorAll('.elv-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('elv-panel-tree').style.display  = elvView === 'tree'  ? '' : 'none';
      document.getElementById('elv-panel-table').style.display = elvView === 'table' ? '' : 'none';
      elvRender();
    });
  });

  // Calculateur probabilité — niveaux parents
  document.getElementById('elv-p1-input')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (!isNaN(v)) {
      elvP1Level = Math.max(1, Math.min(200, v));
      document.getElementById('elv-p1-val').textContent = 'Niv. ' + elvP1Level;
    }
    elvRenderProbCalc();
  });
  document.getElementById('elv-p2-input')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (!isNaN(v)) {
      elvP2Level = Math.max(1, Math.min(200, v));
      document.getElementById('elv-p2-val').textContent = 'Niv. ' + elvP2Level;
    }
    elvRenderProbCalc();
  });

  // Optimakina checkbox
  document.getElementById('elv-opti-check')?.addEventListener('change', e => {
    elvOpti = e.target.checked;
    elvRenderProbCalc();
  });

  // Premier rendu
  elvRender();
});
