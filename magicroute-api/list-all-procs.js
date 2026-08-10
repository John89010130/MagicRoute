const mssql = require('mssql');

const config = {
  user: 'sa',
  password: 'Startapp2024',
  server: '184.107.160.127',
  port: 1433,
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 15000
  }
};

async function run() {
  const pool = await mssql.connect(config);

  const dbs = ['startapp_magicroute', 'master', 'msdb'];
  for (const db of dbs) {
    try {
      const res = await pool.request().query(`SELECT name FROM ${db}.sys.procedures`);
      console.log(`\n=== PROCEDURES BANCO ${db} ===`);
      console.table(res.recordset);
    } catch (e) {
      console.log(`Erro ao listar ${db}:`, e.message);
    }
  }

  await pool.close();
}

run().catch(console.error);
