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

async function checkLote108() {
  try {
    const pool = await sql.connect(prodConfig);
    const res = await pool.request().query("SELECT * FROM startapp_magicroute..caminhos_gps WHERE IDLote = '108' ORDER BY ID ASC");
    console.log('Points for Lote 108 count:', res.recordset.length);
    console.log('Points for Lote 108:', res.recordset);
    await pool.close();
  } catch (e) {
    console.error(e);
  }
}

checkLote108();
