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

  console.log('=== VERIFICANDO PROCEDURES ExecutaRoteirizacao ===');
  
  const dbs = ['master', 'master2', 'startapp_magicroute'];
  for (const db of dbs) {
    try {
      const res = await pool.request().query(`SELECT OBJECT_DEFINITION(OBJECT_ID('${db}..ExecutaRoteirizacao')) AS ProcDef`);
      if (res.recordset[0]?.ProcDef) {
        console.log(`\n=================== PROCEDURE EM ${db}..ExecutaRoteirizacao ===================`);
        console.log(res.recordset[0].ProcDef);
      } else {
        console.log(`\nProcedure ${db}..ExecutaRoteirizacao não encontrada ou sem definição.`);
      }
    } catch (err) {
      console.log(`Erro ao buscar em ${db}:`, err.message);
    }
  }

  await pool.close();
}

run().catch(console.error);
