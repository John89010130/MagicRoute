"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sql_service_1 = require("../services/sql.service");
const router = (0, express_1.Router)();
/**
 * GET /api/dashboard
 * Retorna KPIs do dashboard
 */
router.get('/', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const query = `SELECT * FROM startapp_magicroute..DadosDashBoard(${idEmpresa})`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map