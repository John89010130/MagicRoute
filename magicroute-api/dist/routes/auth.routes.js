"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sql_service_1 = require("../services/sql.service");
const router = (0, express_1.Router)();
// ==========================================
// AUTENTICAÇÃO - MagicRoute (startapp_magicroute)
// ==========================================
/**
 * GET /api/auth/url-cliente
 * Busca empresa pelo CNPJ (MagicRoute)
 */
router.get('/url-cliente', async (req, res) => {
    const cnpj = (0, sql_service_1.sanitize)(req.query.CNPJ || '');
    if (!(0, sql_service_1.requireParam)(cnpj, 'CNPJ', res))
        return;
    const query = `SELECT * FROM startapp_magicroute..empresas WHERE CNPJ = '${cnpj}'`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * GET /api/auth/busca-usuario
 * Login de usuário (MagicRoute)
 */
router.get('/busca-usuario', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const rawTipoPessoa = req.query.TipoPessoa || '';
    if (!(0, sql_service_1.requireParam)(rawTipoPessoa, 'TipoPessoa', res))
        return;
    let tipoPessoa = 'M';
    if (rawTipoPessoa.toLowerCase() === 'administrador' || rawTipoPessoa.toUpperCase() === 'A') {
        tipoPessoa = 'A';
    }
    tipoPessoa = (0, sql_service_1.sanitize)(tipoPessoa);
    const codigo = (0, sql_service_1.sanitize)(req.query.Codigo || '');
    if (!(0, sql_service_1.requireParam)(codigo, 'Codigo', res))
        return;
    const senha = (0, sql_service_1.sanitize)(req.query.Senha || '');
    if (!(0, sql_service_1.requireParam)(senha, 'Senha', res))
        return;
    const query = `SELECT * FROM startapp_magicroute..Usuarios
    WHERE idempresa = '${idEmpresa}' AND tipopessoa = '${tipoPessoa}' AND codigo = '${codigo}' AND senha = '${senha}'`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
// ==========================================
// AUTENTICAÇÃO - App Rotas (apps)
// ==========================================
/**
 * GET /api/auth/empresa
 * Busca empresa pelo CNPJ (App Rotas)
 */
router.get('/empresa', async (req, res) => {
    const cnpj = (0, sql_service_1.sanitize)(req.query.cnpj || '');
    if (!(0, sql_service_1.requireParam)(cnpj, 'cnpj', res))
        return;
    const query = `SELECT * FROM apps..Empresas WHERE cnpj = REPLACE(REPLACE(REPLACE(CAST('${cnpj}' AS VARCHAR(100)),'.',''),'/',''),'-','')`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * GET /api/auth/login-motorista
 * Login do motorista (App Rotas)
 */
router.get('/login-motorista', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    if (!(0, sql_service_1.requireParam)(codigoMotorista, 'CodigoMotorista', res))
        return;
    const senhaMotorista = (0, sql_service_1.sanitize)(req.query.SenhaMotorista || '');
    if (!(0, sql_service_1.requireParam)(senhaMotorista, 'SenhaMotorista', res))
        return;
    const query = `SELECT CODIGOMOTORISTA as Codigo, SenhaMotorista as Senha, nome as Motorista
    FROM ${bd}..motoristas
    WHERE CODIGOMOTORISTA = ${codigoMotorista} AND SenhaMotorista = ${senhaMotorista}`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map