import sql from 'mssql';

// Configuração do SQL Server
// Instância: TIDSCI_2022 (conforme informado pelo usuário)
const sqlConfig: sql.config = {
  user: 'sa',
  password: 'tid@125632',
  server: 'localhost',
  database: 'startapp_magicroute',
  options: {
    instanceName: 'TIDSCI_2022',
    encrypt: false,
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
  request.timeout = 300000; // 5 minutos para otimizações pesadas
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
