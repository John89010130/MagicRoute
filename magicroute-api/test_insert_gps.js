const { executeQuery } = require('./dist/config/database');

async function testInsert() {
  try {
    console.log('Testing insert with MAX(ID) + 1...');
    const q = `INSERT INTO startapp_magicroute..caminhos_gps (ID, IDEmpresa, IDLote, NumeroPedido, Latitude, Longitude, Accuracy)
               SELECT ISNULL(MAX(ID), 0) + 1, '1', '101', 'TEST', -22.40, -47.56, 10
               FROM startapp_magicroute..caminhos_gps`;
    const res = await executeQuery(q);
    console.log('Insert Result:', res);

    const check = await executeQuery('SELECT TOP 10 * FROM startapp_magicroute..caminhos_gps ORDER BY ID DESC');
    console.log('Check rows in caminhos_gps:', check);
  } catch (err) {
    console.error('Insert Error:', err);
  }
}

testInsert();
