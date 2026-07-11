const sql = require('mssql');

const sqlConfig = {
  user: 'sa',
  password: 'tid@125632',
  server: 'localhost',
  database: 'startapp_magicroute',
  options: {
    instanceName: 'TIDSCI_2022',
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function test() {
  try {
    await sql.connect(sqlConfig);
    
    console.log('=== ESTRUTURA DA TABELA Locais ===');
    const res = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM startapp_magicroute.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Locais'
      ORDER BY ORDINAL_POSITION;
    `);
    console.table(res.recordset);

    console.log('\n=== DADOS DE EXEMPLO ===');
    const res2 = await sql.query(`SELECT TOP 5 * FROM startapp_magicroute..Locais;`);
    console.dir(res2.recordset);

    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
