import { Router, Request, Response } from 'express';
import { getResource, getResourceBatch, getEquipmentAll } from '../dofusApi';

const router = Router();

// GET /api/resources/batch?ids=1,2,3
router.get('/resources/batch', async (req: Request, res: Response) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map(Number)
      .filter(Boolean);
    const data = await getResourceBatch(ids);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// GET /api/resources/:ressourceId
router.get('/resources/:ressourceId', async (req: Request, res: Response) => {
  try {
    const { ressourceId } = req.params;
    const data = await getResource(ressourceId);
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(404).json({ error: message });
  }
});

// GET /api/equipment?lvlmin=1&lvlmax=200&itemTypes=sword,axe,hammer
router.get('/equipment', async (req: Request, res: Response) => {
  try {
    const lvlmin = req.query.lvlmin ? Number(req.query.lvlmin) : undefined;
    const lvlmax = req.query.lvlmax ? Number(req.query.lvlmax) : undefined;
    const itemTypesParam = req.query.itemTypes as string | undefined;

    if (itemTypesParam) {
      const types = itemTypesParam.split(',').filter(Boolean);
      const results = await Promise.all(
        types.map(t => getEquipmentAll({ lvlmin, lvlmax, itemType: t }))
      );
      const items = results.flatMap((r: any) => (r.items ?? []));
      res.json({ items });
    } else {
      const data = await getEquipmentAll({ lvlmin, lvlmax });
      res.json(data);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
