import { Router, Request, Response } from 'express';
import { execAndRespond, sanitize } from '../services/sql.service';

const router = Router();

/**
 * POST /api/gps/gps-point
 * Grava uma nova coordenada GPS de trajeto
 */
router.post('/gps-point', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(String(req.body.IDEmpresa || ''));
  if (!idEmpresa) {
    res.status(400).json({ message: 'IDEmpresa é obrigatório' });
    return;
  }

  const idLote = sanitize(String(req.body.IDLote || ''));
  if (!idLote) {
    res.status(400).json({ message: 'IDLote é obrigatório' });
    return;
  }

  const numeroPedido = sanitize(String(req.body.NumeroPedido || ''));
  if (!numeroPedido) {
    res.status(400).json({ message: 'NumeroPedido é obrigatório' });
    return;
  }

  const latitude = Number(req.body.Latitude);
  const longitude = Number(req.body.Longitude);
  const accuracy = Number(req.body.Accuracy || 0);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({ message: 'Latitude e Longitude inválidas' });
    return;
  }

  const query = `INSERT INTO startapp_magicroute..caminhos_gps (IDEmpresa, IDLote, NumeroPedido, Latitude, Longitude, Accuracy)
    VALUES ('${idEmpresa}', '${idLote}', '${numeroPedido}', ${latitude}, ${longitude}, ${accuracy})`;
  
  await execAndRespond(query, res);
});

/**
 * GET /api/gps/gps-points/:idLote
 * Recupera todas as coordenadas registradas para um lote
 */
router.get('/gps-points/:idLote', async (req: Request, res: Response) => {
  const idLote = sanitize(req.params.idLote || '');
  if (!idLote) {
    res.status(400).json({ message: 'idLote é obrigatório' });
    return;
  }

  const query = `SELECT * FROM startapp_magicroute..caminhos_gps 
    WHERE IDLote = '${idLote}' 
    ORDER BY NumeroPedido, DataRegistro ASC`;
    
  await execAndRespond(query, res);
});

export default router;
