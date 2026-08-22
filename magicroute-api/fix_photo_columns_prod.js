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

async function fixPhotoColumns() {
  try {
    console.log('Conectando ao SQL Server de PRODUÇÃO (184.107.160.127)...');
    const pool = await sql.connect(prodConfig);

    console.log('Alterando coluna UrlVeiculo na tabela Veiculos para NVARCHAR(MAX)...');
    await pool.request().query('ALTER TABLE startapp_magicroute..Veiculos ALTER COLUMN UrlVeiculo NVARCHAR(MAX)');
    console.log('✅ UrlVeiculo alterada para NVARCHAR(MAX)!');

    console.log('Alterando coluna UrlFoto na tabela Usuarios para NVARCHAR(MAX)...');
    await pool.request().query('ALTER TABLE startapp_magicroute..Usuarios ALTER COLUMN UrlFoto NVARCHAR(MAX)');
    console.log('✅ UrlFoto alterada para NVARCHAR(MAX)!');

    await pool.close();
  } catch (err) {
    console.error('❌ Erro ao alterar colunas:', err.message);
  }
}

fixPhotoColumns();
