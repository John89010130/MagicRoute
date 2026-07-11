// ============================================
// Tipos TypeScript para o MagicRoute
// ============================================

// === Auth / Empresa ===
export interface Empresa {
  IDEmpresa: number;
  NomeEmpresa: string;
  CNPJ: string;
  UrlAPI: string;
  ApiKey?: string;
}

export interface Usuario {
  IDUsuario: number;
  IDEmpresa: number;
  TipoPessoa: string;
  Codigo: string;
  Nome: string;
  Senha: string;
}

export interface Motorista {
  Codigo: number;
  Senha: number;
  Motorista: string;
}

export interface EmpresaApp {
  EmpresaID: number;
  Empresa: string;
  CNPJ: string;
  Token: string;
  NomeBanco: string;
}

// === Entregas ===
export interface EntregaResumo {
  IDLote: number;
  LocalSaida: string;
  DataEntrega: string;
  Veiculo: string;
  UrlVeiculo: string;
  PlacaEntrega: string;
  Pendente: number;
  Entregue: number;
  EmTransporte: number;
}

export interface EntregaDetalhe {
  IDEmpresa: number;
  IDLote: number;
  SequenciaOriginal: number;
  SequenciaRoteirizada: number;
  NrNotaFiscal: string;
  NumeroPedido: string;
  NomeCliente: string;
  EnderecoEntrega: string;
  Bairro: string;
  Cidade: string;
  UFEntrega: string;
  CEP: string;
  LatitudeEntrega: string;
  LongitudeEntrega: string;
  StatusEntrega: string;
  DistanciaPrevista: string;
  TempoPrevistoEntrega: string;
}

// === Lotes (App Rotas) ===
export interface Lote {
  idlote: number;
  NomeLocal: string;
  horariosaida: string;
  veiculo: string;
  urlfoto: string;
  placa: string;
  DataEntrega: string;
  QuantidadeEntregas: number;
  Peso: number;
  Pendentes: number;
  Entregues: number;
  'Não Entregues': number;
}

export interface EntregaPendente {
  IDLOTE: number;
  IDENTREGA: number;
  DATAENTREGA: string;
  CODIGOMOTORISTA: number;
  CODIGOVEICULO: number;
  NRDOCUMENTO: string;
  OBSERVACAO: string;
  SEQUENCIA: number;
  SEQUENCIAFORCADA: number;
  PESO: number;
  IDLOCALSAIDA: number;
  CODIGOCLIENTE: number;
  NOMECLIENTE: string;
  ENDERECO: string;
  BAIRRO: string;
  CIDADE: string;
  UF: string;
  CEP: string;
  PAIS: string;
  HORAINICIONAORECEBIMENTO: string;
  HORAFIMNAORECEBIMENTO: string;
  HORAPREVISTAPARACHEGAR: string;
  ROTERIZADO: string;
  SITUACAOENTREGA: string;
}

// === Dashboard ===
export interface DashboardData {
  EntregasMes: number;
  EntregasEmAbertas: number;
  Lotes: number;
  RotasEmAberta: number;
  EntregasDia: number;
  EntregasFinalizadasDia: number;
  RotasDia: number;
  RotasFinalizadasDia: number;
  PercentEntregasDia: number;
  PercentRotasDia: number;
}

// === API Response ===
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
