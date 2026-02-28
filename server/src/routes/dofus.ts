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

// GET /api/equipment?lvlmin=1&lvlmax=200&itemType=sword
router.get('/equipment', async (req: Request, res: Response) => {
  try {
    const lvlmin = req.query.lvlmin ? Number(req.query.lvlmin) : undefined;
    const lvlmax = req.query.lvlmax ? Number(req.query.lvlmax) : undefined;
    const itemType = req.query.itemType as string | undefined;

    const data = await getEquipmentAll({ lvlmin, lvlmax, itemType });
    res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
