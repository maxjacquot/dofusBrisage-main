'use strict';

/* ================================================================
   ██████  CRAFT MODULE
================================================================ */
let craftState = { item: null, ingredients: [] };

makeSearch({
  inputId: 'craft-search', clearId: 'craft-clear', dropId: 'craft-drop',
  fetchFn: searchEquipment,
  onPick: async item => {
    craftLoading();
    try {
      const detail = await getEquipment(item.ankama_id);
      await buildCraft(detail);
    } catch (e) {
      craftError('Impossible de charger cet item. (' + e.message + ')');
    }
  }
});

function craftLoading() {
  $('craft-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon"><span class="spin" style="width:36px;height:36px;border-width:3px"></span></div><h3>Chargement…</h3></div>`;
}
function craftError(msg) {
  $('craft-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon">⚠️</div><h3>Erreur</h3><p>${msg}</p></div>`;
}

async function buildCraft(item) {
  craftState.item = item;
  const recipe = item.recipe;

  if (!recipe || !recipe.length) {
    $('craft-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon">📦</div><h3>Pas de recette</h3><p>Cet item n'a pas de recette de craft connue.</p></div>`;
    return;
  }

  const ingredients = await Promise.all(recipe.map(async r => {
    const rid     = r.item_ankama_id ?? r.ankama_id;
    const subtype = r.item_subtype   ?? r.subtype ?? '';
    let name = r.name || `#${rid}`;
    let img  = r.image_urls?.icon || '';
    if (!r.name) {
      const d = await getAnyItem(rid, subtype);
      if (d) { name = d.name || name; img = d.image_urls?.icon || img; }
    }
    return { id: rid, name, qty: r.quantity || 1, img, price: 0 };
  }));

  craftState.ingredients = ingredients;
  renderCraft();
}

function renderCraft() {
  const { item, ingredients } = craftState;
  const ico = item.image_urls?.icon || '';

  $('craft-content').innerHTML = `
    <div class="item-head">
      ${ico ? `<img src="${ico}" class="item-img" alt="">` : '<div class="item-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem">📦</div>'}
      <div>
        <div class="item-name">${item.name}</div>
        <div class="item-meta">Niveau ${item.level ?? '?'}${item.type?.name ? `<span class="badge">${item.type.name}</span>` : ''}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">🧪 Ingrédients de craft</span>
        <button class="btn-sm imagiro-btn" id="craft-autoprice-btn">💹 Prix auto HDV</button>
      </div>
      <div class="overflow-x">
        <table class="tbl" id="craft-tbl">
          <thead>
            <tr>
              <th>Ingrédient</th>
              <th class="tc">Qté</th>
              <th class="tr">Prix unitaire (kamas)</th>
              <th class="tr">Sous-total (kamas)</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map((r, i) => `
              <tr>
                <td>
                  <div class="ing-wrap">
                    ${r.img ? `<img src="${r.img}" class="ing-ico" alt="" onerror="this.style.display='none'">` : ''}
                    <span>${r.name}</span>
                  </div>
                </td>
                <td class="tc"><span class="ing-qty">×${r.qty}</span></td>
                <td class="tr">
                  <input type="number" class="inp-price" min="0" step="1"
                         data-idx="${i}" data-qty="${r.qty}" placeholder="0">
                </td>
                <td class="subtotal" id="csub-${i}">—</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="sell-row">
      <label>💰 Prix de vente HDV visé (kamas)</label>
      <div class="sell-row-inputs">
        <input type="number" class="inp-sell" id="craft-sell" min="0" step="1" placeholder="0">
        <button class="btn-sm imagiro-btn" id="craft-autosell-btn" title="Récupérer le prix HDV de l'item crafté">🏪 Prix HDV</button>
      </div>
      <span id="craft-price-stamp" class="price-stamp"></span>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">📊 Analyse de rentabilité</span></div>
      <div class="card-body">
        <div class="sum-grid">
          <div class="sum-stat hl">
            <div class="sum-label">Coût de revient</div>
            <div class="sum-val gold" id="c-cost">0 kamas</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Prix de vente</div>
            <div class="sum-val" id="c-sell">—</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Taxe HDV (2 %)</div>
            <div class="sum-val" id="c-tax">—</div>
          </div>
          <div class="sum-stat" id="c-margin-card">
            <div class="sum-label">Marge nette</div>
            <div class="sum-val" id="c-margin">—</div>
          </div>
        </div>
      </div>
    </div>

    <div class="craft-obj-save-row">
      <span>📌</span>
      <span style="font-size:.82rem;color:var(--text-300)">Créer un objectif de craft</span>
      <input type="number" id="craft-target-qty" value="10" min="1" step="1" title="Quantité cible">
      <span style="font-size:.75rem;color:var(--text-500)">unités</span>
      <button class="btn" id="craft-save-obj-btn">Enregistrer</button>
    </div>
  `;

  document.querySelectorAll('.inp-price[data-idx]').forEach(inp =>
    inp.addEventListener('input', calcCraft));
  $('craft-sell').addEventListener('input', calcCraft);
  $('craft-save-obj-btn').addEventListener('click', () =>
    craftCreateObjective(+$('craft-target-qty').value || 1));
  $('craft-autoprice-btn').addEventListener('click', craftAutoPrice);
  $('craft-autosell-btn').addEventListener('click', craftAutoSell);
}

function calcCraft() {
  let cost = 0;
  document.querySelectorAll('.inp-price[data-idx]').forEach(inp => {
    const i     = +inp.dataset.idx;
    const qty   = +inp.dataset.qty;
    const price = +inp.value || 0;
    craftState.ingredients[i].price = price;
    const sub = price * qty;
    cost += sub;
    const cell = $(`csub-${i}`);
    if (cell) cell.textContent = fmtKa(sub);
  });

  const sell = +$('craft-sell').value || 0;
  const tax  = sell * TAX;
  const net  = sell - tax - cost;

  $('c-cost').textContent = fmtKa(cost);
  $('c-sell').textContent = sell ? fmtKa(sell) : '—';
  $('c-tax').textContent  = sell ? fmtKa(tax)  : '—';

  const mEl   = $('c-margin');
  const mCard = $('c-margin-card');
  if (sell) {
    mEl.textContent = (net >= 0 ? '+' : '') + fmtKa(net);
    mEl.className   = 'sum-val ' + (net >= 0 ? 'green' : 'red');
    mCard.className = 'sum-stat ' + (net >= 0 ? 'pos' : 'neg');
  } else {
    mEl.textContent = '—'; mEl.className = 'sum-val'; mCard.className = 'sum-stat';
  }
  craftPersist();
}

/* ================================================================
   ██████  CRAFT — PRIX AUTO (imagiro.laboubourse.com)
================================================================ */

/** Formate la date d'une entrée imagiro en label lisible */
function fmtPriceDate(inserted_at) {
  if (!inserted_at) return '';
  const d = new Date(inserted_at);
  const now = new Date();
  const diffH = Math.round((now - d) / 3_600_000);
  if (diffH < 1)  return 'il y a < 1h';
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD}j`;
}

/**
 * Remplit automatiquement les prix des ingrédients
 * via l'API imagiro (prix×1 = prix unitaire HDV).
 */
async function craftAutoPrice() {
  const btn = $('craft-autoprice-btn');
  if (!btn || !craftState.ingredients.length) return;

  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Chargement…';

  const ids    = craftState.ingredients.map(r => r.id);
  const prices = await getItemPrices(ids);

  if (!prices.length) {
    btn.textContent = '⚠️ Indispo';
    setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 3000);
    const stamp = $('craft-price-stamp');
    if (stamp) stamp.innerHTML =
      '⚠️ Proxy imagiro inaccessible — ' +
      'lancez <code style="background:var(--bg-elevated);padding:.05rem .3rem;border-radius:4px">' +
      'node proxy.js CF_CLEARANCE AUTH_TOKEN</code> ' +
      '(cf_clearance dans DevTools → Application → Cookies sur imagiro.laboubourse.com)';
    return;
  }

  const priceMap = new Map(prices.map(p => [+p.item_id, p]));
  let filled = 0;
  let lastDate = '';

  craftState.ingredients.forEach((ing, i) => {
    const p = priceMap.get(+ing.id);
    if (!p) return;
    const unitPrice = p.price_1 || 0;
    const inp = document.querySelector(`.inp-price[data-idx="${i}"]`);
    if (inp) { inp.value = unitPrice; ing.price = unitPrice; filled++; }
    if (!lastDate && p.inserted_at) lastDate = p.inserted_at;
  });

  calcCraft();

  const stamp = $('craft-price-stamp');
  if (stamp && lastDate) {
    stamp.textContent = `📡 imagiro · ${fmtPriceDate(lastDate)} · ${filled}/${ids.length} prix chargés`;
  }

  btn.textContent = `✓ ${filled} prix chargés`;
  setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 2500);
}

/**
 * Remplit le prix de vente HDV visé avec le prix
 * de l'item crafté sur l'HDV (price_1 imagiro).
 */
async function craftAutoSell() {
  const btn = $('craft-autosell-btn');
  if (!btn || !craftState.item) return;

  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳…';

  const itemId = craftState.item.ankama_id;
  const prices = await getItemPrices([itemId]);

  if (!prices.length) {
    btn.textContent = '⚠️ Indispo';
    setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 3000);
    return;
  }

  const p = prices.find(x => +x.item_id === +itemId) || prices[0];
  const unitPrice = p.price_1 || 0;
  const sellInp = $('craft-sell');
  if (sellInp) { sellInp.value = unitPrice; }
  calcCraft();

  const stamp = $('craft-price-stamp');
  if (stamp && p.inserted_at) {
    stamp.textContent = `📡 imagiro · ${fmtPriceDate(p.inserted_at)} · prix ×1 HDV`;
  }

  btn.textContent = '✓';
  setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 2000);
}

/* ================================================================
   ██████  CRAFT — PERSISTENCE + OBJECTIFS + HISTORIQUE
================================================================ */
const CRAFT_SAVE_KEY = 'dofus_craft_save';
const CRAFT_OBJ_KEY  = 'dofus_craft_objs';
const CRAFT_HIST_KEY = 'dofus_craft_hist';
const craftDB = {
  getSave : () => JSON.parse(localStorage.getItem(CRAFT_SAVE_KEY) || 'null'),
  putSave : d  => localStorage.setItem(CRAFT_SAVE_KEY, JSON.stringify(d)),
  getObjs : () => JSON.parse(localStorage.getItem(CRAFT_OBJ_KEY)  || '[]'),
  putObjs : d  => localStorage.setItem(CRAFT_OBJ_KEY,  JSON.stringify(d)),
  getHist : () => JSON.parse(localStorage.getItem(CRAFT_HIST_KEY) || '[]'),
  putHist : d  => localStorage.setItem(CRAFT_HIST_KEY, JSON.stringify(d)),
};

/* ── Sauvegarder l'état courant ─────────── */
function craftPersist() {
  if (!craftState.item) return;
  craftDB.putSave({
    item: craftState.item,
    ingredients: craftState.ingredients,
    sell: +($('craft-sell')?.value) || 0,
  });
}

