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
      const summary = Array.isArray(body) ? `${body.length} itens` : typeof body === 'object' ? 'Objeto JSON' : 'OK';
      console.log(`✅ [${res.status} OK] ${name} -> ${summary}`);
      return true;
    } else {
      console.error(`❌ [${res.status} ERRO] ${name} ->`, body);
      return false;
    }
  } catch (err) {
    console.error(`❌ [FALHA REDE] ${name} ->`, err.message);
    return false;
  }
}

async function auditRealApi() {
  console.log('=== AUDITORIA COMPLETA DE TODOS OS ENDPOINTS USADOS NO FRONTEND (api.ts) ===\n');

  // 1. Auth
  await testEndpoint('/UrlCliente (Busca Empresa por CNPJ)', `${BASE_URL}/UrlCliente?CNPJ=12345678000199&ngrok-skip-browser-warning=true`);
  await testEndpoint('/BuscaUsuario (Login)', `${BASE_URL}/BuscaUsuario?IdEmpresa=1&TipoPessoa=A&Codigo=1&Senha=123&ngrok-skip-browser-warning=true`);
  await testEndpoint('/ListarMotoristas', `${BASE_URL}/ListarMotoristas?IdEmpresa=1&ngrok-skip-browser-warning=true`);

  // 2. Entregas & Lotes
  await testEndpoint('/BuscaEntregasData', `${BASE_URL}/BuscaEntregasData?IdEmpresa=1&CodigoMotorista=&ignorarData=true&ngrok-skip-browser-warning=true`);
  await testEndpoint('/BuscaEntregasIDLote (Lote 101)', `${BASE_URL}/BuscaEntregasIDLote?IdEmpresa=1&CodigoMotorista=&IDLote=101&ngrok-skip-browser-warning=true`);

  // 3. Configuracoes
  await testEndpoint('/api/configuracoes/empresa/1', `${BASE_URL}/api/configuracoes/empresa/1?ngrok-skip-browser-warning=true`);

  // 4. Logs
  await testEndpoint('GET /api/logs', `${BASE_URL}/api/logs?IdEmpresa=1&ngrok-skip-browser-warning=true`);
  await testEndpoint('POST /api/logs/criar', `${BASE_URL}/api/logs/criar?ngrok-skip-browser-warning=true`, {
    method: 'POST',
    body: JSON.stringify({ IDEmpresa: 1, Usuario: 'Sistema', TipoAcao: 'TESTE', Descricao: 'Auditoria automatizada' })
  });
  await testEndpoint('POST /api/logs/marcar-lidos', `${BASE_URL}/api/logs/marcar-lidos?ngrok-skip-browser-warning=true`, {
    method: 'POST',
    body: JSON.stringify({ IDEmpresa: 1 })
  });

  // 5. GPS
  await testEndpoint('GET /api/gps/gps-points/101', `${BASE_URL}/api/gps/gps-points/101?ngrok-skip-browser-warning=true`);
  await testEndpoint('POST /api/gps/gps-point', `${BASE_URL}/api/gps/gps-point?ngrok-skip-browser-warning=true`, {
    method: 'POST',
    body: JSON.stringify({ IDEmpresa: '1', IDLote: '101', NumeroPedido: 'TEST', Latitude: -22.40, Longitude: -47.56 })
  });

  // 6. Dashboard
  await testEndpoint('GET /Dashboard', `${BASE_URL}/Dashboard?IdEmpresa=1&ngrok-skip-browser-warning=true`);

  console.log('\n=== FIM DA AUDITORIA ===');
}

auditRealApi();
