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
  console.log('=== TESTANDO GET /api/entregas/por-data ===');
  // Teste 1: Sem CodigoMotorista (como Admin no /rotas)
  console.log('1. Admin (CodigoMotorista vazio):', await get('/api/entregas/por-data?IdEmpresa=1&DataInicial=2026-08-10&DataFinal=2026-08-10'));

  // Teste 2: Com CodigoMotorista=1
  console.log('\n2. Motorista 1:', await get('/api/entregas/por-data?IdEmpresa=1&CodigoMotorista=1&DataInicial=2026-08-10&DataFinal=2026-08-10'));
}

run().catch(console.error);
