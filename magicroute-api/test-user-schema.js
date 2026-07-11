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
    console.log('Colunas da tabela Usuarios:');
    const res = await sql.query(`
      SELECT TOP 1 * FROM startapp_magicroute..Usuarios;
    `);
    console.dir(res.recordset[0]);
    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
