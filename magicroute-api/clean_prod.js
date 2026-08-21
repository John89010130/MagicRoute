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

async function cleanProd() {
  const pool = await sql.connect(prodConfig);
  await pool.request().query("DELETE FROM startapp_magicroute..caminhos_gps WHERE NumeroPedido LIKE 'TEST%'");
  console.log('Cleaned production test records successfully.');
  await pool.close();
}

cleanProd();
