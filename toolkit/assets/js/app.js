'use strict';

/* ================================================================
   CONSTANTS (shared across all modules)
================================================================ */
const API = 'https://api.dofusdu.de/dofus3/v1/fr';
const TAX = 0.02;   // 2 % taxe HDV
const SR  = 0.5;    // success rate FM

/* ================================================================
   UTILS
================================================================ */
const $  = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function fmtKa(n) {
  if (n == null || isNaN(n)) return '—';
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2).replace('.', ',') + ' M kamas';
  return v.toLocaleString('fr-FR') + ' kamas';
}

function imgEl(src, cls, alt) {
  if (!src) return '';
  return `<img src="${src}" class="${cls}" alt="${alt||''}" onerror="this.style.display='none'">`;
}

/* ================================================================
   API HELPERS
================================================================ */
async function apiFetch(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function normaliseList(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.data || [];
}

async function searchEquipment(q) {
  try { return normaliseList(await apiFetch(`/items/equipment/search?query=${encodeURIComponent(q)}&limit=15`)); }
  catch { return []; }
}

async function getEquipment(id) { return apiFetch(`/items/equipment/${id}`); }

async function searchResources(q) {
  try { return normaliseList(await apiFetch(`/items/resources/search?query=${encodeURIComponent(q)}&limit=15`)); }
  catch { return []; }
}

async function getResource(id) {
  try { return await apiFetch(`/items/resources/${id}`); } catch { return null; }
}

async function getConsumable(id) {
  try { return await apiFetch(`/items/consumables/${id}`); } catch { return null; }
}

async function getAnyItem(id, subtype) {
  const s = (subtype || '').toLowerCase();
  if (s.includes('resource'))   return getResource(id);
  if (s.includes('consumable')) return getConsumable(id);
  return (await getResource(id)) || (await getConsumable(id)) || null;
}

/* ================================================================
   IMAGIRO PRICE API  (imagiro.laboubourse.com)
================================================================ */
const IMAGIRO = 'https://imagiro.laboubourse.com/api';

/* Proxy local (proxy.js — node proxy.js CF_VALUE AUTH_VALUE) */
const IMAGIRO_LOCAL = 'http://localhost:3001';

/** Envoie les credentials stockés au proxy (appelé au démarrage) */
async function imagiroSyncCreds() {
  const cf   = localStorage.getItem('imagiro_cf')   || '';
  const auth = localStorage.getItem('imagiro_auth') || '';
  if (!cf) return;
  try {
    await fetch(`${IMAGIRO_LOCAL}/config`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cf_clearance: cf, auth_token: auth }),
      signal:  AbortSignal.timeout(2000),
    });
  } catch { /* proxy non démarré, pas grave */ }
}

/**
 * Fetch une URL imagiro via le proxy local (localhost:3001).
 * Nécessite que `node proxy.js` soit lancé.
 */