/* ── Restaurer au chargement ────────────── */
function craftRestoreState() {
  const saved = craftDB.getSave();
  if (!saved?.item) return;
  craftState.item        = saved.item;
  craftState.ingredients = saved.ingredients;
  renderCraft();
  saved.ingredients.forEach((ing, i) => {
    const inp = document.querySelector(`.inp-price[data-idx="${i}"]`);
    if (inp) inp.value = ing.price || 0;
  });
  if ($('craft-sell'))      $('craft-sell').value      = saved.sell || 0;
  if ($('craft-target-qty')) $('craft-target-qty').value = 10;
  calcCraft();
}

/* ── Créer un objectif ──────────────────── */
function craftCreateObjective(targetQty) {
  if (!craftState.item) return;
  const cost = craftState.ingredients.reduce((s, r) => s + (r.price || 0) * r.qty, 0);
  const sell = +($('craft-sell')?.value) || 0;
  const objs = craftDB.getObjs();
  objs.unshift({
    id: uid(), name: craftState.item.name,
    image: craftState.item.image_urls?.icon || '',
    level: craftState.item.level || 0,
    item: craftState.item,
    ingredients: craftState.ingredients.map(r => ({ ...r })),
    sell, targetQty, doneQty: 0, createdAt: Date.now(),
  });
  craftDB.putObjs(objs);
  craftRenderObjectives();
  const btn = $('craft-save-obj-btn');
  if (btn) { const o = btn.textContent; btn.textContent = '✓ Ajouté !'; setTimeout(() => btn.textContent = o, 1500); }
}

