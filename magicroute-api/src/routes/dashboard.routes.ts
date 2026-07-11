import { Router, Request, Response } from 'express';
import { execAndRespond, sanitize, requireParam } from '../services/sql.service';

const router = Router();

/**
 * GET /api/dashboard
 * Retorna KPIs do dashboard
 */
router.get('/', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const query = `SELECT * FROM startapp_magicroute..DadosDashBoard(${idEmpresa})`;
  await execAndRespond(query, res);
});

export default router;
