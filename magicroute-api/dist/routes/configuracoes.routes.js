"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const sql_service_1 = require("../services/sql.service");
const router = (0, express_1.Router)();
/**
 * GET /api/configuracoes/empresa/:idEmpresa
 * Retorna as configurações globais de uma empresa
 */
router.get('/empresa/:idEmpresa', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.params.idEmpresa || '');
    if (!idEmpresa)
        return res.status(400).json({ erro: 'ID da Empresa não informado.' });
    try {
        const empresas = await (0, database_1.executeQuery)(`
      SELECT IDEmpresa, TempoAtendimentoPadrao, ISNULL(PermiteMotoristaRoteirizar, 0) AS PermiteMotoristaRoteirizar
      FROM startapp_magicroute..Empresas 
      WHERE IDEmpresa = ${Number(idEmpresa)}
    `);
        if (empresas.length > 0) {
            res.json(empresas[0]);
        }
        else {
            res.status(404).json({ erro: 'Empresa não encontrada.' });
        }
    }
    catch (err) {
        res.status(500).json({ erro: err.message });
    }
});
/**
 * PATCH /api/configuracoes/empresa
 * Atualiza configurações globais da empresa
 */
router.patch('/empresa', async (req, res) => {
    const { IDEmpresa, TempoAtendimentoPadrao, PermiteMotoristaRoteirizar } = req.body;
    if (!IDEmpresa)
        return res.status(400).json({ sucesso: false, mensagem: 'ID da Empresa não informado.' });
    try {
        let updates = [];
        if (TempoAtendimentoPadrao !== undefined) {
            updates.push(`TempoAtendimentoPadrao = ${Number(TempoAtendimentoPadrao)}`);
        }
        if (PermiteMotoristaRoteirizar !== undefined) {
            updates.push(`PermiteMotoristaRoteirizar = ${PermiteMotoristaRoteirizar ? 1 : 0}`);
        }
        if (updates.length > 0) {
            await (0, database_1.executeQuery)(`
        UPDATE startapp_magicroute..Empresas 
        SET ${updates.join(', ')}
        WHERE IDEmpresa = ${Number(IDEmpresa)}
      `);
        }
        res.json({ sucesso: true, mensagem: 'Configurações atualizadas com sucesso.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=configuracoes.routes.js.map