/* ── Charger un objectif dans le module ─── */
function craftLoadObjective(id) {
  const obj = craftDB.getObjs().find(o => o.id === id);
  if (!obj) return;
  craftState.item        = obj.item;
  craftState.ingredients = obj.ingredients.map(r => ({ ...r }));
  renderCraft();
  obj.ingredients.forEach((ing, i) => {
    const inp = document.querySelector(`.inp-price[data-idx="${i}"]`);
    if (inp) inp.value = ing.price || 0;
  });
  if ($('craft-sell'))       $('craft-sell').value       = obj.sell     || 0;
  if ($('craft-target-qty')) $('craft-target-qty').value = obj.targetQty || 10;
  calcCraft();
  $('craft-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Supprimer un objectif ──────────────── */
function craftDeleteObjective(id) {
  craftDB.putObjs(craftDB.getObjs().filter(o => o.id !== id));
  craftRenderObjectives();
}

/* ── Marquer des crafts comme réalisés ──── */
function craftMarkDone(id) {
  const objs = craftDB.getObjs();
  const obj  = objs.find(o => o.id === id);
  if (!obj) return;
  const inp = document.querySelector(`.obj-done-qty[data-id="${id}"]`);
  const qty = Math.min(Math.max(+inp?.value || 1, 1), obj.targetQty - obj.doneQty);
  if (qty <= 0) return;
  const cost   = obj.ingredients.reduce((s, r) => s + (r.price || 0) * r.qty, 0);
  const sell   = obj.sell;
  const margin = (sell - sell * TAX) - cost;
  const hist   = craftDB.getHist();
  hist.unshift({ id: uid(), name: obj.name, image: obj.image, qty, costUnit: cost, sellUnit: sell, marginUnit: margin, date: Date.now() });
  craftDB.putHist(hist);
  obj.doneQty += qty;
  craftDB.putObjs(objs);
  craftRenderObjectives();
  craftRenderHistory();
}

/* ── Render objectifs ───────────────────── */
function craftRenderObjectives() {
  const wrap = $('craft-objectives');
  if (!wrap) return;
  const objs = craftDB.getObjs();
  if (!objs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div class="sec">🎯 Objectifs de craft</div>
    <div class="craft-obj-list">
    ${objs.map(obj => {
      const cost     = obj.ingredients.reduce((s, r) => s + (r.price || 0) * r.qty, 0);
      const margin   = obj.sell ? (obj.sell - obj.sell * TAX) - cost : null;
      const pct      = Math.min(Math.round(obj.doneQty / obj.targetQty * 100), 100);
      const remaining = obj.targetQty - obj.doneQty;
      return `
        <div class="craft-obj-card">
          <div class="coc-head">
            ${obj.image ? `<img src="${obj.image}" class="coc-img" alt="" onerror="this.style.display='none'">` : ''}
            <div class="coc-info">
              <div class="coc-name">${obj.name}</div>
              <div class="coc-meta">Niv.${obj.level || '?'} · créé le ${new Date(obj.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="coc-kpis">
              <span class="coc-kpi">Coût <strong>${fmtKa(cost)}</strong></span>
              ${obj.sell ? `<span class="coc-kpi">Vente <strong>${fmtKa(obj.sell)}</strong></span>` : ''}
              ${margin !== null ? `<span class="coc-kpi ${margin >= 0 ? 'pos' : 'neg'}">Marge <strong>${margin >= 0 ? '+' : ''}${fmtKa(margin)}</strong></span>` : ''}
            </div>
            <div class="coc-actions">
              <button class="btn-sm" onclick="craftLoadObjective('${obj.id}')">🔄 Charger</button>
              <button class="btn-sm del" onclick="craftDeleteObjective('${obj.id}')">✕</button>
            </div>
          </div>
          <div class="coc-progress-wrap">
            <div class="coc-progress-bar"><div class="coc-progress-fill" style="width:${pct}%"></div></div>
            <div class="coc-progress-txt">${obj.doneQty} / ${obj.targetQty} crafté${obj.doneQty > 1 ? 's' : ''} (${pct}%) · ${remaining} restant${remaining > 1 ? 's' : ''}</div>
          </div>
          ${remaining > 0 ? `
            <div class="coc-mark">
              <input type="number" class="obj-done-qty" data-id="${obj.id}" value="1" min="1" max="${remaining}" step="1">
              <button class="btn-sm sell" onclick="craftMarkDone('${obj.id}')">✅ Marquer comme réalisé</button>
            </div>` : `<div class="coc-done-msg">✅ Objectif atteint !</div>`}
        </div>`;
    }).join('')}
    </div>`;
}

/* ── Historique de craft ────────────────── */
function craftDeleteHist(id) {
  craftDB.putHist(craftDB.getHist().filter(h => h.id !== id));
  craftRenderHistory();
}
function craftClearHistory() {
  if (!confirm('Effacer tout l\'historique de craft ?')) return;
  craftDB.putHist([]);
  craftRenderHistory();
}
function craftRenderHistory() {
  const wrap = $('craft-history-section');
  if (!wrap) return;
  const hist = craftDB.getHist();
  if (!hist.length) { wrap.innerHTML = ''; return; }
  const totalMargin = hist.reduce((s, h) => s + h.marginUnit * h.qty, 0);
  wrap.innerHTML = `
    <div class="sec" style="display:flex;justify-content:space-between;align-items:center">
      <span>📜 Historique de craft</span>
      <button class="del-hist-btn" onclick="craftClearHistory()">Tout effacer</button>
    </div>
    <div class="card">
      <div class="overflow-x">
        <table class="tbl">
          <thead><tr>
            <th>Date</th><th>Item</th>
            <th class="tc">Qté</th>
            <th class="tr">Coût unit.</th>
            <th class="tr">Vente unit.</th>
            <th class="tr">Marge unit.</th>
            <th class="tr">Marge totale</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${hist.map(h => {
              const d  = new Date(h.date);
              const ds = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' })
                       + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
              const mt = h.marginUnit * h.qty;
              return `<tr>
                <td style="white-space:nowrap;color:var(--text-500);font-size:.78rem">${ds}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:.4rem">
                    ${h.image ? `<img src="${h.image}" style="width:18px;height:18px;object-fit:contain" alt="" onerror="this.style.display='none'">` : ''}
                    <strong>${h.name}</strong>
                  </div>
                </td>
                <td class="tc" style="color:var(--gold-muted)">${h.qty}</td>
                <td class="tr">${h.costUnit ? fmtKa(h.costUnit) : '—'}</td>
                <td class="tr">${h.sellUnit ? fmtKa(h.sellUnit) : '—'}</td>
                <td class="tr"><span class="profit-badge ${h.marginUnit >= 0 ? 'pos' : 'neg'}">${h.marginUnit >= 0 ? '+' : ''}${fmtKa(h.marginUnit)}</span></td>
                <td class="tr"><span class="profit-badge ${mt >= 0 ? 'pos' : 'neg'}">${mt >= 0 ? '+' : ''}${fmtKa(mt)}</span></td>
                <td class="tc"><button class="btn-sm del" onclick="craftDeleteHist('${h.id}')" style="font-size:.68rem;padding:.18rem .45rem">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="text-align:right;color:var(--text-500);font-size:.75rem;padding-right:.5rem">Marge totale cumulée</td>
              <td class="tr"><strong class="${totalMargin >= 0 ? 'green' : 'red'}">${totalMargin >= 0 ? '+' : ''}${fmtKa(totalMargin)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

/* ================================================================
   ██████  FM MODULE
================================================================ */
let fmState = { item: null, stats: [] };

makeSearch({
  inputId: 'fm-search', clearId: 'fm-clear', dropId: 'fm-drop',
  fetchFn: searchEquipment,
  onPick: async item => {
    fmLoading();
    try {
      const detail = await getEquipment(item.ankama_id);
      buildFm(detail);
    } catch (e) {
      fmError('Impossible de charger cet item. (' + e.message + ')');
    }
  }
});

function fmLoading() {
  $('fm-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon"><span class="spin" style="width:36px;height:36px;border-width:3px"></span></div><h3>Chargement…</h3></div>`;
}
function fmError(msg) {
  $('fm-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon">⚠️</div><h3>Erreur</h3><p>${msg}</p></div>`;
}

function buildFm(item) {
  fmState.item = item;

  const effects = (item.effects || []).filter(e =>
    e.int_minimum != null || e.int_maximum != null
  );

  if (!effects.length) {
    $('fm-content').innerHTML = `<div class="placeholder"><div class="placeholder-icon">📭</div><h3>Aucune stat FM détectée</h3><p>Cet item ne possède pas de statistiques forgemagicables connues.</p></div>`;
    return;
  }

  fmState.stats = effects.map(e => ({
    name: e.type?.name || 'Inconnu',
    min:  e.int_minimum  ?? (e.int_maximum ?? 0),
    max:  e.int_maximum  ?? (e.int_minimum ?? 0),
    target: null, gap: 0,
    raNeeded: 0, paNeeded: 0,
    raPrix: 0,   paPrix: 0,
  }));

  renderFm();
}

function renderFm() {
  const { item, stats } = fmState;
  const ico = item.image_urls?.icon || '';

  $('fm-content').innerHTML = `
    <div class="item-head">
      ${ico ? `<img src="${ico}" class="item-img" alt="">` : '<div class="item-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem">⚔️</div>'}
      <div>
        <div class="item-name">${item.name}</div>
        <div class="item-meta">Niveau ${item.level ?? '?'}${item.type?.name ? `<span class="badge">${item.type.name}</span>` : ''}</div>
      </div>
    </div>

    <div class="notice">
      <span>⚠️</span>
      <div><strong>Estimation statistique</strong> — Taux de réussite supposé à 50 % par tentative, puit standard non modélisé. Résultats indicatifs uniquement.</div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">📈 Stats &amp; Jets cibles</span></div>
      <div class="overflow-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>Statistique</th>
              <th class="tc">Gamme (min–max)</th>
              <th class="tc">Jet cible</th>
              <th class="tc">Statut</th>
              <th class="tc">Écart FM</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map((s, i) => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td class="tc" style="color:var(--text-300)">
                  ${s.min === s.max ? s.max : `${s.min} – ${s.max}`}
                </td>
                <td class="tc">
                  <input type="number" class="inp-jet" data-si="${i}"
                         placeholder="${s.max}" min="0" step="1">
                </td>
                <td class="tc" id="fst-${i}"><span class="status ok">Naturel</span></td>
                <td class="tc" id="fgap-${i}" style="color:var(--text-500)">—</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="fm-rune-section"></div>
    <div id="fm-profit" class="hidden"></div>
  `;

  document.querySelectorAll('.inp-jet[data-si]').forEach(inp =>
    inp.addEventListener('input', updateFmGaps));
}

function updateFmGaps() {
  let anyFm = false;

  document.querySelectorAll('.inp-jet[data-si]').forEach(inp => {
    const i  = +inp.dataset.si;
    const s  = fmState.stats[i];
    const tv = inp.value === '' ? null : +inp.value;
    s.target = tv;

    const stEl  = $(`fst-${i}`);
    const gapEl = $(`fgap-${i}`);

    if (tv === null) {
      stEl.innerHTML = `<span class="status ok">Naturel</span>`;
      gapEl.textContent = '—'; s.gap = 0;
    } else if (tv <= s.max) {
      stEl.innerHTML = `<span class="status ok">✓ Dans gamme</span>`;
      gapEl.textContent = '0'; s.gap = 0;
    } else {
      const gap = tv - s.max;
      s.gap = gap;
      anyFm = true;
      const cls = (tv > s.max * 1.2) ? 'exo' : 'fm';
      stEl.innerHTML  = `<span class="status ${cls}">FM +${gap}</span>`;
      gapEl.innerHTML = `<strong style="color:var(--orange)">+${gap}</strong>`;
    }

    s.raNeeded = Math.ceil(s.gap / SR);
    s.paNeeded = Math.ceil((s.gap / 3) / SR);
  });

  renderFmRunes(anyFm);
}

function renderFmRunes(anyFm) {
  const runeSection   = $('fm-rune-section');
  const profitSection = $('fm-profit');

  if (!anyFm) {
    runeSection.innerHTML = `
      <div class="notice notice-ok">
        <span>✅</span>
        <div>Tous les jets cibles sont dans les gammes naturelles — aucune forgemagie requise.</div>
      </div>`;
    profitSection.classList.add('hidden');
    return;
  }

  const fmStats = fmState.stats.filter(s => s.gap > 0);

  runeSection.innerHTML = `
    <div class="card">
      <div class="card-head"><span class="card-title">💎 Runes nécessaires (estimation)</span></div>
      <div class="overflow-x">
        <table class="tbl">
          <thead>
            <tr>
              <th>Statistique</th>
              <th class="tc">Écart</th>
              <th class="tc">Rune ×1<br><small style="color:var(--text-500);font-size:.65rem">qté attendue</small></th>
              <th class="tr">Prix Rune ×1 (kamas)</th>
              <th class="tc">Pa ×3<br><small style="color:var(--text-500);font-size:.65rem">qté attendue</small></th>
              <th class="tr">Prix Pa ×3 (kamas)</th>
              <th class="tr">Sous-total min.</th>
            </tr>
          </thead>
          <tbody>
            ${fmStats.map(s => {
              const oi = fmState.stats.indexOf(s);
              return `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td class="tc" style="color:var(--orange);font-weight:700">+${s.gap}</td>
                  <td class="tc">~<strong>${s.raNeeded}</strong></td>
                  <td class="tr">
                    <input type="number" class="inp-price rp" min="0" step="1" placeholder="0"
                           data-oi="${oi}" data-type="ra">
                  </td>
                  <td class="tc">~<strong>${s.paNeeded}</strong></td>
                  <td class="tr">
                    <input type="number" class="inp-price rp" min="0" step="1" placeholder="0"
                           data-oi="${oi}" data-type="pa">
                  </td>
                  <td class="tr subtotal" id="rsub-${oi}">—</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:.65rem 1.25rem;font-size:.72rem;color:var(--text-500);border-top:1px solid var(--border)">
        ℹ️ Taux de réussite supposé : 50 % par tentative.
        Sous-total min. = coût de la stratégie la moins chère (×1 ou ×3) pour chaque stat.
        Laissez un champ vide pour ignorer cette option.
      </div>
    </div>
  `;

  profitSection.innerHTML = `
    <div class="sell-row">
      <label>💰 Prix de vente HDV visé (kamas)</label>
      <input type="number" class="inp-sell" id="fm-sell" min="0" step="1" placeholder="0">
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">📊 Analyse de rentabilité FM</span></div>
      <div class="card-body">
        <div class="sum-grid">
          <div class="sum-stat hl">
            <div class="sum-label">Coût runes estimé</div>
            <div class="sum-val gold" id="fm-cost">0 kamas</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Prix de vente</div>
            <div class="sum-val" id="fm-sell-d">—</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Taxe HDV (2 %)</div>
            <div class="sum-val" id="fm-tax">—</div>
          </div>
          <div class="sum-stat" id="fm-margin-card">
            <div class="sum-label">Marge nette</div>
            <div class="sum-val" id="fm-margin">—</div>
          </div>
        </div>
      </div>
    </div>
  `;

  profitSection.classList.remove('hidden');

  document.querySelectorAll('.rp').forEach(inp =>
    inp.addEventListener('input', calcFm));
  $('fm-sell').addEventListener('input', calcFm);
}

function calcFm() {
  let totalCost = 0;

  document.querySelectorAll('.rp').forEach(inp => {
    const oi   = +inp.dataset.oi;
    const type = inp.dataset.type;
    const s    = fmState.stats[oi];
    const price = +inp.value || 0;
    if (type === 'ra') s.raPrix = price;
    else               s.paPrix = price;
  });

  fmState.stats.filter(s => s.gap > 0).forEach(s => {
    const raCost = s.raPrix > 0 ? s.raPrix * s.raNeeded : Infinity;
    const paCost = s.paPrix > 0 ? s.paPrix * s.paNeeded : Infinity;
    const oi     = fmState.stats.indexOf(s);
    const subEl  = $(`rsub-${oi}`);

    if (raCost === Infinity && paCost === Infinity) {
      if (subEl) subEl.textContent = '—';
    } else {
      const best = Math.min(raCost, paCost);
      totalCost += best;
      if (subEl) {
        subEl.textContent = fmtKa(best);
        subEl.style.color = (paCost < raCost) ? 'var(--green)' : 'var(--text-300)';
      }
    }
  });

  const sell = +($('fm-sell')?.value) || 0;
  const tax  = sell * TAX;
  const net  = sell - tax - totalCost;

  $('fm-cost').textContent   = fmtKa(totalCost);
  $('fm-sell-d').textContent = sell ? fmtKa(sell) : '—';
  $('fm-tax').textContent    = sell ? fmtKa(tax)  : '—';

  const mEl   = $('fm-margin');
  const mCard = $('fm-margin-card');
  if (sell && totalCost) {
    mEl.textContent = (net >= 0 ? '+' : '') + fmtKa(net);
    mEl.className   = 'sum-val ' + (net >= 0 ? 'green' : 'red');
    mCard.className = 'sum-stat ' + (net >= 0 ? 'pos' : 'neg');
  } else {
    mEl.textContent = '—'; mEl.className = 'sum-val'; mCard.className = 'sum-stat';
  }
  fmPersist();
}

/* ================================================================
   ██████  FM — PERSISTENCE
================================================================ */
const FM_SAVE_KEY = 'dofus_fm_save';
const fmDB = {
  getSave: () => JSON.parse(localStorage.getItem(FM_SAVE_KEY) || 'null'),
  putSave: d  => localStorage.setItem(FM_SAVE_KEY, JSON.stringify(d)),
};

function fmPersist() {
  if (!fmState.item) return;
  fmDB.putSave({ item: fmState.item, stats: fmState.stats });
}

function fmRestoreState() {
  const saved = fmDB.getSave();
  if (!saved?.item) return;
  fmState.item  = saved.item;
  fmState.stats = saved.stats;
  renderFm();
  // Restore jet targets
  saved.stats.forEach((s, i) => {
    const inp = document.querySelector(`.inp-jet[data-si="${i}"]`);
    if (inp && s.target !== null) inp.value = s.target;
  });
  updateFmGaps();
  // Restore rune prices after rune section renders
  setTimeout(() => {
    saved.stats.forEach((s, i) => {
      const ra = document.querySelector(`.rp[data-oi="${i}"][data-type="ra"]`);
      const pa = document.querySelector(`.rp[data-oi="${i}"][data-type="pa"]`);
      if (ra && s.raPrix) ra.value = s.raPrix;
      if (pa && s.paPrix) pa.value = s.paPrix;
    });
    calcFm();
  }, 0);
}

/* ================================================================
   ██████  STOCKS & VENTES MODULE
================================================================ */
const DB = {
  getStock: () => JSON.parse(localStorage.getItem('dofus_stock') || '[]'),
  saveStock: d => localStorage.setItem('dofus_stock', JSON.stringify(d)),
  getSales:  () => JSON.parse(localStorage.getItem('dofus_sales')  || '[]'),
  saveSales: d => localStorage.setItem('dofus_sales',  JSON.stringify(d)),
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

let spActiveId = null;

function svAddStock() {
  const name = $('sv-name').value.trim();
  const qty  = parseInt($('sv-qty').value)   || 0;
  const cost = parseFloat($('sv-cost').value) || 0;
  if (!name || qty <= 0) { alert('Nom et quantité requis.'); return; }

  const stock = DB.getStock();
  const existing = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    const totalQty = existing.qty + qty;
    existing.unitCost = (existing.unitCost * existing.qty + cost) / totalQty;
    existing.qty = totalQty;
  } else {
    stock.push({ id: uid(), name, qty, unitCost: qty > 0 ? cost / qty : 0, addedAt: Date.now() });
  }
  DB.saveStock(stock);
  $('sv-name').value = '';
  $('sv-name-clear').classList.remove('vis');
  $('sv-name-drop').classList.remove('open');
  $('sv-qty').value = ''; $('sv-cost').value = '';
  svRender();
}

function svDeleteStock(id) {
  DB.saveStock(DB.getStock().filter(s => s.id !== id));
  if (spActiveId === id) svCloseSell();
  svRender();
}

function svShowSell(id) {
  const item = DB.getStock().find(s => s.id === id);
  if (!item) return;
  spActiveId = id;
  $('sp-item-name').textContent  = item.name;
  $('sp-stock-info').textContent = `(${item.qty} en stock · coût unit. ~${fmtKa(item.unitCost)})`;
  $('sp-qty').value = ''; $('sp-price').value = '';
  ['sp-taxe','sp-net','sp-cost-d'].forEach(i => { $(i).textContent = '—'; });
  const pEl = $('sp-profit'); pEl.textContent = '—'; pEl.className = 's-profit';
  const panel = $('sv-sell-panel');
  panel.classList.add('open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function svCloseSell() {
  spActiveId = null;
  $('sv-sell-panel').classList.remove('open');
}

function svCalcSell() {
  if (!spActiveId) return;
  const item  = DB.getStock().find(s => s.id === spActiveId);
  if (!item) return;
  const qty   = parseInt($('sp-qty').value)    || 0;
  const price = parseFloat($('sp-price').value) || 0;
  const taxe  = price * TAX;
  const net   = price - taxe;
  const cost  = qty * item.unitCost;
  const profit = net - cost;
  $('sp-taxe').textContent   = price ? fmtKa(taxe) : '—';
  $('sp-net').textContent    = price ? fmtKa(net)  : '—';
  $('sp-cost-d').textContent = qty   ? fmtKa(cost) : '—';
  const pEl = $('sp-profit');
  if (price && qty) {
    pEl.textContent = (profit >= 0 ? '+' : '') + fmtKa(profit);
    pEl.className   = 's-profit ' + (profit >= 0 ? 'pos' : 'neg');
  } else {
    pEl.textContent = '—'; pEl.className = 's-profit';
  }
}

function svConfirmSell() {
  if (!spActiveId) return;
  const stock = DB.getStock();
  const idx   = stock.findIndex(s => s.id === spActiveId);
  if (idx === -1) return;
  const item  = stock[idx];
  const qty   = parseInt($('sp-qty').value)    || 0;
  const price = parseFloat($('sp-price').value) || 0;
  if (qty <= 0 || price <= 0) { alert('Quantité et prix requis.'); return; }
  if (qty > item.qty) { alert(`Stock insuffisant (${item.qty} dispo).`); return; }

  const taxe   = price * TAX;
  const net    = price - taxe;
  const cost   = qty * item.unitCost;
  const profit = net - cost;

  const sales = DB.getSales();
  sales.unshift({ id: uid(), name: item.name, qty, sellTotal: price, costTotal: cost, taxe, profit, soldAt: Date.now() });
  DB.saveSales(sales);

  item.qty -= qty;
  if (item.qty <= 0) stock.splice(idx, 1);
  DB.saveStock(stock);
  svCloseSell();
  svRender();
}

function svDeleteSale(id) {
  DB.saveSales(DB.getSales().filter(s => s.id !== id));
  svRender();
}

function svClearHistory() {
  if (!confirm('Effacer tout l\'historique des ventes ?')) return;
  DB.saveSales([]);
  svRender();
}

function svRenderDash() {
  const stock  = DB.getStock();
  const sales  = DB.getSales();
  const stkVal = stock.reduce((a, s) => a + s.qty * s.unitCost, 0);
  const ca     = sales.reduce((a, s) => a + s.sellTotal, 0);
  const profit = sales.reduce((a, s) => a + s.profit,   0);
  const items  = stock.reduce((a, s) => a + s.qty, 0);

  $('sv-d-val').textContent   = fmtKa(stkVal);
  $('sv-d-items').textContent = items;
  $('sv-d-ca').textContent    = ca     ? fmtKa(ca)     : '—';

  const pEl   = $('sv-d-profit');
  const pCard = $('sv-d-profit-card');
  if (sales.length) {
    pEl.textContent = (profit >= 0 ? '+' : '') + fmtKa(profit);
    pEl.className   = 'sum-val ' + (profit > 0 ? 'green' : profit < 0 ? 'red' : '');
    pCard.className = 'sum-stat ' + (profit > 0 ? 'pos'   : profit < 0 ? 'neg'  : '');
  } else {
    pEl.textContent = '—'; pEl.className = 'sum-val'; pCard.className = 'sum-stat';
  }
}

function svRenderStock() {
  const stock = DB.getStock();
  $('sv-stock-count').textContent = `${stock.length} article(s)`;
  const wrap = $('sv-stock-wrap');
  if (!stock.length) {
    wrap.innerHTML = '<div class="empty-notice">Aucun article en stock.<br>Ajoutez votre premier item !</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="overflow-x">
    <table class="tbl">
      <thead>
        <tr>
          <th>Nom</th>
          <th class="tc">Qté</th>
          <th class="tr">Coût unit.</th>
          <th class="tr">Valeur stock</th>
          <th class="tc">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${stock.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td class="tc" style="color:var(--gold-main);font-weight:700">${s.qty}</td>
            <td class="tr" style="color:var(--text-300)">${fmtKa(s.unitCost)}</td>
            <td class="tr" style="color:var(--text-300)">${fmtKa(s.qty * s.unitCost)}</td>
            <td class="tc">
              <div class="sv-stock-actions">
                <button class="btn-sm sell sv-sell-btn" data-id="${s.id}">💸 Vendre</button>
                <button class="btn-sm del  sv-del-btn"  data-id="${s.id}">✕</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  wrap.querySelectorAll('.sv-sell-btn').forEach(b => b.addEventListener('click', () => svShowSell(b.dataset.id)));
  wrap.querySelectorAll('.sv-del-btn') .forEach(b => b.addEventListener('click', () => svDeleteStock(b.dataset.id)));
}

function svRenderHistory() {
  const sales = DB.getSales();
  const wrap  = $('sv-history-wrap');
  if (!sales.length) {
    wrap.innerHTML = '<div class="empty-notice">Aucune vente enregistrée.</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="overflow-x">
    <table class="tbl">
      <thead>
        <tr>
          <th>Date</th><th>Article</th>
          <th class="tc">Qté</th>
          <th class="tr">Prix vente</th>
          <th class="tr">Coût</th>
          <th class="tr">Taxe</th>
          <th class="tr">Profit</th>
          <th class="tc"></th>
        </tr>
      </thead>
      <tbody>
        ${sales.map(s => {
          const d = new Date(s.soldAt);
          const ds = d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'2-digit'})
                   + ' ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
          return `<tr>
            <td style="white-space:nowrap;color:var(--text-500);font-size:.78rem">${ds}</td>
            <td><strong>${s.name}</strong></td>
            <td class="tc" style="color:var(--gold-muted)">${s.qty}</td>
            <td class="tr">${fmtKa(s.sellTotal)}</td>
            <td class="tr" style="color:var(--text-500)">${fmtKa(s.costTotal)}</td>
            <td class="tr" style="color:var(--text-500)">${fmtKa(s.taxe)}</td>
            <td class="tr">
              <span class="profit-badge ${s.profit > 0 ? 'pos' : s.profit < 0 ? 'neg' : 'neu'}">
                ${s.profit >= 0 ? '+' : ''}${fmtKa(s.profit)}
              </span>
            </td>
            <td class="tc">
              <button class="btn-sm del sv-delsale" data-id="${s.id}"
                      style="font-size:.68rem;padding:.18rem .45rem">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>`;
  wrap.querySelectorAll('.sv-delsale').forEach(b => b.addEventListener('click', () => svDeleteSale(b.dataset.id)));
}

function svRender() { svRenderDash(); svRenderStock(); svRenderHistory(); }

(function svInit() {
  makeSearch({
    inputId: 'sv-name', clearId: 'sv-name-clear', dropId: 'sv-name-drop',
    fetchFn: searchEquipment,
    onPick: () => { $('sv-qty').focus(); }
  });
  $('sv-add-btn')  .addEventListener('click',  svAddStock);
  $('sp-confirm')  .addEventListener('click',  svConfirmSell);
  $('sp-cancel')   .addEventListener('click',  svCloseSell);
  $('sp-qty')      .addEventListener('input',  svCalcSell);
  $('sp-price')    .addEventListener('input',  svCalcSell);
  $('sv-clear-hist').addEventListener('click', svClearHistory);
  svRender();
})();

/* ================================================================
   ██████  STUFF MODULE — Gestionnaire de Build
================================================================ */
const SLOTS = [
  { id:'chapeau',  lbl:'Chapeau',  ico:'🎩', group:'equip' },
  { id:'amulette', lbl:'Amulette', ico:'📿', group:'equip' },
  { id:'anneau1',  lbl:'Anneau',   ico:'💍', group:'equip' },
  { id:'anneau2',  lbl:'Anneau',   ico:'💍', group:'equip' },
  { id:'ceinture', lbl:'Ceinture', ico:'⚜',  group:'equip' },
  { id:'bottes',   lbl:'Bottes',   ico:'👢', group:'equip' },
  { id:'cape',     lbl:'Cape',     ico:'🧣', group:'equip' },
  { id:'arme',     lbl:'Arme',     ico:'⚔',  group:'equip' },
  { id:'bouclier', lbl:'Bouclier', ico:'🛡',  group:'equip' },
  { id:'dofus1',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'dofus2',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'dofus3',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'dofus4',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'dofus5',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'dofus6',   lbl:'Dofus',    ico:'🥚', group:'dofus' },
  { id:'familier', lbl:'Familier', ico:'🐾', group:'misc'  },
  { id:'costume',  lbl:'Costume',  ico:'👘', group:'misc'  },
];

const STAT_GROUPS_STUFF = [
  { lbl:'Caractéristiques', keys:['Vitalité','Sagesse','Force','Intelligence','Chance','Agilité','Puissance'] },
  { lbl:'Déplacement',      keys:['PA','PM','Portée','Initiative','Prospection','Invocations','Pods'] },
  { lbl:'Combat',           keys:['Critique','Dommages','Soins','Tacle','Fuite','Retrait PA','Retrait PM','Esquive PA','Esquive PM'] },
  { lbl:'% Dommages',       keys:['% Dommages','% Dommages Neutre','% Dommages Eau','% Dommages Feu','% Dommages Terre','% Dommages Air'] },
  { lbl:'% Résistances',    keys:['% Résistance Neutre','% Résistance Eau','% Résistance Feu','% Résistance Terre','% Résistance Air'] },
  { lbl:'Résistances',      keys:['Résistance Neutre','Résistance Eau','Résistance Feu','Résistance Terre','Résistance Air'] },
];

const BUILDS_KEY = 'dofus_builds';

let stuffState = {
  slots: Object.fromEntries(SLOTS.map(s => [s.id, null])),
  buildName: 'Build 1',
  activeSlot: null,
};

function buildGetAll() { return JSON.parse(localStorage.getItem(BUILDS_KEY) || '[]'); }
function buildSaveAll(b) { localStorage.setItem(BUILDS_KEY, JSON.stringify(b)); }

function computeStuffStats() {
  const totals = {};
  SLOTS.forEach(sl => {
    const item = stuffState.slots[sl.id];
    if (!item || !item.effects) return;
    item.effects.forEach(eff => {
      const name = eff.type?.name;
      if (!name) return;
      const val = eff.int_maximum ?? eff.int_minimum ?? 0;
      totals[name] = (totals[name] || 0) + val;
    });
  });
  return totals;
}

function renderStuffStats() {
  const totals = computeStuffStats();
  const body   = $('stuff-stats-body');
  if (!Object.keys(totals).length) {
    body.innerHTML = '<div style="text-align:center;color:var(--text-500);font-size:.8rem;padding:1rem 0">Cliquez sur un emplacement pour ajouter un item.</div>';
    return;
  }
  const assigned = new Set();
  let html = '';
  STAT_GROUPS_STUFF.forEach(grp => {
    const rows = grp.keys.filter(k => totals[k] !== undefined)
      .map(k => { assigned.add(k); return { k, v: totals[k] }; });
    if (!rows.length) return;
    html += `<div class="sgrp"><div class="sgrp-lbl">${grp.lbl}</div>`;
    rows.forEach(({ k, v }) => {
      html += `<div class="srow"><span class="srow-name">${k}</span><span class="srow-val${v === 0 ? ' z' : ''}">${v > 0 ? '+' : ''}${v}</span></div>`;
    });
    html += '</div>';
  });
  const divers = Object.entries(totals).filter(([k, v]) => !assigned.has(k) && v !== 0);
  if (divers.length) {
    html += '<div class="sgrp"><div class="sgrp-lbl">Divers</div>';
    divers.forEach(([k, v]) => {
      html += `<div class="srow"><span class="srow-name">${k}</span><span class="srow-val">${v > 0 ? '+' : ''}${v}</span></div>`;
    });
    html += '</div>';
  }
  const maxLvl = Math.max(...SLOTS.map(sl => stuffState.slots[sl.id]?.level || 0));
  if (maxLvl > 0) html = `<div style="margin-bottom:.65rem;font-size:.72rem;color:var(--text-500)">Niv. max : <strong class="stuff-lvl-badge">${maxLvl}</strong></div>` + html;
  html += `<div style="margin-top:.5rem;font-size:.6rem;color:var(--text-500);font-style:italic">Valeurs jets parfaits (max)</div>`;
  body.innerHTML = html;
}

function renderSlotCard(slotId) {
  const slot = SLOTS.find(s => s.id === slotId);
  const item = stuffState.slots[slotId];
  const isActive = stuffState.activeSlot === slotId;
  const c = $(slotId + '-card');
  if (!c) return;
  c.className = 'slot-card' + (item ? ' filled' : '') + (isActive ? ' active' : '');
  if (item) {
    const ico = item.image_urls?.icon || '';
    c.innerHTML = `
      <span class="slot-lbl">${slot.lbl}</span>
      ${ico ? `<img src="${ico}" class="slot-img" alt="" onerror="this.style.display='none'">` : `<span class="slot-ico">${slot.ico}</span>`}
      <span class="slot-iname">${item.name}</span>
      <span class="slot-ilvl">Niv.${item.level ?? '?'}</span>
      <button class="slot-rm" title="Retirer">✕</button>`;
    c.querySelector('.slot-rm').addEventListener('click', e => { e.stopPropagation(); clearStuffSlot(slotId); });
  } else {
    c.innerHTML = `<span class="slot-lbl">${slot.lbl}</span><span class="slot-ico">${slot.ico}</span><span class="slot-empty-plus">＋</span>`;
  }
  c.onclick = () => activateStuffSlot(slotId);
}

function renderAllSlots() {
  SLOTS.forEach(s => renderSlotCard(s.id));
  renderStuffStats();
}

function activateStuffSlot(slotId) {
  const same = stuffState.activeSlot === slotId;
  stuffState.activeSlot = same ? null : slotId;
  SLOTS.forEach(s => { const c = $(s.id + '-card'); if (c) c.classList.toggle('active', s.id === stuffState.activeSlot); });
  const panel = $('slot-srch-panel');
  if (stuffState.activeSlot) {
    const slot = SLOTS.find(s => s.id === slotId);
    $('slot-srch-lbl').innerHTML = `🔍 Recherche pour <strong style="color:var(--gold-main)">${slot.lbl}</strong>`;
    panel.classList.add('open');
    $('stuff-search').value = ''; $('stuff-clear').classList.remove('vis');
    $('stuff-drop').classList.remove('open'); $('stuff-drop').innerHTML = '';
    $('stuff-search').focus();
  } else {
    panel.classList.remove('open');
  }
}

function clearStuffSlot(slotId) {
  stuffState.slots[slotId] = null;
  if (stuffState.activeSlot === slotId) { stuffState.activeSlot = null; $('slot-srch-panel').classList.remove('open'); }
  renderSlotCard(slotId); renderStuffStats();
}

function onStuffPick(item) {
  if (!stuffState.activeSlot) return;
  stuffState.slots[stuffState.activeSlot] = item;
  const prev = stuffState.activeSlot;
  stuffState.activeSlot = null;
  $('slot-srch-panel').classList.remove('open');
  renderSlotCard(prev); renderStuffStats();
}

function stuffSave() {
  const name = $('stuff-build-name').value.trim() || 'Build sans nom';
  stuffState.buildName = name;
  const builds = buildGetAll();
  const existing = builds.find(b => b.name === name);
  const data = { id: existing?.id || uid(), name, slots: stuffState.slots, savedAt: Date.now() };
  if (existing) Object.assign(existing, data); else builds.push(data);
  buildSaveAll(builds);
  populateBuildsSelect(name);
  const btn = $('stuff-save-btn'), orig = btn.textContent;
  btn.textContent = '✓ Sauvegardé'; setTimeout(() => { btn.textContent = orig; }, 1200);
}

function stuffLoad(id) {
  if (!id) return;
  const b = buildGetAll().find(x => x.id === id);
  if (!b) return;
  stuffState.slots = Object.fromEntries(SLOTS.map(s => [s.id, b.slots?.[s.id] || null]));
  stuffState.buildName = b.name; $('stuff-build-name').value = b.name;
  stuffState.activeSlot = null; $('slot-srch-panel').classList.remove('open');
  renderAllSlots();
}

function stuffNew() {
  stuffState.slots = Object.fromEntries(SLOTS.map(s => [s.id, null]));
  stuffState.buildName = 'Nouveau Build'; stuffState.activeSlot = null;
  $('stuff-build-name').value = stuffState.buildName;
  $('slot-srch-panel').classList.remove('open'); renderAllSlots();
}

function stuffDelete() {
  buildSaveAll(buildGetAll().filter(b => b.name !== stuffState.buildName));
  populateBuildsSelect(); stuffNew();
}

function populateBuildsSelect(selectName) {
  const sel = $('stuff-builds-sel');
  sel.innerHTML = '<option value="">— Charger un build —</option>'
    + buildGetAll().map(b => `<option value="${b.id}"${b.name === selectName ? ' selected' : ''}>${b.name}</option>`).join('');
}

(function stuffInit() {
  ['equip','dofus','misc'].forEach(group => {
    const grid = $('stuff-slots-' + group);
    SLOTS.filter(s => s.group === group).forEach(s => {
      const div = document.createElement('div');
      div.id = s.id + '-card'; div.className = 'slot-card';
      grid.appendChild(div);
    });
  });
  renderAllSlots();
  makeSearch({
    inputId: 'stuff-search', clearId: 'stuff-clear', dropId: 'stuff-drop',
    fetchFn: searchEquipment,
    onPick: async item => {
      try { onStuffPick(await getEquipment(item.ankama_id)); }
      catch { onStuffPick(item); }
    }
  });
  $('stuff-save-btn')  .addEventListener('click',  stuffSave);
  $('stuff-new-btn')   .addEventListener('click',  stuffNew);
  $('stuff-builds-sel').addEventListener('change', e => stuffLoad(e.target.value));
  $('stuff-del-btn')   .addEventListener('click',  () => {
    if (confirm(`Supprimer le build "${stuffState.buildName}" ?`)) stuffDelete();
  });
  populateBuildsSelect();
})();

/* ================================================================
   ██████  REVERSE CRAFT MODULE
================================================================ */
const irState = { ingredient: null, results: [] };

/* ── Recherche ingrédient (ressource) ── */
makeSearch({
  inputId: 'ir-ing-input', clearId: 'ir-ing-clear', dropId: 'ir-ing-drop',
  fetchFn: searchResources,
  onPick: ing => {
    irState.ingredient = ing;
    irState.results    = [];
    const ico = ing.image_urls?.icon || '';
    $('ir-ing-card').innerHTML = `
      <div class="ir-ing-card">
        ${ico ? `<img src="${ico}" class="ir-ing-img" alt="" onerror="this.style.display='none'">` : ''}
        <div class="ir-ing-info">
          <div class="ir-ing-name">${ing.name}</div>
          <div class="ir-ing-meta">${ing.type?.name || 'Ressource'}${ing.level ? ` · Niv.${ing.level}` : ''}</div>
        </div>
      </div>`;
    $('ir-equip-step').style.display = '';
    irRender();
  }
});

/* ── Recherche équipement à vérifier ── */
makeSearch({
  inputId: 'ir-equip-input', clearId: 'ir-equip-clear', dropId: 'ir-equip-drop',
  fetchFn: searchEquipment,
  onPick: async equip => {
    /* reset input */
    $('ir-equip-input').value = '';
    $('ir-equip-clear').classList.remove('vis');
    $('ir-equip-drop').classList.remove('open');

    if (!irState.ingredient) return;
    if (irState.results.find(r => r.equipId === equip.ankama_id)) return; /* déjà vérifié */

    /* ajouter placeholder de chargement */
    irState.results.unshift({
      equipId: equip.ankama_id,
      name:    equip.name,
      image:   equip.image_urls?.icon || '',
      level:   equip.level || 0,
      loading: true, found: false, qty: 0, error: false,
    });
    irRender();

    /* fetch détail + check recette */
    try {
      const detail = await getEquipment(equip.ankama_id);
      const recipe = detail.recipe || [];
      const ingId  = String(irState.ingredient.ankama_id);
      const match  = recipe.find(r => String(r.item_ankama_id ?? r.ankama_id) === ingId);
      const entry  = irState.results.find(r => r.equipId === equip.ankama_id);
      if (entry) { entry.loading = false; entry.found = !!match; entry.qty = match?.quantity || 0; }
    } catch {
      const entry = irState.results.find(r => r.equipId === equip.ankama_id);
      if (entry) { entry.loading = false; entry.error = true; }
    }
    irRender();
  }
});

function irRender() {
  const wrap = $('ir-results');
  if (!wrap) return;
  if (!irState.results.length) { wrap.innerHTML = ''; return; }

  const foundN = irState.results.filter(r => r.found).length;
  wrap.innerHTML = `
    <div class="ir-results-hd">
      <span>
        ${irState.results.length} équipement${irState.results.length > 1 ? 's' : ''} vérifié${irState.results.length > 1 ? 's' : ''}
        · <strong class="${foundN ? 'green' : ''}">${foundN} utilise${foundN !== 1 ? 'nt' : ''}</strong>
        <em>${irState.ingredient?.name || ''}</em>
      </span>
      <button class="del-hist-btn" onclick="irClear()">Tout effacer</button>
    </div>
    <div class="overflow-x">
      <table class="tbl">
        <thead><tr>
          <th>Équipement</th>
          <th class="tc">Niv.</th>
          <th class="tc">Utilise l'ingré.</th>
          <th class="tc">Qté recette</th>
          <th class="tc">Action</th>
        </tr></thead>
        <tbody>
          ${irState.results.map(r => `
            <tr class="${r.found ? 'ir-match' : ''}">
              <td>
                <div class="ing-wrap">
                  ${r.image ? `<img src="${r.image}" class="ing-ico" alt="" onerror="this.style.display='none'">` : ''}
                  <span>${r.name}</span>
                </div>
              </td>
              <td class="tc" style="color:var(--text-500)">${r.level || '—'}</td>
              <td class="tc">
                ${r.loading ? '<span class="spin" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span>'
                  : r.error  ? '⚠️'
                  : r.found  ? '✅'
                  : '<span style="color:var(--text-500)">—</span>'}
              </td>
              <td class="tc">
                ${r.loading ? '<span style="color:var(--text-500)">…</span>'
                  : r.found  ? `<strong class="green">×${r.qty}</strong>`
                  : '<span style="color:var(--text-500)">—</span>'}
              </td>
              <td class="tc">
                ${r.found ? `<button class="btn-sm" onclick="irLoadEquip(${r.equipId})">🔨 Craft</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function irClear() {
  irState.results = [];
  irRender();
}

async function irLoadEquip(id) {
  try {
    craftLoading();
    /* switcher vers l'onglet Craft */
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="craft"]').classList.add('active');
    $('module-craft').classList.add('active');
    const detail = await getEquipment(id);
    await buildCraft(detail);
    $('craft-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { console.error('irLoadEquip:', e); }
}

/* ================================================================
   ██████  CONFIG IMAGIRO (modal ⚙️)
================================================================ */

async function imagiroOpenConfig() {
  const modal = document.getElementById('imagiro-cfg-modal');
  modal.style.display = 'flex';
  /* Pré-remplir depuis localStorage */
  const cf   = localStorage.getItem('imagiro_cf')   || '';
  const auth = localStorage.getItem('imagiro_auth') || '';
  document.getElementById('icfg-cf').value   = cf;
  document.getElementById('icfg-auth').value = auth;
  await imagiroCheckProxy();
}

async function imagiroCheckProxy() {
  const bar = document.getElementById('icfg-status-bar');
  if (!bar) return;
  bar.className = 'icfg-status-bar';
  bar.textContent = '⏳ Vérification du proxy…';

  const status = await imagiroProxyStatus();
  const dot    = document.getElementById('imagiro-cfg-dot');

  if (!status) {
    bar.className = 'icfg-status-bar err';
    bar.textContent = '❌ Proxy non démarré — lancez : node proxy.js';
    if (dot) { dot.textContent = 'Prix HDV ●'; dot.style.color = 'var(--red)'; }
    return;
  }
  if (!status.hasCf) {
    bar.className = 'icfg-status-bar warn';
    bar.textContent = '⚠️ Proxy actif mais sans cf_clearance — les requêtes seront bloquées par Cloudflare';
    if (dot) { dot.textContent = 'Prix HDV ●'; dot.style.color = 'var(--orange)'; }
    return;
  }
  bar.className = 'icfg-status-bar ok';
  bar.textContent = `✅ Proxy actif — cf_clearance configuré (${status.cfSnip})`;
  if (dot) { dot.textContent = 'Prix HDV ✓'; dot.style.color = 'var(--green)'; }
}

async function imagiroSaveConfig() {
  const cf   = document.getElementById('icfg-cf')?.value.trim()   || '';
  const auth = document.getElementById('icfg-auth')?.value.trim() || '';
  const res  = document.getElementById('icfg-result');

  if (cf)   localStorage.setItem('imagiro_cf',   cf);
  if (auth) localStorage.setItem('imagiro_auth', auth);

  if (res) { res.textContent = '⏳ Envoi au proxy…'; res.style.color = 'var(--text-300)'; }

  try {
    const r = await fetch('http://localhost:3001/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cf_clearance: cf, auth_token: auth }),
      signal:  AbortSignal.timeout(3000),
    });
    const data = await r.json();
    if (data.ok) {
      if (res) { res.textContent = '✅ Enregistré ! Testez maintenant "Prix auto HDV" dans le Craft.'; res.style.color = 'var(--green)'; }
      await imagiroCheckProxy();
    } else {
      if (res) { res.textContent = '⚠️ Réponse inattendue du proxy.'; res.style.color = 'var(--orange)'; }
    }
  } catch {
    if (res) {
      res.innerHTML = '❌ Proxy non démarré — lancez <code style="background:var(--bg-elevated);padding:.1rem .3rem;border-radius:4px">node proxy.js</code> puis réessayez.';
      res.style.color = 'var(--red)';
    }
  }
}

/* ================================================================
   ██████  DUMP PRIX — fonctions UI (modal imagiro)
================================================================ */

function imagiroUpdateDumpStatus() {
  const el = document.getElementById('icfg-dump-status');
  if (!el) return;
  const dump = getPriceDump();
  if (!dump) {
    el.textContent = '❌ Aucun cache — cliquez "Télécharger tous les prix"';
    el.style.color = 'var(--red)';
    return;
  }
  const age  = Math.round((Date.now() - dump.ts) / 3_600_000);
  const ageS = age < 1 ? 'il y a < 1h' : age < 24 ? `il y a ${age}h` : `il y a ${Math.round(age/24)}j`;
  el.textContent = `✅ ${dump.count.toLocaleString('fr-FR')} items en cache · mis à jour ${ageS}`;
  el.style.color = 'var(--green)';
  /* Badge dans le ranking brisage */
  const badge = document.getElementById('bri-rank-cache-info');
  if (badge) badge.textContent = `📦 ${dump.count.toLocaleString('fr-FR')} prix en cache · ${ageS}`;
  const cvBadge = document.getElementById('cv-rank-cache-info');
  if (cvBadge) cvBadge.textContent = `📦 ${dump.count.toLocaleString('fr-FR')} prix en cache · ${ageS}`;
}

async function imagiroDumpPrices() {
  const btn      = document.getElementById('icfg-dump-btn');
  const progWrap = document.getElementById('icfg-dump-progress');
  const fill     = document.getElementById('icfg-prog-fill');
  const label    = document.getElementById('icfg-prog-label');
  const status   = document.getElementById('icfg-dump-status');

  if (!btn) return;
  btn.disabled = true; btn.textContent = '⏳ Téléchargement…';
  if (progWrap) progWrap.style.display = 'block';

  try {
    await downloadPriceDump((done, total, catName) => {
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      if (fill)  fill.style.width  = pct + '%';
      if (label) label.textContent = `${catName} (${done}/${total} catégories — ${pct}%)`;
    });
    if (status) { status.textContent = '✅ Cache mis à jour !'; status.style.color = 'var(--green)'; }
    imagiroUpdateDumpStatus();
  } catch (e) {
    if (status) {
      status.textContent = '❌ Erreur : ' + e.message + ' — proxy actif avec cf_clearance ?';
      status.style.color = 'var(--red)';
    }
  } finally {
    btn.disabled = false; btn.textContent = '📥 Télécharger tous les prix';
    setTimeout(() => { if (progWrap) progWrap.style.display = 'none'; }, 2000);
  }
}

function imagiroClearDump() {
  if (!confirm('Effacer le cache des prix et les coefficients de brisage ?')) return;
  localStorage.removeItem(DUMP_KEY);
  localStorage.removeItem(CRAFT_DATA_KEY);
  localStorage.removeItem(BRISAGE_KEY);
  _priceDump = null;
  imagiroUpdateDumpStatus();
}

/* ================================================================
   ██████  SOUS-ONGLETS FM / BRISAGE
================================================================ */
document.querySelectorAll('.fm-stab[data-stab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fm-stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('stab-' + btn.dataset.stab)?.classList.add('active');
  });
});

/* ================================================================
   ██████  BRISAGE MODULE
================================================================ */

/* ── Recherche item individuel ── */
makeSearch({
  inputId: 'bri-search', clearId: 'bri-clear', dropId: 'bri-drop',
  fetchFn: searchEquipment,
  onPick: async item => {
    briLoading();
    try {
      const detail = await getEquipment(item.ankama_id);
      await buildBrisage(detail);
    } catch (e) { briError('Impossible de charger cet item : ' + e.message); }
  }
});

function briLoading() {
  document.getElementById('bri-content').innerHTML =
    `<div class="placeholder"><div class="placeholder-icon"><span class="spin" style="width:36px;height:36px;border-width:3px"></span></div><h3>Chargement…</h3></div>`;
}
function briError(msg) {
  document.getElementById('bri-content').innerHTML =
    `<div class="placeholder"><div class="placeholder-icon">⚠️</div><h3>Erreur</h3><p>${msg}</p></div>`;
}

async function buildBrisage(item) {
  const recipe = item.recipe;
  if (!recipe?.length) {
    briError('Pas de recette connue pour cet item.');
    return;
  }

  /* Charge les ingrédients */
  const ingredients = await Promise.all(recipe.map(async r => {
    const rid = r.item_ankama_id ?? r.ankama_id;
    let name = r.name || `#${rid}`, img = r.image_urls?.icon || '';
    if (!r.name) {
      const d = await getAnyItem(rid, r.item_subtype ?? '');
      if (d) { name = d.name || name; img = d.image_urls?.icon || img; }
    }
    /* Récupère le prix depuis le cache */
    const cached = getPriceCached(rid);
    return { id: rid, name, qty: r.quantity || 1, img,
             p1: cached?.p1 || 0, p10: cached?.p10 || 0 };
  }));

  /* Prix HDV de l'item crafté */
  const itemCached = getPriceCached(item.ankama_id);

  renderBrisage(item, ingredients, itemCached);
}

function renderBrisage(item, ingredients, itemCached) {
  const wrap = document.getElementById('bri-content');
  const ico  = item.image_urls?.icon || '';

  const missingPrices = ingredients.filter(r => !r.p1);
  const craftCost = ingredients.reduce((s, r) => s + r.p1 * r.qty, 0);
  const craftCostComplete = missingPrices.length === 0;
  const hdvPrice  = itemCached?.p1 || 0;
  const margin    = hdvPrice > 0 && craftCostComplete ? hdvPrice * (1 - TAX) - craftCost : null;
  const roi       = craftCost > 0 && margin !== null ? margin / craftCost : null;

  /* Coefficient de brisage : pré-calculé > calculé depuis effects > null */
  const preCoeffs = getBrisageCoeffs();
  const brisagePA = preCoeffs[item.ankama_id] ?? calcBrisagePA(item.effects);

  const hasDump   = !!getPriceDump();

  wrap.innerHTML = `
    <div class="item-head">
      ${ico ? `<img src="${ico}" class="item-img" alt="">` : '<div class="item-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem">💎</div>'}
      <div>
        <div class="item-name">${item.name}</div>
        <div class="item-meta">Niveau ${item.level ?? '?'}${item.type?.name ? `<span class="badge">${item.type.name}</span>` : ''}</div>
      </div>
    </div>

    ${!hasDump ? `<div class="notice"><span>💾</span><div>Importez le cache des prix (⚙️ → "📂 Importer un fichier JSON") pour auto-remplir les prix.</div></div>` : ''}
    ${hasDump && missingPrices.length > 0 ? `<div class="notice" style="margin-bottom:.875rem"><span>⚠️</span><div><strong>${missingPrices.length} ingrédient(s) sans prix</strong> dans le cache : ${missingPrices.map(r=>`<em>${r.name}</em>`).join(', ')}. Coût de craft incomplet.</div></div>` : ''}

    <div class="card">
      <div class="card-head"><span class="card-title">🧪 Coût de craft</span></div>
      <div class="overflow-x">
        <table class="tbl">
          <thead><tr>
            <th>Ingrédient</th><th class="tc">Qté</th>
            <th class="tr">Prix ×1</th><th class="tr">Prix ×10</th><th class="tr">Sous-total</th>
          </tr></thead>
          <tbody>
            ${ingredients.map(r => `
              <tr>
                <td><div class="ing-wrap">
                  ${r.img ? `<img src="${r.img}" class="ing-ico" alt="" onerror="this.style.display='none'">` : ''}
                  <span>${r.name}</span>
                </div></td>
                <td class="tc"><span class="ing-qty">×${r.qty}</span></td>
                <td class="tr">${r.p1 ? fmtKa(r.p1) : '<span style="color:var(--text-500)">—</span>'}</td>
                <td class="tr">${r.p10 ? fmtKa(r.p10) : '<span style="color:var(--text-500)">—</span>'}</td>
                <td class="tr">${r.p1 ? fmtKa(r.p1 * r.qty) : '—'}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="4" style="text-align:right;color:var(--text-300);font-size:.78rem;padding-right:.5rem">Coût total craft</td>
            <td class="tr"><strong class="gold">${craftCost ? fmtKa(craftCost) : '—'}</strong></td>
          </tr></tfoot>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">📊 Analyse Brisage / Vente</span></div>
      <div class="card-body">
        <div class="sum-grid">
          <div class="sum-stat hl">
            <div class="sum-label">Coût de craft</div>
            <div class="sum-val gold">${craftCost ? fmtKa(craftCost) : '—'}</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Prix HDV (×1)</div>
            <div class="sum-val">${hdvPrice ? fmtKa(hdvPrice) : '—'}</div>
          </div>
          <div class="sum-stat">
            <div class="sum-label">Taxe HDV (2%)</div>
            <div class="sum-val">${hdvPrice ? fmtKa(hdvPrice * TAX) : '—'}</div>
          </div>
          <div class="sum-stat ${margin !== null ? (margin >= 0 ? 'pos' : 'neg') : ''}">
            <div class="sum-label">Marge nette vente</div>
            <div class="sum-val ${margin !== null ? (margin >= 0 ? 'green' : 'red') : ''}">
              ${margin !== null ? (margin >= 0 ? '+' : '') + fmtKa(margin) : '—'}
            </div>
          </div>
          <div class="sum-stat" title="Coefficient de brisage : somme des poids de rune de chaque stat. Multipliez par (niveau × 0,015) pour estimer les runes Ba générées à coeff serveur 100%.">
            <div class="sum-label">💎 Coefficient de brisage</div>
            <div class="sum-val" style="font-size:1.1rem">${brisagePA != null ? brisagePA : '—'}</div>
          </div>
          ${brisagePA != null && item.level ? `
          <div class="sum-stat" title="Estimation des runes Ba générées à coefficient serveur 100%. Formule : coefficient × niveau × 0,015">
            <div class="sum-label">🎲 Runes Ba estimées (coeff 100%)</div>
            <div class="sum-val" style="font-size:1rem">${Math.round(brisagePA * item.level * 0.0150)}</div>
          </div>` : ''}
        </div>

        ${roi !== null ? `
          <div class="bri-verdict ${roi >= 0.1 ? 'bri-ok' : roi >= 0 ? 'bri-meh' : 'bri-bad'}">
            ${roi >= 0.3 ? '🟢 Très rentable à vendre (ROI +' + Math.round(roi*100) + '%)'
            : roi >= 0.1 ? '🟡 Rentable à vendre (ROI +' + Math.round(roi*100) + '%)'
            : roi >= 0   ? '🟠 Rentabilité faible — évaluer le brisage (ROI +' + Math.round(roi*100) + '%)'
            : '🔴 Non rentable à vendre — brisage ou stockage conseillé (ROI ' + Math.round(roi*100) + '%)'}
          </div>` : ''}

        <div class="bri-note">
          ℹ️ <strong>Coefficient de brisage</strong> = somme des poids de rune de chaque stat (indépendant du niveau).
          <strong>Runes Ba estimées</strong> = Coefficient × niveau × 0,015 à coeff. serveur 100% — le coefficient serveur réel varie de 1% à 4000% selon l'activité de brisage.
          Multipliez les runes obtenues par leurs prix HDV pour connaître la valeur en kamas.
        </div>
      </div>
    </div>
  `;
}

/* ================================================================
   ██████  RANKING HELPER commun (Brisage + Craft→Vente)
================================================================ */

/* ── Poids PA par stat — source : formule Dofus communautaire ──
   Formule : runes ≈ (valeur × poids × niveau × 0.0150) / poids
   Ce dictionnaire donne le "poids_rune" de chaque caractéristique.
   Ref : https://www.dofus.com/fr/forum/1782-dofus/2389064-formule-exacte-generation-runes
   et GitHub KamelAkar/Calculateur_Brisage_Dofus
──────────────────────────────────────────────────────────────── */
const STAT_PA = {
  /* Élémentaires */
  'Force': 1, 'Intelligence': 1, 'Agilité': 1, 'Chance': 1,
  /* Secondaires */
  'Vitalité': 0.2,
  'Sagesse': 3, 'Prospection': 3,
  'Puissance': 2,
  'Pods': 0.25,
  /* Combat */
  'PA': 100, 'PM': 90, 'Portée': 51,
  'Initiative': 0.1,
  'Invocation': 30,            // API: "Invocation" (singulier)
  '% Critique': 10,            // API: "% Critique" (pas "% Chance Critique")
  'Soin': 10,                  // API: "Soin" (singulier)
  /* Dommages génériques */
  'Dommage': 20,               // API: "Dommage" (singulier)
  /* Dommages élémentaires — bonus de stat (majuscule singulier) */
  'Dommage Feu': 5, 'Dommage Eau': 5,
  'Dommage Terre': 5, 'Dommage Air': 5,
  'Dommage Neutre': 5,
  /* Dommages élémentaires — bonus arme (minuscule pluriel) */
  'dommages Feu': 5, 'dommages Eau': 5,
  'dommages Neutre': 5, 'dommages Air': 5,
  /* Dommages spéciaux */
  'Dommage Critiques': 5,
  'Dommage Poussée': 5,
  /* Résistances fixes */
  'Résistance Neutre': 2, 'Résistance Feu': 2, 'Résistance Eau': 2,
  'Résistance Terre': 2,  'Résistance Air': 2,
  'Résistance Critiques': 2, 'Résistance Poussée': 2,
  /* Résistances % */
  '% Résistance Neutre': 6, '% Résistance Feu': 6, '% Résistance Eau': 6,
  '% Résistance Terre': 6,  '% Résistance Air': 6,
  /* Tacle / Fuite */
  'Tacle': 4, 'Fuite': 4,
  /* Esquive / Retrait PA-PM */
  'Retrait PA': 7, 'Esquive PA': 7,
  'Retrait PM': 7, 'Esquive PM': 7,
};

/**
 * Calcule le coefficient de brisage brut (somme stat × poids_rune).
 * Indépendant du niveau — multiplie par (niveau × 0.0150) pour estimer les runes.
 * Retourne null si aucun effet reconnu.
 */
function calcBrisagePA(effects) {
  if (!effects?.length) return null;
  let total = 0;
  for (const ef of effects) {
    if (ef.type?.is_meta) continue;          // is_meta est dans ef.type, pas ef
    const val = Math.abs(ef.int_maximum || ef.int_minimum || 0);
    const w   = STAT_PA[ef.type?.name];
    if (w != null && val > 0) total += val * w;
  }
  return total > 0 ? Math.round(total) : null;
}

/* Level / type / brisagePA cache — évite les double-fetchs DofusDude */
const _levelTypeCache = {};
async function fetchLevelType(id) {
  if (_levelTypeCache[id]) return _levelTypeCache[id];
  try {
    const d = await getEquipment(id);
    const r = {
      level:     d?.level ?? null,
      type:      d?.type?.name ?? null,
      brisagePA: calcBrisagePA(d?.effects),
    };
    _levelTypeCache[id] = r;
    return r;
  } catch { return { level: null, type: null, brisagePA: null }; }
}

async function runCraftRanking({ btnId, wrapId, budgetId, sortId, minPriceId = null, typeFilterId = null, detailFn = 'briLoadItemById', mode = 'craftvente', runePriceId = null }) {
  const btn        = document.getElementById(btnId);
  const wrap       = document.getElementById(wrapId);
  const budget     = +(document.getElementById(budgetId)?.value)  || Infinity;
  const sortBy     = document.getElementById(sortId)?.value       || 'roi';
  const minPrice   = minPriceId    ? (+(document.getElementById(minPriceId)?.value)    || 0) : 0;
  const runePrice  = runePriceId   ? (+(document.getElementById(runePriceId)?.value)   || 0) : 0;
  const typeFilter = typeFilterId  ? (document.getElementById(typeFilterId)?.value     || 'all') : 'all';

  const dump      = getPriceDump();
  const craftData = getCraftData();

  if (!dump) {
    wrap.innerHTML = `<div class="placeholder"><div class="placeholder-icon">💾</div><h3>Cache requis</h3><p>Importez les prix via ⚙️ → "📂 Importer un fichier JSON".</p></div>`;
    return;
  }
  if (!craftData.length) {
    wrap.innerHTML = `<div class="placeholder"><div class="placeholder-icon">📋</div><h3>Craft data manquante</h3><p>Importez le cache (inclut craft-data).</p></div>`;
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Calcul…'; }

  /* Types DofusDude non-arme (pour le filtre "Arme") */
  const NON_WEAPON_TYPES = new Set([
    'Anneau', 'Amulette', 'Ceinture', 'Bottes', 'Cape', 'Manteau',
    'Chapeau', 'Casque', 'Coiffe', 'Couronne', 'Bouclier',
    'Trophée', 'Dofus', 'Familier', 'Monture', 'Costume',
    'Objet de quête', 'Objet de mutation', 'Équipement de compagnon',
  ]);

  /* Données brisage pré-calculées (type + PA) */
  const brisageData = getBrisageData();

  /* Heuristique nom — fallback si pas de données brisage */
  const TYPE_KW = {
    Bijou:    ['amulette', 'anneau', 'bague'],
    Ceinture: ['ceinture'],
    Bottes:   ['bottes', 'sandales', 'souliers'],
    Cape:     ['cape', 'manteau'],
    Chapeau:  ['chapeau', 'casque', 'coiffe', 'couronne'],
    Bouclier: ['bouclier'],
  };
  const ALL_NON_WEAPON_KW = Object.values(TYPE_KW).flat();

  const rows = [];
  for (const craft of craftData) {
    const itemId = craft.itemID;
    const itemP  = dump.prices[itemId];
    if (!itemP) continue;

    /* Filtre par type — données DofusDude en priorité, heuristique en fallback */
    if (typeFilter !== 'all') {
      const storedType = brisageData[itemId]?.type || null;
      if (storedType) {
        /* Données réelles disponibles */
        if (typeFilter === 'Arme') {
          if (NON_WEAPON_TYPES.has(storedType)) continue;
        } else if (typeFilter === 'Bijou') {
          if (storedType !== 'Anneau' && storedType !== 'Amulette') continue;
        } else {
          if (storedType !== typeFilter) continue;
        }
      } else {
        /* Fallback heuristique (nom) */
        const nameLc = (craft.Name || '').toLowerCase();
        if (typeFilter === 'Arme') {
          if (ALL_NON_WEAPON_KW.some(kw => nameLc.includes(kw))) continue;
        } else {
          const kws = TYPE_KW[typeFilter] || [];
          if (!kws.some(kw => nameLc.includes(kw))) continue;
        }
      }
    }

    let craftCost = 0; let allPriced = true;
    for (let i = 0; i < craft.Ingredients.length; i++) {
      const ingP = dump.prices[craft.Ingredients[i]];
      if (!ingP || !ingP.p1) { allPriced = false; break; }
      craftCost += ingP.p1 * (craft.Quantity[i] || 1);
    }
    if (!allPriced || craftCost <= 0 || craftCost > budget) continue;

    if (mode === 'brisage') {
      /* ── Mode Brisage : valeur = runes estimées × prix Rune Ba ── */
      const bd    = brisageData[itemId];
      const pa    = bd?.pa    ?? null;
      const level = bd?.level ?? null;
      if (pa == null || level == null) continue;   // données requises

      const runesEst     = Math.round(pa * level * 0.015);
      const brisageValue = runePrice > 0 ? runesEst * runePrice : null;
      const net          = brisageValue != null ? brisageValue - craftCost : null;
      const roi          = (net != null && craftCost > 0) ? net / craftCost : null;

      rows.push({
        id: itemId, name: craft.Name || `#${itemId}`,
        craftCost, runesEst, brisageValue, net, roi,
        level, type: bd?.type || null, brisagePA: pa,
      });

    } else {
      /* ── Mode Craft→Vente : valeur = prix HDV ── */
      const hdvPrice = itemP.p1 || 0;
      if (!hdvPrice || hdvPrice < minPrice) continue;
      const net = hdvPrice * (1 - TAX) - craftCost;
      const roi = net / craftCost;
      rows.push({
        id: itemId, name: craft.Name || `#${itemId}`,
        craftCost, hdvPrice, net, roi,
        level: null, type: null,
        brisagePA: brisageData[itemId]?.pa ?? null,
      });
    }
  }

  rows.sort((a, b) => {
    if (mode === 'brisage' && runePrice === 0)
      return b.runesEst - a.runesEst; // sans prix : trier par runes générées
    return sortBy === 'margin' ? (b.net ?? -Infinity) - (a.net ?? -Infinity) :
           sortBy === 'cost'   ? a.craftCost - b.craftCost :
           (b.roi ?? -Infinity) - (a.roi ?? -Infinity);
  });

  const top = rows.slice(0, 50);
  if (!top.length) {
    const hint = mode === 'brisage'
      ? 'Exportez les coefficients de brisage (💹 → Export), ou augmentez le budget.'
      : 'Augmentez le budget ou changez les filtres.';
    wrap.innerHTML = `<div class="placeholder"><div class="placeholder-icon">🔍</div><h3>Aucun résultat</h3><p>${hint}</p></div>`;
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Calculer le classement'; }
    return;
  }

  /* Fetch niveau + type DofusDude pour le top 50 — seulement en mode craft→vente
     (en mode brisage les données viennent déjà du fichier export) */
  if (mode === 'craftvente') {
    if (btn) btn.textContent = '⏳ Niveaux…';
    const ltResults = await Promise.allSettled(top.map(r => fetchLevelType(r.id)));
    ltResults.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        top[i].level = res.value.level;
        top[i].type  = res.value.type;
        if (top[i].brisagePA == null) top[i].brisagePA = res.value.brisagePA ?? null;
      }
    });
  }

  /* ── Rendu table ── */
  const headersBrisage = `
    <th>#</th><th>Item</th><th class="tc">Niv.</th>
    <th class="tr" title="Coefficient de brisage">Coeff.</th>
    <th class="tr" title="Runes Ba générées estimées à coeff. serveur 100% — Formule : Coeff. × Niveau × 0,015">Runes Ba</th>
    <th class="tr">Coût craft</th>
    <th class="tr" title="Valeur totale des runes Ba générées (Runes Ba × prix rune saisi)">${runePrice > 0 ? 'Revenus runes' : '—'}</th>
    <th class="tr">Marge</th>
    <th class="tr">ROI</th>
    <th class="tc">Détail</th>`;

  const headersCv = `
    <th>#</th><th>Item</th><th class="tc">Niv.</th>
    <th class="tr" title="Coefficient de brisage">Coeff.</th>
    <th class="tr">Coût craft</th>
    <th class="tr">Prix HDV ×1</th>
    <th class="tr">Marge nette</th>
    <th class="tr">ROI</th>
    <th class="tc">Détail</th>`;

  const rowHtml = top.map((r, idx) => {
    const badge = r.type ? `<span class="badge" style="margin-left:.3rem;font-size:.68rem;vertical-align:middle">${r.type}</span>` : '';
    const roiColor = r.roi != null ? (r.roi >= 0.1 ? 'var(--green)' : r.roi >= 0 ? 'var(--orange)' : 'var(--red)') : 'var(--text-500)';
    const roiTxt   = r.roi != null ? `${r.roi >= 0 ? '+' : ''}${Math.round(r.roi * 100)}%` : '—';

    if (mode === 'brisage') {
      const valCell = runePrice > 0 && r.brisageValue != null ? fmtKa(r.brisageValue) : '—';
      const netCell = r.net != null
        ? `<span class="profit-badge ${r.net >= 0 ? 'pos' : 'neg'}">${r.net >= 0 ? '+' : ''}${fmtKa(r.net)}</span>`
        : '<span style="color:var(--text-500)">—</span>';
      return `<tr>
        <td style="color:var(--text-500);font-size:.78rem">${idx + 1}</td>
        <td><strong>${r.name}</strong>${badge}</td>
        <td class="tc" style="color:var(--text-500);font-size:.82rem;font-weight:600">${r.level ?? '—'}</td>
        <td class="tr" style="color:var(--text-300);font-size:.82rem">${r.brisagePA ?? '—'}</td>
        <td class="tr" style="font-weight:600">${r.runesEst}</td>
        <td class="tr">${fmtKa(r.craftCost)}</td>
        <td class="tr">${valCell}</td>
        <td class="tr">${netCell}</td>
        <td class="tr"><span style="color:${roiColor};font-weight:700">${roiTxt}</span></td>
        <td class="tc"><button class="btn-sm" onclick="${detailFn}(${r.id})">🔎 Voir</button></td>
      </tr>`;
    } else {
      return `<tr>
        <td style="color:var(--text-500);font-size:.78rem">${idx + 1}</td>
        <td><strong>${r.name}</strong>${badge}</td>
        <td class="tc" style="color:var(--text-500);font-size:.82rem;font-weight:600">${r.level ?? '—'}</td>
        <td class="tr" style="color:var(--text-300);font-size:.82rem">${r.brisagePA ?? '—'}</td>
        <td class="tr">${fmtKa(r.craftCost)}</td>
        <td class="tr">${fmtKa(r.hdvPrice)}</td>
        <td class="tr"><span class="profit-badge ${r.net >= 0 ? 'pos' : 'neg'}">${r.net >= 0 ? '+' : ''}${fmtKa(r.net)}</span></td>
        <td class="tr"><span style="color:${roiColor};font-weight:700">${roiTxt}</span></td>
        <td class="tc"><button class="btn-sm" onclick="${detailFn}(${r.id})">🔎 Voir</button></td>
      </tr>`;
    }
  }).join('');

  wrap.innerHTML = `
    <div class="overflow-x" style="margin-top:.75rem">
      <table class="tbl">
        <thead><tr>${mode === 'brisage' ? headersBrisage : headersCv}</tr></thead>
        <tbody>${rowHtml}</tbody>
      </table>
    </div>
    <div style="padding:.5rem;font-size:.72rem;color:var(--text-500);text-align:center">
      ${rows.length} items analysés · top ${top.length} affiché${top.length > 1 ? 's' : ''}
      · budget ${budget === Infinity ? 'illimité' : fmtKa(budget)}
      ${mode === 'brisage' && runePrice === 0 ? ' · <em>Entrez un prix de Rune Ba pour voir la marge et le ROI</em>' : ''}
    </div>
  `;

  if (btn) { btn.disabled = false; btn.textContent = '🚀 Calculer le classement'; }
}

