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

    console.log('=== ESTRUTURA DA TABELA Usuarios ===');
    const colsU = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM startapp_magicroute.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios' ORDER BY ORDINAL_POSITION;
    `);
    console.table(colsU.recordset);

    console.log('\n=== TODOS OS USUARIOS ===');
    const usuarios = await sql.query(`SELECT TOP 20 * FROM startapp_magicroute..Usuarios WHERE IDEmpresa = 1;`);
    console.dir(usuarios.recordset);

    console.log('\n=== ESTRUTURA DA TABELA Veiculos ===');
    const colsV = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM startapp_magicroute.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Veiculos' ORDER BY ORDINAL_POSITION;
    `);
    console.table(colsV.recordset);

    console.log('\n=== DADOS DA TABELA Veiculos ===');
    const veiculos = await sql.query(`SELECT TOP 20 * FROM startapp_magicroute..Veiculos WHERE IDEmpresa = 1;`);
    console.dir(veiculos.recordset);

    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
