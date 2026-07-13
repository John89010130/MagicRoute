const API_KEY = 'minha-chave-secreta-123';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, string | number | undefined>;
  body?: Record<string, any>;
  json?: boolean;
}

// Limpar URLs legadas antigas (Ngrok/Localtunnel) salvas no LocalStorage dos clientes
try {
  const savedUrl = localStorage.getItem('CUSTOM_API_URL');
  if (savedUrl && (savedUrl.includes('ngrok') || savedUrl.includes('loca.lt'))) {
    localStorage.removeItem('CUSTOM_API_URL');
    console.log('[API] URL customizada legada removida do LocalStorage.');
  }
} catch (e) {
  console.error('Erro ao limpar LocalStorage:', e);
}

async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body } = options;

  const baseUrl = (localStorage.getItem('CUSTOM_API_URL')?.trim() || import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  let url = `${baseUrl}${endpoint}`;

  // Injetar o skip do ngrok como parâmetro de query string (evita OPTIONS preflight CORS blocks)
  const queryParams = {
    ...params,
    'ngrok-skip-browser-warning': 'true'
  };

  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  url += `?${searchParams.toString()}`;

  const headers: HeadersInit = {
    'x-api-key': API_KEY,
    'ngrok-skip-browser-warning': 'true',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store', // Prevent aggressive browser caching of GET requests
    credentials: 'include', // Enviar cookies (como o do ngrok) nas requisições CORS
  };

  if (body) {
    if (method === 'POST' && !options.json) {
      // Simular form-urlencoded (como o Flutter fazia)
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOptions.body = new URLSearchParams(
        Object.entries(body).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
      );
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.mensagem || `Erro ${response.status}`);
  }

  return response.json();
}

// ==========================================
// Auth APIs
// ==========================================

export async function buscarEmpresaPorCNPJ(cnpj: string) {
  return apiRequest('/UrlCliente', { params: { CNPJ: cnpj } });
}

export async function loginUsuario(idEmpresa: string, tipoPessoa: string, codigo: string, senha: string) {
  return apiRequest('/BuscaUsuario', {
    params: { IdEmpresa: idEmpresa, TipoPessoa: tipoPessoa, Codigo: codigo, Senha: senha },
  });
}

export async function buscarEmpresaRotas(cnpj: string) {
  return apiRequest('/empresa', { params: { cnpj } });
}

export async function loginMotorista(bd: string, codigoMotorista: number, senhaMotorista: number) {
  return apiRequest('/LoginMotorista', {
    params: { bd, CodigoMotorista: codigoMotorista, SenhaMotorista: senhaMotorista },
  });
}

// ==========================================
// Entregas APIs (MagicRoute)
// ==========================================

export async function buscarEntregasPorData(
  idEmpresa: string,
  codigoMotorista: string,
  dataInicial?: string,
  dataFinal?: string
) {
  return apiRequest('/BuscaEntregasData', {
    params: {
      IdEmpresa: idEmpresa,
      CodigoMotorista: codigoMotorista,
      DataIncial: dataInicial,
      DataFinal: dataFinal,
    },
  });
}

export async function buscarEntregasPorLote(
  idEmpresa: string,
  codigoMotorista: string,
  idLote: string
) {
  return apiRequest('/BuscaEntregasIDLote', {
    params: { IdEmpresa: idEmpresa, CodigoMotorista: codigoMotorista, IDLote: idLote },
  });
}

export async function roteirizarLote(idEmpresa: string, idLote: string, otimizarRota: string, horaSaida: string = '', tempoAtendimento: string = '', usuarioNome: string = '') {
  return apiRequest('/api/entregas/roteirizar', {
    method: 'POST',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, OtimizarRota: otimizarRota, HoraSaida: horaSaida, TempoAtendimento: tempoAtendimento, UsuarioNome: usuarioNome },
  });
}

export async function salvarHoraSaidaLote(idEmpresa: string, idLote: string, horaSaida: string) {
  return apiRequest('/api/entregas/salvar-hora-saida', {
    method: 'PATCH',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, HoraSaida: horaSaida },
  });
}

