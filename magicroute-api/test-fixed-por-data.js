const https = require('https');

const API_KEY = 'minha-chave-secreta-123';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.startapp.net.br${path}`, {
      headers: {
        'x-api-key': API_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== TESTANDO /BuscaEntregasData (COM PARAMETROS DO CONSOLE DA VIRTUAL WEB) ===');
  const res = await get('/BuscaEntregasData?IdEmpresa=1&DataIncial=2026-08-09&DataFinal=2026-08-10');
  console.log('Status Code:', res.status);
  console.log('Rotas Retornadas:', res.body);
}

run().catch(console.error);
