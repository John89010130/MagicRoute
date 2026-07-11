const sql = require('mssql');
const dbConfig = {
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
async function run() {
  try {
    let pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT TempoAtendimento FROM startapp_magicroute..Lotes WHERE IDLote = 109");
    console.dir(result.recordset);
    
    const config = await pool.request().query("SELECT TempoAtendimentoPadrao FROM startapp_magicroute..Empresas");
    console.dir(config.recordset);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
