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

async function fixLogsTrigger() {
  try {
    console.log('Conectando ao SQL Server de PRODUÇÃO (184.107.160.127)...');
    const pool = await sql.connect(prodConfig);

    console.log('Criando Trigger de AutoIncremento para a tabela LogsMagicRoute...');
    await pool.request().query(`
      CREATE OR ALTER TRIGGER trg_LogsMagicRoute_auto_id
      ON startapp_magicroute..LogsMagicRoute
      INSTEAD OF INSERT
      AS
      BEGIN
          SET NOCOUNT ON;
          
          INSERT INTO startapp_magicroute..LogsMagicRoute (IDLog, IDEmpresa, IDLote, Usuario, TipoAcao, Descricao, DataCriacao, Lido)
          SELECT 
              ISNULL((SELECT MAX(IDLog) FROM startapp_magicroute..LogsMagicRoute), 0) + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
              i.IDEmpresa,
              i.IDLote,
              i.Usuario,
              i.TipoAcao,
              i.Descricao,
              ISNULL(i.DataCriacao, DATEADD(hour, -3, GETDATE())),
              ISNULL(i.Lido, 0)
          FROM inserted i;
      END
    `);

    console.log('✅ Trigger trg_LogsMagicRoute_auto_id criada com SUCESSO na Produção!');

    console.log('Testando inserção de log no banco de produção...');
    await pool.request().query(`
      INSERT INTO startapp_magicroute..LogsMagicRoute (IDEmpresa, IDLote, Usuario, TipoAcao, Descricao, DataCriacao, Lido)
      VALUES (1, NULL, 'SISTEMA_LOG_TESTE', 'TESTE', 'Teste de log no banco de produção', GETDATE(), 0)
    `);

    console.log('✅ Inserção efetuada com SUCESSO absoluto!');

    const check = await pool.request().query("SELECT TOP 5 * FROM startapp_magicroute..LogsMagicRoute ORDER BY IDLog DESC");
    console.log('Registros na LogsMagicRoute:', check.recordset);

    await pool.close();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

fixLogsTrigger();
