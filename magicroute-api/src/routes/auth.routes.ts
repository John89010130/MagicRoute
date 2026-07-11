import { Router, Request, Response } from 'express';
import { execAndRespond, sanitize, requireParam } from '../services/sql.service';

const router = Router();

// ==========================================
// AUTENTICAÇÃO - MagicRoute (startapp_magicroute)
// ==========================================

/**
 * GET /api/auth/url-cliente
 * Busca empresa pelo CNPJ (MagicRoute)
 */
router.get('/url-cliente', async (req: Request, res: Response) => {
  const cnpj = sanitize(req.query.CNPJ as string || '');
  if (!requireParam(cnpj, 'CNPJ', res)) return;

  const query = `SELECT * FROM startapp_magicroute..empresas WHERE CNPJ = '${cnpj}'`;
  await execAndRespond(query, res);
});

/**
 * GET /api/auth/busca-usuario
 * Login de usuário (MagicRoute)
 */
router.get('/busca-usuario', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const rawTipoPessoa = req.query.TipoPessoa as string || '';
  if (!requireParam(rawTipoPessoa, 'TipoPessoa', res)) return;

  let tipoPessoa = 'M';
  if (rawTipoPessoa.toLowerCase() === 'administrador' || rawTipoPessoa.toUpperCase() === 'A') {
    tipoPessoa = 'A';
  }
  tipoPessoa = sanitize(tipoPessoa);

  const codigo = sanitize(req.query.Codigo as string || '');
  if (!requireParam(codigo, 'Codigo', res)) return;

  const senha = sanitize(req.query.Senha as string || '');
  if (!requireParam(senha, 'Senha', res)) return;

  const query = `SELECT * FROM startapp_magicroute..Usuarios
    WHERE idempresa = '${idEmpresa}' AND tipopessoa = '${tipoPessoa}' AND codigo = '${codigo}' AND senha = '${senha}'`;
  await execAndRespond(query, res);
});

// ==========================================
// AUTENTICAÇÃO - App Rotas (apps)
// ==========================================

/**
 * GET /api/auth/empresa
 * Busca empresa pelo CNPJ (App Rotas)
 */
router.get('/empresa', async (req: Request, res: Response) => {
  const cnpj = sanitize(req.query.cnpj as string || '');
  if (!requireParam(cnpj, 'cnpj', res)) return;

  const query = `SELECT * FROM apps..Empresas WHERE cnpj = REPLACE(REPLACE(REPLACE(CAST('${cnpj}' AS VARCHAR(100)),'.',''),'/',''),'-','')`;
  await execAndRespond(query, res);
});

/**
 * GET /api/auth/login-motorista
 * Login do motorista (App Rotas)
 */
router.get('/login-motorista', async (req: Request, res: Response) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;

  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;

  const senhaMotorista = sanitize(req.query.SenhaMotorista as string || '');
  if (!requireParam(senhaMotorista, 'SenhaMotorista', res)) return;

  const query = `SELECT CODIGOMOTORISTA as Codigo, SenhaMotorista as Senha, nome as Motorista
    FROM ${bd}..motoristas
    WHERE CODIGOMOTORISTA = ${codigoMotorista} AND SenhaMotorista = ${senhaMotorista}`;
  await execAndRespond(query, res);
});

export default router;
