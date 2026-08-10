import sql from 'mssql';

// Configuração flexível do SQL Server (Ambiente Dev & Produção VPS)
const sqlConfig: sql.config = {
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

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
    console.log('✅ Conectado ao SQL Server (TIDSCI_2022)');
  }
  return pool;
}

export async function executeQuery<T = any>(query: string): Promise<T[]> {
  const db = await getPool();
  const request = db.request();
  (request as any).timeout = 300000; // 5 minutos para otimizações pesadas
  const result = await request.query(query);
  return result.recordset as T[];
}

export async function executeQueryWithParams(
  query: string,
  params: Record<string, { type: sql.ISqlTypeFactoryWithNoParams; value: any }>
): Promise<any[]> {
  const db = await getPool();
  const request = db.request();

  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type, param.value);
  }

  const result = await request.query(query);
  return result.recordset;
}

export { sql };
