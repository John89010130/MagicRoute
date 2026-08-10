"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAndRespond = execAndRespond;
exports.sanitize = sanitize;
exports.requireParam = requireParam;
const database_1 = require("../config/database");
/**
 * Executa uma query SQL e retorna o resultado como JSON.
 * Replica o comportamento do ExecSQLQuery do .NET original.
 */
async function execAndRespond(query, res) {
    try {
        const result = await (0, database_1.executeQuery)(query);
        res.json(result);
    }
    catch (error) {
        console.error(`[ERRO SQL] ${error.message}`);
        console.error(`Query: ${query}`);
        res.status(500).json({
            error: error.message,
            query: query,
        });
    }
}
/**
 * Sanitiza string para evitar SQL Injection básico
 * (replica o .Replace("'", "''") do .NET original)
 */
function sanitize(value) {
    return value.replace(/'/g, "''");
}
/**
 * Valida se parâmetro obrigatório foi fornecido
 */
function requireParam(value, paramName, res) {
    if (!value || value.trim() === '') {
        res.status(400).json({ message: `Parâmetro ${paramName} não fornecido.` });
        return false;
    }
    return true;
}
//# sourceMappingURL=sql.service.js.map