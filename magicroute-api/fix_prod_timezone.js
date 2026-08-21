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

async function fixTimezone() {
  try {
    console.log('Conectando ao SQL Server de PRODUÇÃO (184.107.160.127)...');
    const pool = await sql.connect(prodConfig);

    console.log('Atualizando Trigger trg_caminhos_gps_auto_id com Fuso Horário de Brasília (DATEADD -3)...');
    
    await pool.request().query(`
      CREATE OR ALTER TRIGGER trg_caminhos_gps_auto_id
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
              ISNULL(i.DataRegistro, DATEADD(hour, -3, GETDATE()))
          FROM inserted i;
      END
    `);

    console.log('✅ Trigger de Fuso Horário de Brasília ativada na PRODUÇÃO!');

    // Se houver registros gravados com +3h recente, ajustar para o horário correto
    await pool.request().query(`
      UPDATE startapp_magicroute..caminhos_gps 
      SET DataRegistro = DATEADD(hour, -3, DataRegistro)
      WHERE DataRegistro > GETDATE();
    `);

    const check = await pool.request().query('SELECT TOP 5 * FROM startapp_magicroute..caminhos_gps ORDER BY ID DESC');
    console.log('Últimos registros ajustados em caminhos_gps:', check.recordset);

    await pool.close();
  } catch (err) {
    console.error('❌ Erro ao atualizar fuso horário:', err);
  }
}

fixTimezone();
