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
    console.log('Dados de data na tabela LotesEntregas:');
    const res = await sql.query(`
      SELECT TOP 5 IDLote, DataEntrega, DataPedido, DataCriacao FROM startapp_magicroute..LotesEntregas;
    `);
    console.dir(res.recordset);
    
    console.log('Estrutura de data na tabela LotesEntregas:');
    const res2 = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM startapp_magicroute.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'LotesEntregas' AND COLUMN_NAME IN ('DataEntrega', 'DataPedido', 'DataCriacao');
    `);
    console.table(res2.recordset);
    
    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
