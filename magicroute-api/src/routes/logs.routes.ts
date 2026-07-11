import { Router, Request, Response } from 'express';
import { executeQuery } from '../config/database';
import { sanitize, requireParam } from '../services/sql.service';

const router = Router();

/**
 * Função utilitária para registrar log no banco do SQL Server.
 * Pode ser chamada internamente ou via API.
 */
export async function registrarLogInterno(params: {
  idEmpresa: number;
  idLote: number | null;
  usuario: string;
  tipoAcao: string;
  descricao: string;
}) {
  try {
    const cleanUser = sanitize(params.usuario || 'Sistema');
    const cleanAcao = sanitize(params.tipoAcao || 'ACAO');
    const cleanDesc = sanitize(params.descricao || '');
    const loteVal = params.idLote ? Number(params.idLote) : 'NULL';

    const query = `
      INSERT INTO startapp_magicroute..LogsMagicRoute (IDEmpresa, IDLote, Usuario, TipoAcao, Descricao, DataCriacao, Lido)
      VALUES (${Number(params.idEmpresa)}, ${loteVal}, '${cleanUser}', '${cleanAcao}', '${cleanDesc}', GETDATE(), 0)
    `;
    await executeQuery(query);
  } catch (err: any) {
    console.error('[ERRO REGISTRAR LOG]', err.message);
  }
}

/**
 * POST /api/logs/criar
 * Cria um novo registro de log
 */
router.post('/criar', async (req: Request, res: Response) => {
  const { IDEmpresa, IDLote, Usuario, TipoAcao, Descricao } = req.body;
  
  if (!IDEmpresa) {
    return res.status(400).json({ sucesso: false, erro: 'IDEmpresa é obrigatório.' });
  }

  await registrarLogInterno({
    idEmpresa: Number(IDEmpresa),
    idLote: IDLote ? Number(IDLote) : null,
    usuario: Usuario || 'Sistema',
    tipoAcao: TipoAcao || 'OUTRO',
    descricao: Descricao || ''
  });

  return res.json({ sucesso: true });
});

/**
 * GET /api/logs
 * Recupera logs da empresa (e opcionalmente do lote)
 */
router.get('/', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const idLote = req.query.IDLote ? Number(req.query.IDLote) : null;
  const apenasNaoLidos = req.query.ApenasNaoLidos === 'true';
  const limite = req.query.Limite ? Number(req.query.Limite) : 50;

  try {
    let query = `
      SELECT TOP ${limite} IDLog, IDEmpresa, IDLote, Usuario, TipoAcao, Descricao, DataCriacao, Lido
      FROM startapp_magicroute..LogsMagicRoute
      WHERE IDEmpresa = ${Number(idEmpresa)}
    `;

    if (idLote !== null && !isNaN(idLote)) {
      query += ` AND IDLote = ${idLote}`;
    }

    if (apenasNaoLidos) {
      query += ` AND Lido = 0`;
    }

    query += ` ORDER BY IDLog DESC`;

    const logs = await executeQuery(query);
    res.json(logs);
  } catch (err: any) {
    console.error('[ERRO BUSCAR LOGS]', err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

/**
 * POST /api/logs/marcar-lidos
 * Marca os logs como lidos
 */
router.post('/marcar-lidos', async (req: Request, res: Response) => {
  const { IDEmpresa, IDLote, IDs } = req.body;
  
  const cleanEmpresa = Number(IDEmpresa);
  if (!IDEmpresa || isNaN(cleanEmpresa)) {
    return res.status(400).json({ sucesso: false, erro: 'IDEmpresa é obrigatória e deve ser um número válido.' });
  }

  try {
    let query = `
      UPDATE startapp_magicroute..LogsMagicRoute
      SET Lido = 1
      WHERE IDEmpresa = ${cleanEmpresa} AND Lido = 0
    `;

    const cleanLote = Number(IDLote);
    if (IDLote !== undefined && IDLote !== null && IDLote !== 'undefined' && IDLote !== 'null' && !isNaN(cleanLote)) {
      query += ` AND IDLote = ${cleanLote}`;
    }

    if (Array.isArray(IDs) && IDs.length > 0) {
      const idsSanitized = IDs.map(Number).filter(id => !isNaN(id)).join(',');
      if (idsSanitized) {
        query += ` AND IDLog IN (${idsSanitized})`;
      }
    }

    await executeQuery(query);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('[ERRO MARCAR LIDOS]', err.message);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

export default router;
