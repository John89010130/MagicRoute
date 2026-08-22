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
      console.log(`✅ [200 OK] ${name} -> OK!`);
    } else {
      console.error(`❌ [${res.status}] ${name} -> Erro:`, body);
    }
  } catch (err) {
    console.error(`❌ [FALHA REDE] ${name} ->`, err.message);
  }
}

async function auditAllEndpoints() {
  console.log('=== INICIANDO AUDITORIA COMPLETA DE APIS EM PRODUÇÃO (api.startapp.net.br) ===\n');

  // 1. Auth & Motoristas
  await testEndpoint('GET /api/auth/motoristas', `${BASE_URL}/api/auth/motoristas?IdEmpresa=1`);
  
  // 2. Configuracoes
  await testEndpoint('GET /api/configuracoes', `${BASE_URL}/api/configuracoes?IdEmpresa=1`);

  // 3. Dashboard
  await testEndpoint('GET /api/dashboard/stats', `${BASE_URL}/api/dashboard/stats?IdEmpresa=1`);

  // 4. Logs
  await testEndpoint('GET /api/logs', `${BASE_URL}/api/logs?IdEmpresa=1`);
  await testEndpoint('POST /api/logs/criar', `${BASE_URL}/api/logs/criar`, {
    method: 'POST',
    body: JSON.stringify({ IDEmpresa: '1', Usuario: 'AuditBot', TipoAcao: 'AUDIT', Descricao: 'Teste de auditoria' })
  });

  // 5. GPS Points
  await testEndpoint('GET /api/gps/gps-points/101', `${BASE_URL}/api/gps/gps-points/101`);
  await testEndpoint('POST /api/gps/gps-point', `${BASE_URL}/api/gps/gps-point`, {
    method: 'POST',
    body: JSON.stringify({ IDEmpresa: '1', IDLote: '101', NumeroPedido: 'TEST_AUDIT', Latitude: -22.40, Longitude: -47.56 })
  });

  // 6. Entregas & Lotes
  await testEndpoint('GET /api/entregas/lotes', `${BASE_URL}/api/entregas/lotes?IdEmpresa=1`);
  await testEndpoint('GET /api/entregas/lote/101', `${BASE_URL}/api/entregas/lote/101?IdEmpresa=1`);

  console.log('\n=== AUDITORIA DE ENDPOINTS FINALIZADA ===');
}

auditAllEndpoints();