export async function salvarTempoAtendimentoLote(idEmpresa: string, idLote: string, tempoAtendimento: string) {
  return apiRequest('/api/entregas/salvar-tempo-atendimento', {
    method: 'PATCH',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, TempoAtendimento: tempoAtendimento },
  });
}

export async function salvarDataLote(idEmpresa: string, idLote: string, dataLote: string) {
  return apiRequest('/api/entregas/salvar-data-lote', {
    method: 'PATCH',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, DataLote: dataLote },
  });
}

export async function buscarConfiguracoes(idEmpresa: string) {
  return apiRequest(`/api/configuracoes/empresa/${idEmpresa}`, {
    method: 'GET',
  });
}

export async function salvarConfiguracoes(idEmpresa: string, tempoAtendimentoPadrao: string, permiteMotoristaRoteirizar?: boolean) {
  return apiRequest('/api/configuracoes/empresa', {
    method: 'PATCH',
    body: { 
      IDEmpresa: idEmpresa, 
      TempoAtendimentoPadrao: tempoAtendimentoPadrao, 
      PermiteMotoristaRoteirizar: permiteMotoristaRoteirizar 
    },
  });
}

export async function atualizarSequencia(
  idEmpresa: string,
  idLote: string,
  nrNotaFiscal: string,
  sequencia: number
) {
  return apiRequest('/AtualizaSequencia', {
    method: 'POST',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, NrNotaFiscal: nrNotaFiscal, Sequencia: sequencia },
  });
}

export async function gravarEvento(
  codigoUsuario: string,
  codigoMotorista: string,
  tipoEvento: string,
  chave: string
) {
  return apiRequest('/api/entregas/gravar-evento', {
    method: 'POST',
    body: { CodigoUsuario: codigoUsuario, CodigoMotorista: codigoMotorista, TipoEvento: tipoEvento, Chave: chave },
  });
}

// ==========================================
// Lotes e Entregas Pendentes (App Rotas)
// ==========================================

export async function buscarLotes(bd: string, codigoMotorista: number, dataEntrega: string) {
  return apiRequest('/Lotes', {
    params: { bd, CodigoMotorista: codigoMotorista, DataEntrega: dataEntrega },
  });
}

export async function buscarEntregasPendentes(bd: string, idLote: number) {
  return apiRequest('/EntregasPendentes', { params: { bd, IdLote: idLote } });
}

// ==========================================
// Dashboard
// ==========================================

export async function buscarDashboard(idEmpresa: string) {
  return apiRequest('/Dashboard', { params: { IdEmpresa: idEmpresa } });
}

export async function criarNovaRota(
  idEmpresa: number,
  codigoMotorista: number,
  codigoVeiculo: number,
  codigoLocalSaida: number = 0,
  codigoLocalChegada: number = 0,
  codigoUsuario: number = 1
) {
  return apiRequest('/CriaLote', {
    method: 'POST',
    body: {
      IdEmpresa: idEmpresa,
      CodigoMotorista: codigoMotorista,
      CodigoVeiculo: codigoVeiculo,
      CodigoLocalSaida: codigoLocalSaida,
      CodigoLocalChegada: codigoLocalChegada,
      CodigoUsuario: codigoUsuario,
    }
  });
}

export async function adicionarEntrega(body: any) {
  return apiRequest('/AdicionarEntrega', { method: 'POST', body });
}

export async function importarEntregasLote(body: { IdEmpresa: string; IDLote: string; Entregas: any[]; UsuarioNome: string }) {
  return apiRequest('/api/entregas/importar-lote', { method: 'POST', body, json: true });
}

export async function editarEntrega(body: any) {
  return apiRequest('/EditarEntrega', { method: 'POST', body });
}

export async function excluirEntrega(body: any) {
  return apiRequest('/ExcluirEntrega', { method: 'POST', body });
}

export async function atualizarCoordenadasEntrega(body: any) {
  return apiRequest('/AtualizaCoordenadasEntrega', { method: 'POST', body });
}

