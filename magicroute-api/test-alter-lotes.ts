require('dotenv').config();
const { getPool } = require('./src/config/database');

async function run() {
  const pool = await getPool();
  try {
    await pool.request().query("ALTER TABLE startapp_magicroute..Lotes ADD HoraSaidaPrevista nvarchar(10) NULL");
    console.log("Coluna HoraSaidaPrevista adicionada.");
  } catch (e) {
    console.log("Erro HoraSaidaPrevista:", e.message);
  }
  
  try {
    await pool.request().query("ALTER TABLE startapp_magicroute..Lotes ADD HoraRetornoPrevista nvarchar(10) NULL");
    console.log("Coluna HoraRetornoPrevista adicionada.");
  } catch (e) {
    console.log("Erro HoraRetornoPrevista:", e.message);
  }

  process.exit(0);
}
run();
