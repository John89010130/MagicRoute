import { executeQuery } from '../config/database';
import { Response } from 'express';

/**
 * Executa uma query SQL e retorna o resultado como JSON.
 * Replica o comportamento do ExecSQLQuery do .NET original.
 */
export async function execAndRespond(query: string, res: Response): Promise<void> {
  try {
    const result = await executeQuery(query);
    res.json(result);
  } catch (error: any) {
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
export function sanitize(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Valida se parâmetro obrigatório foi fornecido
 */
export function requireParam(
  value: string | undefined,
  paramName: string,
  res: Response
): boolean {
  if (!value || value.trim() === '') {
    res.status(400).json({ message: `Parâmetro ${paramName} não fornecido.` });
    return false;
  }
  return true;
}
