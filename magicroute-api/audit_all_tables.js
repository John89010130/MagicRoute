const sql = require('mssql');

const prodConfig = {
  user: 'sa',
  password: 'Startapp2024',
  server: '184.107.160.127',
  database: 'startapp_magicroute',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function auditTables() {
  try {
    const pool = await sql.connect(prodConfig);
    console.log('--- AUDITORIA DE TABELAS NO SQL SERVER DE PRODUÇÃO ---');
    
    const tablesRes = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tables = tablesRes.recordset.map(r => r.TABLE_NAME);
    console.log('Tabelas encontradas:', tables);

    for (const tbl of tables) {
      console.log(`\nVerificando tabela: ${tbl}`);
      const colsRes = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMNPROPERTY(object_id('${tbl}'), COLUMN_NAME, 'IsIdentity') as IsIdentity
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tbl}'
      `);
      console.table(colsRes.recordset);
    }

    await pool.close();
  } catch (err) {
    console.error('Error during audit:', err);
  }
}

auditTables();
