const BASE_URL = 'https://api.startapp.net.br';
const API_KEY = 'minha-chave-secreta-123';

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json() : await res.text();
    
    if (res.ok) {
      console.log(`✅ [200 OK] ${name} -> Success! Returned ${Array.isArray(body) ? body.length + ' items' : 'object'}`);
    } else {
      console.error(`❌ [${res.status}] ${name} -> Error:`, body);
    }
  } catch (err) {
    console.error(`❌ [FALHA REDE] ${name} ->`, err.message);
  }
}

async function auditLegacyEndpoints() {
  console.log('=== TESTANDO ENDPOINTS LEGADOS EM PRODUÇÃO (api.startapp.net.br) ===\n');

  await testEndpoint('GET /Inicio', `${BASE_URL}/Inicio`);
  await testEndpoint('GET /BuscaEntregasPorLote (Lote 101)', `${BASE_URL}/BuscaEntregasPorLote?IdEmpresa=1&CodigoMotorista=&IDLote=101`);
  await testEndpoint('GET /BuscaConfiguracaoEmpresa', `${BASE_URL}/BuscaConfiguracaoEmpresa?IdEmpresa=1`);
  await testEndpoint('GET /BuscaMotoristas', `${BASE_URL}/BuscaMotoristas?IdEmpresa=1`);
  await testEndpoint('GET /BuscaLotes', `${BASE_URL}/BuscaLotes?IdEmpresa=1`);
  await testEndpoint('GET /Dashboard', `${BASE_URL}/Dashboard?IdEmpresa=1`);
  await testEndpoint('GET /api/logs', `${BASE_URL}/api/logs?IdEmpresa=1`);
  await testEndpoint('GET /api/gps/gps-points/101', `${BASE_URL}/api/gps/gps-points/101`);

  console.log('\n=== FIM DOS TESTES ===');
}

auditLegacyEndpoints();
