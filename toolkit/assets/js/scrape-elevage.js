/**
 * SCRAPER — dofuspourlesnoobs.com/guide-de-l-eleveur.html
 * À coller dans la console (F12) une fois la page ouverte.
 * Télécharge : HTML · texte · images · tableaux en JSON
 */
(async () => {

  /* ── Helper download ──────────────────────────────────── */
  function dl(content, filename, type = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: filename, style: 'display:none'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const pause = ms => new Promise(r => setTimeout(r, ms));

  console.log('🐾 Scraper élevage — démarrage…');

  /* ── 1. Page HTML complète ────────────────────────────── */
  dl(document.documentElement.outerHTML, 'elevage-guide.html', 'text/html;charset=utf-8');
  console.log('✅ HTML téléchargé');

  /* ── 2. Contenu texte (article principal) ─────────────── */
  const container =
    document.querySelector('article')         ||
    document.querySelector('.entry-content')  ||
    document.querySelector('.post-content')   ||
    document.querySelector('main')            ||
    document.querySelector('#content')        ||
    document.body;

  dl(container.innerText, 'elevage-guide.txt');
  console.log('✅ Texte téléchargé');

  /* ── 3. Tableaux → JSON ───────────────────────────────── */
  const tables = [...document.querySelectorAll('table')].map((tbl, ti) => {
    const headers = [...tbl.querySelectorAll('th')].map(th => th.innerText.trim());
    const rows    = [...tbl.querySelectorAll('tr')].map(tr =>
      [...tr.querySelectorAll('td, th')].map(td => td.innerText.trim())
    ).filter(r => r.length);
    return { index: ti, headers, rows };
  });

  if (tables.length) {
    dl(JSON.stringify(tables, null, 2), 'elevage-tables.json', 'application/json');
    console.log(`✅ ${tables.length} tableau(x) exporté(s) en JSON`);
  }

  /* ── 4. Images ────────────────────────────────────────── */
  const allImgs = [...document.querySelectorAll('img')]
    .map(img => ({
      src      : img.src,
      alt      : img.alt || '',
      natural  : `${img.naturalWidth}×${img.naturalHeight}`,
      filename : decodeURIComponent(img.src.split('/').pop().split('?')[0]) || 'image.png'
    }))
    .filter(img =>
      img.src &&
      !img.src.startsWith('data:') &&
      img.src.startsWith('http')
    );

  console.log(`📷 ${allImgs.length} image(s) trouvée(s) — téléchargement…`);

  let ok = 0, fail = 0;
  for (const img of allImgs) {
    try {
      const res = await fetch(img.src, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      dl(blob, img.filename);
      console.log(`  ⬇️  ${img.filename} (${img.natural})`);
      ok++;
      await pause(350); // évite le rate-limit
    } catch (e) {
      console.warn(`  ⚠️  Échec : ${img.src} — ${e.message}`);
      fail++;
    }
  }

  /* ── 5. Rapport final ─────────────────────────────────── */
  const report = {
    url      : location.href,
    date     : new Date().toISOString(),
    images   : { total: allImgs.length, ok, fail, list: allImgs },
    tables   : tables.length,
    textLen  : container.innerText.length
  };
  dl(JSON.stringify(report, null, 2), 'elevage-report.json', 'application/json');

  console.log(`\n✅ Terminé !\n  Images : ${ok} OK / ${fail} échecs\n  Tableaux : ${tables.length}\n  Rapport : elevage-report.json`);

})();
