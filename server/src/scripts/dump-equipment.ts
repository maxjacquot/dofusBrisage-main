/**
 * dump-equipment.ts
 * Récupère la totalité des équipements Dofus via l'API DofusDude
 * et sauvegarde le résultat dans dumps/equipment_all_YYYY-MM-DD.json
 *
 * Usage (depuis le dossier server/) :
 *   npx ts-node src/scripts/dump-equipment.ts
 */

import { getEquipmentAll } from '../dofusApi';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('⏳ Récupération de tous les équipements Dofus...');

  const data = await getEquipmentAll();

  const items: unknown[] = Array.isArray(data)
    ? data
    : (data as { items?: unknown[] }).items ?? [data];

  const date = new Date().toISOString().split('T')[0];
  const dumpsDir = join(__dirname, '../../../dumps');
  const outPath  = join(dumpsDir, `equipment_all_${date}.json`);

  mkdirSync(dumpsDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf-8');

  console.log(`✅ ${items.length} équipements sauvegardés → ${outPath}`);
}

main().catch(err => {
  console.error('❌ Erreur :', err.message ?? err);
  process.exit(1);
});
