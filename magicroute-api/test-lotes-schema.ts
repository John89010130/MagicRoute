require('dotenv').config();
const { getPool } = require('./src/config/database');

async function run() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Lotes'
  console.log(r.recordset);
  process.exit(0);
}
run();