/* ── Classement Brisage ── */
async function briRankItems() {
  await runCraftRanking({
    btnId: 'bri-rank-btn', wrapId: 'bri-rank-results',
    budgetId: 'bri-budget', sortId: 'bri-sort',
    typeFilterId: 'bri-type-filter',
    detailFn: 'briLoadItemById',
    mode: 'brisage',
    runePriceId: 'bri-rune-price',
  });
}

/* ── Classement Craft → Vente ── */
async function cvRankItems() {
  await runCraftRanking({
    btnId: 'cv-rank-btn', wrapId: 'cv-rank-results',
    budgetId: 'cv-budget', sortId: 'cv-sort',
    minPriceId: 'cv-min-price',
    typeFilterId: 'cv-type-filter',
    detailFn: 'cvLoadItemById',
  });
}

async function cvLoadItemById(id) {
  /* Scroll vers le calculateur + charge le détail dans l'onglet brisage */
  document.querySelector('.fm-stab[data-stab="brisage"]')?.click();
  await briLoadItemById(id);
}

async function briLoadItemById(id) {
  briLoading();
  /* Scroll vers le calculateur individuel */
  document.getElementById('bri-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const detail = await getEquipment(id);
    await buildBrisage(detail);
    /* Met à jour la barre de recherche */
    const inp = document.getElementById('bri-search');
    if (inp) inp.value = detail.name || '';
  } catch (e) { briError('Erreur chargement : ' + e.message); }
}

