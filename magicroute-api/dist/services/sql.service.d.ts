import { Response } from 'express';
/**
 * Executa uma query SQL e retorna o resultado como JSON.
 * Replica o comportamento do ExecSQLQuery do .NET original.
 */
export declare function execAndRespond(query: string, res: Response): Promise<void>;
/**
 * Sanitiza string para evitar SQL Injection básico
 * (replica o .Replace("'", "''") do .NET original)
 */
export declare function sanitize(value: string): string;
/**
 * Valida se parâmetro obrigatório foi fornecido
 */
export declare function requireParam(value: string | undefined, paramName: string, res: Response): boolean;
//# sourceMappingURL=sql.service.d.ts.map