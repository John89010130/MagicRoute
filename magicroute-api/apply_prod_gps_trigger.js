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
  },
  connectionTimeout: 15000
};

async function fixProductionDatabase() {
  try {
    console.log('Conectando ao SQL Server de PRODUÇÃO (184.107.160.127)...');
    const pool = await sql.connect(prodConfig);
    console.log('✅ Conectado com SUCESSO ao SQL Server de PRODUÇÃO!');

    console.log('Criando/Atualizando trigger trg_caminhos_gps_auto_id na PRODUÇÃO...');
    
    await pool.request().query(`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_caminhos_gps_auto_id')
      DROP TRIGGER trg_caminhos_gps_auto_id;
    `);

    await pool.request().query(`
      CREATE TRIGGER trg_caminhos_gps_auto_id
      ON startapp_magicroute..caminhos_gps
      INSTEAD OF INSERT
      AS
      BEGIN
          SET NOCOUNT ON;
          
          INSERT INTO startapp_magicroute..caminhos_gps (ID, IDEmpresa, IDLote, NumeroPedido, Latitude, Longitude, Accuracy, DataRegistro)
          SELECT 
              ISNULL((SELECT MAX(ID) FROM startapp_magicroute..caminhos_gps), 0) + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
              i.IDEmpresa,
              i.IDLote,
              i.NumeroPedido,
              i.Latitude,
              i.Longitude,
              i.Accuracy,
              ISNULL(i.DataRegistro, GETDATE())
          FROM inserted i;
      END
    `);

    console.log('✅ Trigger de gravação automática ativada no SQL Server de PRODUÇÃO!');

    const check = await pool.request().query('SELECT TOP 5 * FROM startapp_magicroute..caminhos_gps ORDER BY ID DESC');
    console.log('Linhas atuais em caminhos_gps na Produção:', check.recordset);

    await pool.close();
  } catch (err) {
    console.error('❌ Erro na conexão com banco de produção:', err);
  }
}

fixProductionDatabase();
