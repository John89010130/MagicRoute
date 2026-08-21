const { executeQuery } = require('./dist/config/database');

async function cleanTest() {
  await executeQuery("DELETE FROM startapp_magicroute..caminhos_gps WHERE NumeroPedido = 'TEST'");
  console.log('Cleaned test record.');
}

cleanTest();
