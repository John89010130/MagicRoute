import { Router, Request, Response } from 'express';
import { executeQuery } from '../config/database';
import { sanitize } from '../services/sql.service';

const router = Router();

/**
 * GET /api/configuracoes/empresa/:idEmpresa
 * Retorna as configurações globais de uma empresa
 */
router.get('/empresa/:idEmpresa', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.params.idEmpresa || '');
  if (!idEmpresa) return res.status(400).json({ erro: 'ID da Empresa não informado.' });

  try {
    const empresas = await executeQuery(`
      SELECT IDEmpresa, TempoAtendimentoPadrao 
      FROM startapp_magicroute..Empresas 
      WHERE IDEmpresa = ${Number(idEmpresa)}
    `);
    
    if (empresas.length > 0) {
      res.json(empresas[0]);
    } else {
      res.status(404).json({ erro: 'Empresa não encontrada.' });
    }
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PATCH /api/configuracoes/empresa
 * Atualiza configurações globais da empresa
 */
router.patch('/empresa', async (req: Request, res: Response) => {
  const { IDEmpresa, TempoAtendimentoPadrao } = req.body;
  if (!IDEmpresa) return res.status(400).json({ sucesso: false, mensagem: 'ID da Empresa não informado.' });

  try {
    let updates = [];
    if (TempoAtendimentoPadrao !== undefined) {
      updates.push(`TempoAtendimentoPadrao = ${Number(TempoAtendimentoPadrao)}`);
    }

    if (updates.length > 0) {
      await executeQuery(`
        UPDATE startapp_magicroute..Empresas 
        SET ${updates.join(', ')}
        WHERE IDEmpresa = ${Number(IDEmpresa)}
      `);
    }
    
    res.json({ sucesso: true, mensagem: 'Configurações atualizadas com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

export default router;
