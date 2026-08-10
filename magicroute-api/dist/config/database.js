"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = void 0;
exports.getPool = getPool;
exports.executeQuery = executeQuery;
exports.executeQueryWithParams = executeQueryWithParams;
const mssql_1 = __importDefault(require("mssql"));
exports.sql = mssql_1.default;
// Configuração flexível do SQL Server (Ambiente Dev & Produção VPS)
const sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'tid@125632',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'startapp_magicroute',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    options: {
        ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : (!process.env.DB_SERVER || process.env.DB_SERVER === 'localhost' ? { instanceName: 'TIDSCI_2022' } : {})),
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};
let pool = null;
async function getPool() {
    if (!pool) {
        pool = await mssql_1.default.connect(sqlConfig);
        console.log('✅ Conectado ao SQL Server (TIDSCI_2022)');
    }
    return pool;
}
async function executeQuery(query) {
    const db = await getPool();
    const request = db.request();
    request.timeout = 300000; // 5 minutos para otimizações pesadas
    const result = await request.query(query);
    return result.recordset;
}
async function executeQueryWithParams(query, params) {
    const db = await getPool();
    const request = db.request();
    for (const [name, param] of Object.entries(params)) {
        request.input(name, param.type, param.value);
    }
    const result = await request.query(query);
    return result.recordset;
}
//# sourceMappingURL=database.js.map