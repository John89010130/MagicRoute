"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
const VALID_API_KEY = 'minha-chave-secreta-123';
async function apiKeyAuth(req, res, next) {
    // Libera rotas de health check
    if (req.path === '/' || req.path === '/api/health') {
        next();
        return;
    }
    const apiKey = req.headers['x-api-key'];
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
//# sourceMappingURL=auth.js.map