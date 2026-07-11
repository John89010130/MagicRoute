import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../config/database';

const VALID_API_KEY = 'minha-chave-secreta-123';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Libera rotas de health check
  if (req.path === '/' || req.path === '/api/health') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ mensagem: 'Chave de API não informada.' });
    return;
  }

  // Validação simples (mesma lógica do .NET original)
  if (apiKey !== VALID_API_KEY) {
    // Pode também validar contra o banco:
    // const result = await executeQuery(`SELECT COUNT(*) as cnt FROM startapp_magicroute..Empresas WHERE ApiKey = '${apiKey}'`);
    res.status(401).json({ mensagem: 'API Key inválida.' });
    return;
  }

  next();
}
