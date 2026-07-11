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
    console.log('Tipos das colunas de Usuarios:');
    const res = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM startapp_magicroute.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios';
    `);
    console.table(res.recordset);
    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
