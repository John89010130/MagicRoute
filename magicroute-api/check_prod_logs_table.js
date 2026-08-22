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

async function testLogsTable() {
  try {
    console.log('Conectando ao SQL Server de PRODUÇÃO (184.107.160.127)...');
    const pool = await sql.connect(prodConfig);

    console.log('Verificando se a tabela LogsMagicRoute existe e consultando registros...');
    try {
      const res = await pool.request().query('SELECT TOP 10 * FROM startapp_magicroute..LogsMagicRoute ORDER BY IDLog DESC');
      console.log('✅ Tabela LogsMagicRoute encontrada! Quantidade de registros:', res.recordset.length);
      console.log('Registros:', res.recordset);
    } catch (err) {
      console.error('❌ Erro ao consultar LogsMagicRoute:', err.message);
    }

    console.log('\nTestando inserção de um log de teste em LogsMagicRoute...');
    try {
      const insertRes = await pool.request().query(`
        INSERT INTO startapp_magicroute..LogsMagicRoute (IDEmpresa, IDLote, Usuario, TipoAcao, Descricao, DataCriacao, Lido)
        VALUES (1, NULL, 'TESTE_SISTEMA', 'TESTE', 'Teste de log de sistema', GETDATE(), 0)
      `);
      console.log('✅ Inserção de log realizada com SUCESSO!', insertRes);
      
      // Limpar o log de teste
      await pool.request().query("DELETE FROM startapp_magicroute..LogsMagicRoute WHERE Usuario = 'TESTE_SISTEMA'");
      console.log('Limpeza de log de teste concluída.');
    } catch (err) {
      console.error('❌ ERRO AO INSERIR LOG EM LogsMagicRoute:', err.message);
    }

    await pool.close();
  } catch (err) {
    console.error('❌ Erro na conexão:', err.message);
  }
}

testLogsTable();