export async function listarUsuarios(idEmpresa: string) {
  return apiRequest('/ListarUsuarios', { params: { IdEmpresa: idEmpresa } });
}

export async function adicionarUsuario(body: any) {
  return apiRequest('/AdicionarUsuario', { method: 'POST', body });
}

export async function editarUsuario(body: any) {
  return apiRequest('/EditarUsuario', { method: 'POST', body });
}

export async function excluirUsuario(body: any) {
  return apiRequest('/ExcluirUsuario', { method: 'POST', body });
}

// ==========================================
// Locais / Unidades de Saída
// ==========================================
export async function listarLocais(idEmpresa: string) {
  return apiRequest('/ListarLocais', { params: { IdEmpresa: idEmpresa } });
}

export async function adicionarLocal(body: any) {
  return apiRequest('/AdicionarLocal', { method: 'POST', body });
}

export async function editarLocal(body: any) {
  return apiRequest('/EditarLocal', { method: 'POST', body });
}

export async function excluirLocal(body: any) {
  return apiRequest('/ExcluirLocal', { method: 'POST', body });
}

export async function listarMotoristas(idEmpresa: string) {
  return apiRequest('/ListarMotoristas', { params: { IdEmpresa: idEmpresa } });
}

export async function listarVeiculos(idEmpresa: string) {
  return apiRequest('/ListarVeiculos', { params: { IdEmpresa: idEmpresa } });
}

export async function adicionarVeiculo(body: any) {
  return apiRequest('/AdicionarVeiculo', { method: 'POST', body });
}

export async function editarVeiculo(body: any) {
  return apiRequest('/EditarVeiculo', { method: 'POST', body });
}

export async function excluirVeiculo(body: any) {
  return apiRequest('/ExcluirVeiculo', { method: 'POST', body });
}

// ==========================================
// Logs e Notificações (LogsMagicRoute)
// ==========================================
export async function criarLog(idEmpresa: number, idLote: number | null, usuario: string, tipoAcao: string, descricao: string) {
  return apiRequest('/api/logs/criar', {
    method: 'POST',
    body: {
      IDEmpresa: idEmpresa,
      IDLote: idLote,
      Usuario: usuario,
      TipoAcao: tipoAcao,
      Descricao: descricao
    }
  });
}

export async function buscarLogs(idEmpresa: string, idLote?: number, apenasNaoLidos?: boolean) {
  return apiRequest('/api/logs', {
    params: {
      IdEmpresa: idEmpresa,
      IDLote: idLote ? String(idLote) : undefined,
      ApenasNaoLidos: apenasNaoLidos ? 'true' : 'false'
    }
  });
}

export async function marcarLogsLidos(idEmpresa: number, idLote?: number, ids?: number[]) {
  return apiRequest('/api/logs/marcar-lidos', {
    method: 'POST',
    body: {
      IDEmpresa: idEmpresa,
      IDLote: idLote,
      IDs: ids
    }
  });
}

export async function gravarPontoGPS(
  idEmpresa: string,
  idLote: string,
  numeroPedido: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) {
  return apiRequest('/api/gps/gps-point', {
    method: 'POST',
    body: {
      IDEmpresa: idEmpresa,
      IDLote: idLote,
      NumeroPedido: numeroPedido,
      Latitude: latitude,
      Longitude: longitude,
      Accuracy: accuracy
    }
  });
}

export async function buscarPontosGPS(idLote: string) {
  return apiRequest(`/api/gps/gps-points/${idLote}`);
}

export async function finalizarLote(idEmpresa: string, idLote: string, usuarioNome: string) {
  return apiRequest('/api/entregas/finalizar-lote', {
    method: 'PATCH',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, UsuarioNome: usuarioNome }
  });
}

export async function reabrirLote(idEmpresa: string, idLote: string, usuarioNome: string) {
  return apiRequest('/api/entregas/reabrir-lote', {
    method: 'PATCH',
    body: { IDEmpresa: idEmpresa, IDLote: idLote, UsuarioNome: usuarioNome }
  });
}
