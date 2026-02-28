const DOFUS_API_BASE = 'https://api.dofusdu.de/dofus3/v1/fr';

export async function getResource(ressourceId: number | string) {
  const url = `${DOFUS_API_BASE}/items/resources/${ressourceId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Ressource ${ressourceId} introuvable (${response.status})`);
  }

  return response.json();
}

export async function getResourceBatch(ids: number[]): Promise<Record<number, { name: string }>> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await fetch(`${DOFUS_API_BASE}/items/resources/${id}`);
        if (!response.ok) return [id, null] as const;
        const data = await response.json() as { name: string };
        return [id, { name: data.name }] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  return Object.fromEntries(results.filter(([, v]) => v !== null)) as Record<number, { name: string }>;
}

export interface EquipmentQuery {
  lvlmin?: number;
  lvlmax?: number;
  itemType?: string;
}

export async function getEquipmentAll(params: EquipmentQuery = {}) {
  const query = new URLSearchParams();

  query.set('sort[level]', 'desc');

  if (params.lvlmin !== undefined) {
    query.set('filter[min_level]', String(params.lvlmin));
  }
  if (params.lvlmax !== undefined) {
    query.set('filter[max_level]', String(params.lvlmax));
  }
  if (params.itemType) {
    query.set('filter[type.name_id]', params.itemType);
  }

  const url = `${DOFUS_API_BASE}/items/equipment/all?${query.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération des équipements (${response.status})`);
  }

  return response.json();
}