/* ── Import fichier JSON de prix ── */
document.getElementById('icfg-import-file')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const el = document.getElementById('icfg-dump-status');
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    /* Cas 1 : fichier dump complet { ts, count, prices } */
    if (data.prices && typeof data.prices === 'object') {
      localStorage.setItem(DUMP_KEY, JSON.stringify(data));
      _priceDump = data;
      if (el) { el.className = 'icfg-dump-status ok'; el.textContent = `✅ ${Object.keys(data.prices).length} prix importés`; }
    }
    /* Cas 2 : fichier craft-data [ {itemID, ...} ] */
    else if (Array.isArray(data) && data[0]?.itemID !== undefined) {
      localStorage.setItem(CRAFT_DATA_KEY, JSON.stringify(data));
      if (el) { el.className = 'icfg-dump-status ok'; el.textContent = `✅ craft-data importé (${data.length} recettes)`; }
    }
    /* Cas 3 : bundle { dump, craftData } */
    else if (data.dump && data.craftData) {
      localStorage.setItem(DUMP_KEY, JSON.stringify(data.dump));
      localStorage.setItem(CRAFT_DATA_KEY, JSON.stringify(data.craftData));
      _priceDump = data.dump;
      if (el) { el.className = 'icfg-dump-status ok'; el.textContent = `✅ ${Object.keys(data.dump.prices).length} prix + ${data.craftData.length} recettes importés`; }
    }
    /* Cas 4 : fichier coefficients de brisage { [itemId]: paValue } */
    else if (
      typeof data === 'object' && !Array.isArray(data) &&
      !data.ts && !data.prices && !data.dump && !data.craftData &&
      Object.keys(data).length > 0 &&
      typeof Object.values(data)[0] === 'number'
    ) {
      localStorage.setItem(BRISAGE_KEY, JSON.stringify(data));
      if (el) { el.className = 'icfg-dump-status ok'; el.textContent = `✅ ${Object.keys(data).length} coefficients de brisage importés`; }
    }
    else {
      throw new Error('Format non reconnu');
    }
    imagiroUpdateDumpStatus();
  } catch (err) {
    if (el) { el.className = 'icfg-dump-status err'; el.textContent = `❌ Erreur import : ${err.message}`; }
  }
  /* Reset input pour permettre re-import du même fichier */
  e.target.value = '';
});

/* ── Restauration au chargement de la page ── */
craftRestoreState();
fmRestoreState();
craftRenderObjectives();
craftRenderHistory();
/* Mise à jour du statut cache au démarrage */
setTimeout(imagiroUpdateDumpStatus, 200);