async function imagiroFetch(path) {
  try {
    const r = await fetch(`${IMAGIRO_LOCAL}/api${path}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      if (!d?.error) return d;
      throw new Error(d.message || d.error);
    }
    throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    throw new Error('proxy_unavailable: ' + e.message);
  }
}

/** Vérifie si le proxy est actif et renvoie son statut */
async function imagiroProxyStatus() {
  try {
    const r = await fetch(`${IMAGIRO_LOCAL}/status`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) return await r.json();
  } catch { /* proxy non démarré */ }
  return null;
}

/* Sync des credentials au chargement de la page */
imagiroSyncCreds();

/* ================================================================
   PRICE DUMP — cache local de tous les prix imagiro
================================================================ */
const DUMP_KEY       = 'imagiro_dump';
const CRAFT_DATA_KEY = 'imagiro_craft_data';
const BRISAGE_KEY    = 'dofus_brisage_pa';

/** Retourne le dump chargé en mémoire (rapide) ou depuis localStorage */
let _priceDump = null;
function getPriceDump() {
  if (_priceDump) return _priceDump;
  try {
    const raw = localStorage.getItem(DUMP_KEY);
    if (raw) { _priceDump = JSON.parse(raw); return _priceDump; }
  } catch { /* ignore */ }
  return null;
}

/**
 * Retourne les prix en cache pour un item_id.
 * Format retourné : { p1, p10, p100, avg, date, name } ou null
 */
function getPriceCached(itemId) {
  const dump = getPriceDump();
  return dump?.prices?.[+itemId] ?? null;
}

/**
 * Retourne les craft data en cache.
 * Format : [ { itemID, Name, Ingredients: [...], Quantity: [...] } ]
 */
function getCraftData() {
  try {
    const raw = localStorage.getItem(CRAFT_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Retourne les coefficients de brisage pré-calculés (depuis export DofusDude).
 * Format : { [itemId]: paValue }  — vide si pas encore exportés.
 */
function getBrisageCoeffs() {
  try {
    const raw = localStorage.getItem(BRISAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/**
 * Télécharge TOUS les prix HDV depuis imagiro et les stocke en cache.
 * Stratégie : categories → items par catégorie → merge.
 * onProgress(done, total, catName) appelé à chaque catégorie.
 */
async function downloadPriceDump(onProgress) {
  /* 1. Récupère les catégories HDV */
  const cats = await imagiroFetch('/hdv/categories');
  if (!Array.isArray(cats) || !cats.length) throw new Error('Aucune catégorie retournée');

  const prices = {};
  const total  = cats.length;

  /* 2. Pour chaque catégorie, récupère les items avec prix */
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    onProgress?.(i, total, cat.name);
    try {
      const data  = await imagiroFetch(`/hdv/items?category_id=${cat.category_id}&limit=1000`);
      const items = Array.isArray(data) ? data : (data?.items || []);
      items.forEach(it => {
        prices[+it.item_id] = {
          p1:   it.price_1   || 0,
          p10:  it.price_10  || 0,
          p100: it.price_100 || 0,
          avg:  it.price_avg || 0,
          date: it.inserted_at || '',
          name: it.name || '',
        };
      });
    } catch { /* une catégorie en erreur → on continue */ }
    /* Petit délai pour ne pas saturer l'API */
    await new Promise(r => setTimeout(r, 80));
  }

  onProgress?.(total, total, 'Finalisation…');

  /* 3. Récupère aussi craft-data pour le module Brisage */
  try {
    const craftRaw = await imagiroFetch('/craft-data');
    if (Array.isArray(craftRaw)) {
      localStorage.setItem(CRAFT_DATA_KEY, JSON.stringify(craftRaw));
    }
  } catch { /* optionnel */ }

  /* 4. Persiste le dump */
  const dump = { ts: Date.now(), count: Object.keys(prices).length, prices };
  localStorage.setItem(DUMP_KEY, JSON.stringify(dump));
  _priceDump = dump;
  return dump;
}

/**
 * Fetch live HDV prices pour une liste d'IDs.
 * Utilise le cache local (dump) si disponible, sinon appelle l'API.
 * Retourne [ { item_id, price_1, price_10, price_100, price_avg, inserted_at } ]
 */
async function getItemPrices(itemIds) {
  const ids = (Array.isArray(itemIds) ? itemIds : [itemIds]).map(Number);

  /* Tentative depuis le cache */
  const dump = getPriceDump();
  if (dump) {
    const result = ids.map(id => {
      const p = dump.prices[id];
      if (!p) return null;
      return { item_id: id, name: p.name, price_1: p.p1, price_10: p.p10,
               price_100: p.p100, price_avg: p.avg, inserted_at: p.date };
    }).filter(Boolean);
    if (result.length) return result;
  }

  /* Fallback : appel API via proxy */
  try {
    const data = await imagiroFetch(`/item-price?item_ids=${ids.join(',')}`);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/**
 * Fetch price history for a single item.
 * Returns an array sorted by inserted_at desc or [] on error.
 */
async function getItemPriceHistory(itemId) {
  try {
    const data = await imagiroFetch(`/price-history?item_id=${itemId}`);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/* ================================================================
   SEARCH COMPONENT FACTORY
================================================================ */
function makeSearch({ inputId, clearId, dropId, fetchFn, onPick }) {
  const inp   = $(inputId);
  const clear = $(clearId);
  const drop  = $(dropId);
  let items   = [];

  const run = debounce(async q => {
    if (q.length < 2) { drop.classList.remove('open'); return; }
    drop.innerHTML = `<div class="drop-state"><span class="spin"></span> Recherche…</div>`;
    drop.classList.add('open');
    items = await fetchFn(q);
    if (!items.length) { drop.innerHTML = `<div class="drop-state">Aucun résultat pour « ${q} »</div>`; return; }
    drop.innerHTML = items.map(it => {
      const ico = it.image_urls?.icon || '';
      const lvl = it.level ? `Niv. ${it.level}` : '';
      const typ = it.type?.name || '';
      return `
        <div class="drop-item" data-id="${it.ankama_id}">
          ${ico ? `<img src="${ico}" class="drop-img" alt="" onerror="this.style.display='none'">` : ''}
          <div>
            <div class="drop-name">${it.name}</div>
            ${typ ? `<div class="drop-meta">${typ}</div>` : ''}
          </div>
          <span class="drop-lvl">${lvl}</span>
        </div>`;
    }).join('');
    drop.querySelectorAll('.drop-item').forEach(d => {
      d.addEventListener('click', () => {
        const found = items.find(i => String(i.ankama_id) === d.dataset.id);
        if (!found) return;
        inp.value = found.name;
        clear.classList.add('vis');
        drop.classList.remove('open');
        onPick(found);
      });
    });
  }, 380);

  inp.addEventListener('input', e => {
    const q = e.target.value.trim();
    clear.classList.toggle('vis', q.length > 0);
    run(q);
  });
  inp.addEventListener('focus', () => {
    if (inp.value.trim().length >= 2) drop.classList.add('open');
  });
  clear.addEventListener('click', () => {
    inp.value = ''; clear.classList.remove('vis'); drop.classList.remove('open');
  });
}

/* ================================================================
   TAB SWITCHING  (+ lazy stats init)
================================================================ */
let statsInitialized = false;

document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    $(`module-${btn.dataset.tab}`)?.classList.add('active');
    document.querySelectorAll('.search-drop').forEach(d => d.classList.remove('open'));

    if (btn.dataset.tab === 'stats' && !statsInitialized) {
      statsInitialized = true;
      if (typeof window.statsAutoLoad === 'function') window.statsAutoLoad();
    }
    if (btn.dataset.tab === 'item-meta') {
      if (typeof window.itemMetaInit === 'function') window.itemMetaInit();
    }
  });
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap'))
    document.querySelectorAll('.search-drop').forEach(d => d.classList.remove('open'));
});
