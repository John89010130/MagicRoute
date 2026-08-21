const { executeQuery } = require('./dist/config/database');

async function applyTrigger() {
  try {
    console.log('Criando trigger automatica para a tabela caminhos_gps no SQL Server...');
    
    const dropSql = `
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_caminhos_gps_auto_id')
      DROP TRIGGER trg_caminhos_gps_auto_id;
    `;
    await executeQuery(dropSql);

    const createSql = `
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
    `;
    await executeQuery(createSql);
    console.log('✅ Trigger trg_caminhos_gps_auto_id criada com SUCESSO no SQL Server!');
  } catch (err) {
    console.error('❌ Erro ao criar trigger:', err);
  }
}

applyTrigger();
