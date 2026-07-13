import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getPool, executeQuery } from './config/database';
import { apiKeyAuth } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import entregasRoutes from './routes/entregas.routes';
import dashboardRoutes from './routes/dashboard.routes';
import configuracoesRoutes from './routes/configuracoes.routes';
import logsRoutes, { registrarLogInterno } from './routes/logs.routes';
import gpsRoutes from './routes/gps.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// Middlewares globais
// ==========================================
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Key auth (exceto rotas públicas)
app.use('/api', apiKeyAuth);

// ==========================================
// Health check
// ==========================================
app.get('/', (_req, res) => {
  res.json({ message: 'API MagicRoute TypeScript funcionando! 🚀' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// Rotas
// ========== NOVAS ROTAS PADRÃO (RESTful API) ==========
app.use('/api/auth', authRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/gps', gpsRoutes);

// ==========================================
// Manter compatibilidade com endpoints antigos
// (Para que o front existente continue funcionando durante a migração)
// ==========================================
import { execAndRespond, sanitize, requireParam } from './services/sql.service';

// Endpoints legados MagicRoute
app.get('/Inicio', (_req, res) => {
  res.json({ message: 'API MAGIC ROUTE Funcionando!' });
});

app.get('/UrlCliente', async (req, res) => {
  const cnpj = sanitize(req.query.CNPJ as string || '');
  if (!requireParam(cnpj, 'CNPJ', res)) return;
  await execAndRespond(`SELECT * FROM startapp_magicroute..empresas WHERE CNPJ = '${cnpj}'`, res);
});

app.get('/BuscaUsuario', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  const rawTipoPessoa = req.query.TipoPessoa as string || '';
  if (!requireParam(rawTipoPessoa, 'TipoPessoa', res)) return;
  
  let tipoPessoa = 'M';
  if (rawTipoPessoa.toLowerCase() === 'administrador' || rawTipoPessoa.toUpperCase() === 'A') {
    tipoPessoa = 'A';
  }
  tipoPessoa = sanitize(tipoPessoa);

  const codigo = sanitize(req.query.Codigo as string || '');
  if (!requireParam(codigo, 'Codigo', res)) return;
  const senha = sanitize(req.query.Senha as string || '');
  if (!requireParam(senha, 'Senha', res)) return;

  await execAndRespond(
    `SELECT * FROM startapp_magicroute..Usuarios WHERE idempresa = '${idEmpresa}' AND tipopessoa IN ('${tipoPessoa}', 'A/M') AND codigo = '${codigo}' AND senha = '${senha}'`,
    res
  );
});

function normalizarDataParaISO(dataStr: string): string {
  if (!dataStr) return '';
  const trimmed = dataStr.trim();
  if (trimmed.includes('-')) {
    return trimmed;
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return trimmed;
}

app.get('/BuscaEntregasData', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');

  let dataInicial = sanitize(req.query.DataIncial as string || '');
  if (!dataInicial) {
    const today = new Date();
    dataInicial = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  }
  let dataFinal = sanitize(req.query.DataFinal as string || '') || dataInicial;

  const dataInicialISO = normalizarDataParaISO(dataInicial);
  const dataFinalISO = normalizarDataParaISO(dataFinal);

  let filterQuery = `WHERE ent.IDEmpresa = ${idEmpresa}`;
  if (codigoMotorista && codigoMotorista !== 'undefined' && codigoMotorista !== 'null' && codigoMotorista.trim() !== '') {
    filterQuery += ` AND ent.CodigoMotorista = ${codigoMotorista}`;
  }
  if (dataInicialISO && dataFinalISO && req.query.ignorarData !== 'true') {
    filterQuery += ` AND CONVERT(DATE, ent.DataEntrega, 103) BETWEEN '${dataInicialISO}' AND '${dataFinalISO}'`;
  }

  const query = `SELECT
    ent.IDLote, ent.LocalSaida, ent.LocalChegada, ent.DataEntrega, ent.Veiculo, ent.UrlVeiculo, ent.PlacaEntrega, ent.CodigoMotorista,
    ent.HoraSaidaPrevista, ent.HoraRetornoPrevista,
    usr.Nome AS NomeMotorista,
    SUM(CASE WHEN ent.StatusEntrega = 'Pendente' THEN 1 ELSE 0 END) AS Pendente,
    SUM(CASE WHEN ent.StatusEntrega = 'Entregue' THEN 1 ELSE 0 END) AS Entregue,
    SUM(CASE WHEN ent.StatusEntrega = 'Em Transporte' THEN 1 ELSE 0 END) AS EmTransporte,
    COUNT(ent.NumeroPedido) AS Total,
    ISNULL(lot.Situacao, 'Em Aberto') AS SituacaoLote
    FROM startapp_magicroute..Entregas ent
    LEFT JOIN startapp_magicroute..Lotes lot ON lot.IDEmpresa = ent.IDEmpresa AND lot.IDLote = ent.IDLote
    LEFT JOIN startapp_magicroute..Usuarios usr ON usr.IDEmpresa = ent.IDEmpresa AND usr.Codigo = ent.CodigoMotorista AND usr.TipoPessoa IN ('M', 'A/M')
    ${filterQuery}
    GROUP BY ent.IDLote, ent.LocalSaida, ent.LocalChegada, ent.DataEntrega, ent.Veiculo, ent.PlacaEntrega, ent.UrlVeiculo, ent.CodigoMotorista, ent.HoraSaidaPrevista, ent.HoraRetornoPrevista, usr.Nome, lot.Situacao`;
  await execAndRespond(query, res);
});

app.get('/BuscaEntregasIDLote', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  const idLote = sanitize(req.query.IDLote as string || '');
  if (!requireParam(idLote, 'IDLote', res)) return;

  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  let filterQuery = `WHERE ent.IDEmpresa = ${idEmpresa} AND ent.IDLote = ${idLote}`;
  
  if (codigoMotorista && codigoMotorista !== 'undefined' && codigoMotorista !== 'null' && codigoMotorista.trim() !== '') {
    filterQuery += ` AND ent.CodigoMotorista = ${codigoMotorista}`;
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT ent.*, ISNULL(lot.Situacao, 'Em Aberto') AS SituacaoLote 
       FROM startapp_magicroute..Entregas ent 
       LEFT JOIN startapp_magicroute..Lotes lot ON lot.IDEmpresa = ent.IDEmpresa AND lot.IDLote = ent.IDLote
       ${filterQuery} 
       ORDER BY ent.SequenciaRoteirizada, ent.SequenciaOriginal ASC`
    );
    
    const entregas = result.recordset || [];
    
    // Identificar se existem entregas sem coordenadas
    const semCoords = entregas.filter(ent => {
      const lat = Number(ent.LatitudeEntrega);
      const lng = Number(ent.LongitudeEntrega);
      return isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0;
    });

    if (semCoords.length > 0) {
      console.log(`[Geocodificação Backend] Encontradas ${semCoords.length} entregas sem coordenadas. Geocodificando...`);
      for (let i = 0; i < semCoords.length; i++) {
        const ent = semCoords[i];
        const rua = ent.EnderecoEntrega || '';
        const bairro = ent.Bairro || '';
        const cidade = ent.Cidade || 'Piracicaba';
        const queryAddr = `${rua}, ${cidade} - SP, Brasil`;
        
        try {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1100)); // Delay para respeitar rate limit do Nominatim
          }
          
          const nominatimRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddr)}`,
            { headers: { 'User-Agent': 'MagicRouteAPI/1.0' } }
          );
          const data = await nominatimRes.json() as any[];
          
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            if (!isNaN(lat) && !isNaN(lon)) {
              console.log(`[Geocodificação Backend] Sucesso para: ${queryAddr} -> ${lat}, ${lon}`);
              
              // Persistir no banco de dados local
              await pool.request().query(`
                UPDATE startapp_magicroute..LotesEntregas 
                SET LatitudeEntrega = '${lat}', 
                    LongitudeEntrega = '${lon}'
                WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND NrNotaFiscal = '${ent.NrNotaFiscal}'
              `);
              
              // Atualizar na lista de retorno
              ent.LatitudeEntrega = String(lat);
              ent.LongitudeEntrega = String(lon);
            }
          }
        } catch (geocodeErr) {
          console.error(`[Geocodificação Backend] Falha ao geocodificar ${queryAddr}:`, geocodeErr);
        }
      }
    }

    res.json(entregas);
  } catch (err: any) {
    console.error('Erro ao buscar e geocodificar entregas:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/RoteirizaIDLote', async (req, res) => {
  const { IDEmpresa, IDLote, OtimizarRota } = req.body;
  try {
    // 1. Tenta no master2 (onde as procedures estão localizadas)
    await executeQuery(`EXEC master2..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
    return res.json({ sucesso: true, mensagem: 'Roteirizado via procedure original no master2.' });
  } catch (err2: any) {
    console.warn('Falhou no master2. Tentando no master...', err2.message);
    try {
      // 2. Tenta no master (fallback histórico)
      await executeQuery(`EXEC master..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
      return res.json({ sucesso: true, mensagem: 'Roteirizado via procedure no master.' });
    } catch (err: any) {
      console.warn('Procedure no master não encontrada ou falhou. Rodando fallback local...', err.message);
      
      try {
        // Fallback: Roteirização interna por proximidade geográfica (Vizinho Mais Próximo)
        // 1. Buscar entregas do lote
        const queryGet = `SELECT IDEmpresa, IDLote, NrNotaFiscal, LatitudeEntrega, LongitudeEntrega 
                          FROM startapp_magicroute..Entregas 
                          WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}`;
        const entregas = await executeQuery(queryGet);
        
        if (entregas.length === 0) {
          return res.json({ sucesso: true, mensagem: 'Nenhuma entrega encontrada para roteirizar.' });
        }
        
        // 2. Filtrar pontos válidos
        const pontosValidos = entregas.map(e => ({
          ...e,
          lat: parseFloat(e.LatitudeEntrega || '0'),
          lng: parseFloat(e.LongitudeEntrega || '0'),
        })).filter(p => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);
        
        if (pontosValidos.length <= 1) {
          // Se tem 1 ou menos pontos com coordenadas, ordena pela ordem original
          for (let i = 0; i < entregas.length; i++) {
            const nf = entregas[i].NrNotaFiscal || entregas[i].NrDocumento || '';
            await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                SET SequenciaRoteirizada = ${i + 1} 
                                WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
          }
          return res.json({ sucesso: true, mensagem: 'Roteirizado por ordem padrão (sem coordenadas suficientes).' });
        }
        
        // 3. Algoritmo de Vizinho Mais Próximo (Nearest Neighbor)
        const rotaOrdenada: any[] = [];
        const naoVisitados = [...pontosValidos];
        
        // Começa pelo primeiro
        let atual = naoVisitados.shift()!;
        rotaOrdenada.push(atual);
        
        const obterDistancia = (p1: any, p2: any) => {
          return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
        };
        
        while (naoVisitados.length > 0) {
          let indiceMaisProximo = 0;
          let distMinima = obterDistancia(atual, naoVisitados[0]);
          
          for (let i = 1; i < naoVisitados.length; i++) {
            const dist = obterDistancia(atual, naoVisitados[i]);
            if (dist < distMinima) {
              distMinima = dist;
              indiceMaisProximo = i;
            }
          }
          
          atual = naoVisitados.splice(indiceMaisProximo, 1)[0];
          rotaOrdenada.push(atual);
        }
        
        // 4. Gravar a nova sequência no banco de dados para os pontos válidos
        for (let idx = 0; idx < rotaOrdenada.length; idx++) {
          const p = rotaOrdenada[idx];
          const nf = p.NrNotaFiscal || p.NrDocumento || '';
          await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                              SET SequenciaRoteirizada = ${idx + 1} 
                              WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
        }
        
        // Se houver pontos sem coordenadas, coloca no final
        const nfsOrdenadas = new Set(rotaOrdenada.map(p => p.NrNotaFiscal || p.NrDocumento || ''));
        let idxSemCoord = rotaOrdenada.length + 1;
        for (const e of entregas) {
          const nf = e.NrNotaFiscal || e.NrDocumento || '';
          if (!nfsOrdenadas.has(nf)) {
            await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                SET SequenciaRoteirizada = ${idxSemCoord++} 
                                WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
          }
        }
        
        return res.json({ sucesso: true, mensagem: 'Roteirizado com sucesso pelo algoritmo local (fallback).' });
        
      } catch (fallbackErr: any) {
        console.error('Falha geral no fallback da roteirização:', fallbackErr.message);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro na roteirização: ' + fallbackErr.message });
      }
    }
  }
});

app.post('/AtualizaSequencia', async (req, res) => {
  const { IDEmpresa, IDLote, NrNotaFiscal, Sequencia } = req.body;
  const cleanNF = sanitize(NrNotaFiscal || '');
  try {
    await executeQuery(
      `UPDATE startapp_magicroute..LotesEntregas 
       SET SequenciaRoteirizada = ${Number(Sequencia)} 
       WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${cleanNF}' OR NumeroPedido = '${cleanNF}')`
    );
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('[ERRO SQL]', err.message);
    res.status(500).json({ sucesso: false, error: err.message });
  }
});

app.get('/Dashboard', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  await execAndRespond(`SELECT * FROM startapp_magicroute..DadosDashBoard(${idEmpresa})`, res);
});

app.post('/GravaDataHora', async (req, res) => {
  const { CodigoUsuario, CodigoMotorista, TipoEvento, Chave } = req.body;
  try {
    await executeQuery(
      `EXEC startapp_magicroute..GravaDataEvento '${sanitize(CodigoUsuario || '')}', '${sanitize(CodigoMotorista || '')}', '${sanitize(TipoEvento || '')}', '${sanitize(Chave || '')}'`
    );

    // Registrar log descritivo no banco de dados
    try {
      const cleanChave = sanitize(Chave || '');
      const deliveryResult = await executeQuery(`
        SELECT IDEmpresa, IDLote, NumeroPedido, NrNotaFiscal, NomeCliente
        FROM startapp_magicroute..LotesEntregas
        WHERE CONCAT(IDEmpresa, IDLote, NumeroPedido) = '${cleanChave}'
           OR CONCAT(IDEmpresa, IDLote, NrNotaFiscal) = '${cleanChave}'
      `);

      if (deliveryResult.length > 0) {
        const del = deliveryResult[0];
        let desc = '';
        let acao = 'OUTRO';

        if (TipoEvento === 'InicioEntrega') {
          desc = `Iniciou o deslocamento para a entrega do pedido ${del.NumeroPedido} (Cliente: ${del.NomeCliente}).`;
          acao = 'INICIO_ENTREGA';
        } else if (TipoEvento === 'FimEntrega') {
          desc = `Finalizou a entrega do pedido ${del.NumeroPedido} para o cliente ${del.NomeCliente}.`;
          acao = 'ENTREGUE';
        } else if (TipoEvento === 'LimpaInicioFinalEntrega') {
          desc = `Reabriu/Reiniciou a entrega do pedido ${del.NumeroPedido} (Cliente: ${del.NomeCliente}).`;
          acao = 'ALTERACAO_ADM';
        }

        if (desc) {
          let motoristaNome = `Motorista #${CodigoMotorista}`;
          try {
            const userResult = await executeQuery(`
              SELECT Nome FROM startapp_magicroute..Usuarios 
              WHERE Codigo = '${sanitize(CodigoMotorista)}' AND IDEmpresa = ${Number(del.IDEmpresa)}
            `);
            if (userResult.length > 0) {
              motoristaNome = userResult[0].Nome;
            }
          } catch (e) {
            console.error('Erro ao buscar nome do motorista para log:', e);
          }

          await registrarLogInterno({
            idEmpresa: Number(del.IDEmpresa),
            idLote: Number(del.IDLote),
            usuario: motoristaNome,
            tipoAcao: acao,
            descricao: desc
          });
        }
      }
    } catch (logErr) {
      console.error('Erro ao gerar log automático em GravaDataHora:', logErr);
    }

    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('[ERRO SQL]', err.message);
    res.status(500).json({ sucesso: false, error: err.message });
  }
});

// Endpoints legados App Rotas
app.get('/empresa', async (req, res) => {
  const cnpj = sanitize(req.query.cnpj as string || '');
  if (!requireParam(cnpj, 'cnpj', res)) return;
  await execAndRespond(`SELECT * FROM apps..Empresas WHERE cnpj = REPLACE(REPLACE(REPLACE(CAST('${cnpj}' AS VARCHAR(100)),'.',''),'/',''),'-','')`, res);
});

app.get('/LoginMotorista', async (req, res) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;
  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;
  const senhaMotorista = sanitize(req.query.SenhaMotorista as string || '');
  if (!requireParam(senhaMotorista, 'SenhaMotorista', res)) return;
  await execAndRespond(
    `SELECT CODIGOMOTORISTA as Codigo, SenhaMotorista as Senha, nome as Motorista FROM ${bd}..motoristas WHERE CODIGOMOTORISTA = ${codigoMotorista} AND SenhaMotorista = ${senhaMotorista}`,
    res
  );
});

app.get('/Lotes', async (req, res) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;
  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;
  const dataEntrega = sanitize(req.query.DataEntrega as string || '');
  if (!requireParam(dataEntrega, 'DataEntrega', res)) return;

  const query = `SELECT idlote, sai.Nome as NomeLocal, sai.horariosaida, vei.veiculo, vei.urlfoto, vei.placa, DataEntrega,
    COUNT(IDENTREGA) as QuantidadeEntregas, SUM(Peso) as Peso,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Pendente' AND ent.codigomotorista = lote.codigomotorista) as Pendentes,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Entregue' AND ent.codigomotorista = lote.codigomotorista) as Entregues,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = N'Não Entregue' AND ent.codigomotorista = lote.codigomotorista) as [Não Entregues]
    FROM ${bd}..entregas Lote
    LEFT JOIN ${bd}..LocalSaidas sai ON sai.idlocal = lote.idlocalsaida
    LEFT JOIN ${bd}..veiculos vei ON vei.codigoveiculo = lote.codigoveiculo
    WHERE codigomotorista = ${codigoMotorista}
    AND (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Pendente' AND ent.codigomotorista = lote.codigomotorista) > 0
    AND dataentrega = CAST('${dataEntrega}' AS DATE)
    GROUP BY idlote, codigomotorista, dataentrega, idlocalsaida, sai.nome, vei.veiculo, vei.urlfoto, vei.placa, sai.horariosaida`;
  await execAndRespond(query, res);
});

app.get('/EntregasPendentes', async (req, res) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;
  const idLote = sanitize(req.query.IdLote as string || '');
  if (!requireParam(idLote, 'IdLote', res)) return;
  await execAndRespond(`SELECT * FROM ${bd}..Entregas WHERE IDLOTE = ${idLote} AND situacaoentrega = 'Pendente' ORDER BY sequenciaforcada, sequencia ASC`, res);
});

app.post('/CriaLote', async (req, res) => {
  console.log('[CriaLote] body recebido:', req.body);

  const idEmpresa       = sanitize(String(req.body.IdEmpresa       ?? '1'));
  const codigoMotorista = sanitize(String(req.body.CodigoMotorista ?? '1'));
  const codigoVeiculo   = sanitize(String(req.body.CodigoVeiculo   ?? '1'));
  const codigoUsuario   = sanitize(String(req.body.CodigoUsuario   ?? '1'));

  // Garante que LocalSaida e LocalChegada usem o valor real mesmo quando for "0"
  const rawLocalSaida   = req.body.CodigoLocalSaida   !== undefined && req.body.CodigoLocalSaida   !== '' ? req.body.CodigoLocalSaida   : '0';
  const rawLocalChegada = req.body.CodigoLocalChegada !== undefined && req.body.CodigoLocalChegada !== '' ? req.body.CodigoLocalChegada : rawLocalSaida;

  const codigoLocalSaida   = parseInt(String(rawLocalSaida),   10) || 0;
  const codigoLocalChegada = parseInt(String(rawLocalChegada), 10) || 0;

  console.log(`[CriaLote] LocalSaida=${codigoLocalSaida}, LocalChegada=${codigoLocalChegada}, Motorista=${codigoMotorista}, Veiculo=${codigoVeiculo}`);

  try {
    const pool = await getPool();

    // 1. Obter o próximo IDLote
    const maxResult = await pool.request().query(`
      SELECT ISNULL(MAX(IDLote), 100) + 1 AS NovoIDLote
      FROM startapp_magicroute..Lotes
      WHERE IDEmpresa = ${idEmpresa}
    `);
    const novoIdLote = maxResult.recordset[0].NovoIDLote;

    // 2. Inserir apenas o cabeçalho do lote (sem entregas fictícias)
    await pool.request().query(`
      INSERT INTO startapp_magicroute..Lotes (
        IDEmpresa, IDLote, DataLote, CodigoMotorista, CodigoLocalSaida, CodigoLocalChegada,
        Observacoes, DataCriacao, CodigoUsuarioCriacao, Situacao, QuantidadeRoteirizacao,
        StatusRoteirizacao, CodigoVeiculo
      ) VALUES (
        ${parseInt(idEmpresa)}, ${novoIdLote}, GETDATE(), ${parseInt(codigoMotorista)},
        ${codigoLocalSaida}, ${codigoLocalChegada},
        '', GETDATE(), ${parseInt(codigoUsuario)}, 'Em Aberto', 0,
        'Pendente', ${parseInt(codigoVeiculo)}
      )
    `);

    console.log(`[CriaLote] Lote ${novoIdLote} criado com sucesso.`);
    res.json({ sucesso: true, novoIdLote });
  } catch (err: any) {
    console.error('Erro ao criar lote:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});


app.post('/AdicionarEntrega', async (req, res) => {
  const idEmpresa = sanitize(req.body.IdEmpresa || '1');
  const idLote = sanitize(req.body.IDLote || '');
  const nrNotaFiscal = sanitize(req.body.NrNotaFiscal || '');
  const numeroPedido = sanitize(req.body.NumeroPedido || '');
  const nomeCliente = sanitize(req.body.NomeCliente || '');
  const enderecoEntrega = sanitize(req.body.EnderecoEntrega || '');
  const bairro = sanitize(req.body.Bairro || '');
  const cidade = sanitize(req.body.Cidade || '');
  const cep = sanitize(req.body.CEP || '');
  const ufEntrega = sanitize(req.body.UFEntrega || 'SP');
  const valorRecebido = Number(req.body.ValorRecebido || 0);
  const tipoPagamento = sanitize(req.body.TipoPagamento || 'A Faturar');
  const statusEntrega = sanitize(req.body.StatusEntrega || 'Pendente');
  const observacoes = sanitize(req.body.Observacoes || '');
  const documentoRecebedor = sanitize(req.body.DocumentoRecebedor || '');
  const nomeRecebimento = sanitize(req.body.NomeRecebimento || '');
  const dataEntregaExigida = sanitize(req.body.DataEntregaExigida || '');
  const horaEntregaExigida = sanitize(req.body.HoraEntregaExigida || '');
  const horaRecebimentoInicio1 = sanitize(req.body.HoraRecebimentoInicio1 || '');
  const horaRecebimentoFim1 = sanitize(req.body.HoraRecebimentoFim1 || '');
  const horaRecebimentoInicio2 = sanitize(req.body.HoraRecebimentoInicio2 || '');
  const horaRecebimentoFim2 = sanitize(req.body.HoraRecebimentoFim2 || '');
  let dataEntrega = sanitize(req.body.DataEntrega || '');

  if (!idLote || !nrNotaFiscal || !numeroPedido) {
    return res.status(400).json({ sucesso: false, erro: 'IDLote, NrNotaFiscal e NumeroPedido são obrigatórios.' });
  }

  if (dataEntrega.includes('-')) {
    const parts = dataEntrega.split('-');
    dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  try {
    const pool = await getPool();
    
    // Obter maior sequencia atual
    const seqResult = await pool.request().query(`
      SELECT ISNULL(MAX(SequenciaOriginal), 0) + 1 AS NovaSeq 
      FROM startapp_magicroute..LotesEntregas 
      WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote}
    `);
    const novaSeq = seqResult.recordset[0].NovaSeq;

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const hojeStr = `${dd}/${mm}/${yyyy}`;

    if (!dataEntrega) {
      dataEntrega = hojeStr;
    }

    await pool.request().query(`
      INSERT INTO startapp_magicroute..LotesEntregas (
        IDEmpresa, IDLote, NumeroPedido, NrNotaFiscal, NomeCliente, EnderecoEntrega, 
        Bairro, Cidade, CEP, StatusEntrega, DataPedido, DataEntrega, 
        StatusRoteirizacao, SequenciaOriginal, SequenciaRoteirizada, DataCriacao, UFEntrega, Pais,
        ValorRecebido, TipoPagamento, Observacoes, DocumentoRecebedor, NomeRecebimento,
        DataEntregaExigida, HoraEntregaExigida, UsuarioCriacao,
        HoraRecebimentoInicio1, HoraRecebimentoFim1, HoraRecebimentoInicio2, HoraRecebimentoFim2
      ) VALUES (
        ${idEmpresa}, ${idLote}, '${numeroPedido}', '${nrNotaFiscal}', '${nomeCliente}', '${enderecoEntrega}', 
        '${bairro}', '${cidade}', '${cep}', '${statusEntrega}', '${hojeStr}', '${dataEntrega}', 
        'Pendente', ${novaSeq}, ${novaSeq}, '${hojeStr}', '${ufEntrega}', 'Brasil',
        ${valorRecebido}, '${tipoPagamento}', '${observacoes}', '${documentoRecebedor}', '${nomeRecebimento}',
        '${dataEntregaExigida}', '${horaEntregaExigida}', 1,
        '${horaRecebimentoInicio1}', '${horaRecebimentoFim1}', '${horaRecebimentoInicio2}', '${horaRecebimentoFim2}'
      )
    `);

    try {
      await registrarLogInterno({
        idEmpresa: Number(idEmpresa),
        idLote: Number(idLote),
        usuario: sanitize(req.body.UsuarioNome || 'Admin'),
        tipoAcao: 'ALTERACAO_ADM',
        descricao: `Adicionou a entrega do pedido ${numeroPedido} (NF: ${nrNotaFiscal}) para o cliente ${nomeCliente}.`
      });
    } catch (logErr) {
      console.error('Erro ao salvar log de adicionar entrega:', logErr);
    }

    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao adicionar entrega:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/EditarEntrega', async (req, res) => {
  const idEmpresa = sanitize(req.body.IdEmpresa || '1');
  const idLote = sanitize(req.body.IDLote || '');
  const nrNotaFiscal = sanitize(req.body.NrNotaFiscal || '');
  const numeroPedido = sanitize(req.body.NumeroPedido || '');
  const nomeCliente = sanitize(req.body.NomeCliente || '');
  const enderecoEntrega = sanitize(req.body.EnderecoEntrega || '');
  const bairro = sanitize(req.body.Bairro || '');
  const cidade = sanitize(req.body.Cidade || '');
  const cep = sanitize(req.body.CEP || '');
  const ufEntrega = sanitize(req.body.UFEntrega || 'SP');
  const valorRecebido = Number(req.body.ValorRecebido || 0);
  const tipoPagamento = sanitize(req.body.TipoPagamento || 'A Faturar');
  const statusEntrega = sanitize(req.body.StatusEntrega || 'Pendente');
  const observacoes = sanitize(req.body.Observacoes || '');
  const documentoRecebedor = sanitize(req.body.DocumentoRecebedor || '');
  const nomeRecebimento = sanitize(req.body.NomeRecebimento || '');
  const dataEntregaExigida = sanitize(req.body.DataEntregaExigida || '');
  const horaEntregaExigida = sanitize(req.body.HoraEntregaExigida || '');
  const horaRecebimentoInicio1 = sanitize(req.body.HoraRecebimentoInicio1 || '');
  const horaRecebimentoFim1 = sanitize(req.body.HoraRecebimentoFim1 || '');
  const horaRecebimentoInicio2 = sanitize(req.body.HoraRecebimentoInicio2 || '');
  const horaRecebimentoFim2 = sanitize(req.body.HoraRecebimentoFim2 || '');
  let dataEntrega = sanitize(req.body.DataEntrega || '');

  if (!idLote || (!nrNotaFiscal && !numeroPedido)) {
    return res.status(400).json({ sucesso: false, erro: 'IDLote e NrNotaFiscal/NumeroPedido são obrigatórios.' });
  }

  if (dataEntrega.includes('-')) {
    const parts = dataEntrega.split('-');
    dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  try {
    const pool = await getPool();
    const matchField = nrNotaFiscal ? `NrNotaFiscal = '${nrNotaFiscal}'` : `NumeroPedido = '${numeroPedido}'`;
    
    let updateQuery = `
      UPDATE startapp_magicroute..LotesEntregas 
      SET NomeCliente = '${nomeCliente}', 
          EnderecoEntrega = '${enderecoEntrega}', 
          Bairro = '${bairro}', 
          Cidade = '${cidade}', 
          CEP = '${cep}',
          UFEntrega = '${ufEntrega}',
          ValorRecebido = ${valorRecebido},
          TipoPagamento = '${tipoPagamento}',
          StatusEntrega = '${statusEntrega}',
          Observacoes = '${observacoes}',
          DocumentoRecebedor = '${documentoRecebedor}',
          NomeRecebimento = '${nomeRecebimento}',
          DataEntregaExigida = '${dataEntregaExigida}',
          HoraEntregaExigida = '${horaEntregaExigida}',
          HoraRecebimentoInicio1 = '${horaRecebimentoInicio1}',
          HoraRecebimentoFim1 = '${horaRecebimentoFim1}',
          HoraRecebimentoInicio2 = '${horaRecebimentoInicio2}',
          HoraRecebimentoFim2 = '${horaRecebimentoFim2}'`;

    if (dataEntrega) {
      updateQuery += `, DataEntrega = '${dataEntrega}'`;
    }

    updateQuery += ` WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND ${matchField}`;

     await pool.request().query(updateQuery);

    try {
      await registrarLogInterno({
        idEmpresa: Number(idEmpresa),
        idLote: Number(idLote),
        usuario: sanitize(req.body.UsuarioNome || 'Admin'),
        tipoAcao: 'ALTERACAO_ADM',
        descricao: `Alterou os dados da entrega do pedido ${numeroPedido} (NF: ${nrNotaFiscal}) para o cliente ${nomeCliente}.`
      });
    } catch (logErr) {
      console.error('Erro ao salvar log de editar entrega:', logErr);
    }

    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao editar entrega:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/ExcluirEntrega', async (req, res) => {
  const idEmpresa = sanitize(req.body.IdEmpresa || '1');
  const idLote = sanitize(req.body.IDLote || '');
  const nrNotaFiscal = sanitize(req.body.NrNotaFiscal || '');
  const numeroPedido = sanitize(req.body.NumeroPedido || '');

  if (!idLote || (!nrNotaFiscal && !numeroPedido)) {
    return res.status(400).json({ sucesso: false, erro: 'IDLote e NrNotaFiscal/NumeroPedido são obrigatórios.' });
  }

  try {
    const pool = await getPool();
    const matchField = nrNotaFiscal ? `NrNotaFiscal = '${nrNotaFiscal}'` : `NumeroPedido = '${numeroPedido}'`;

    await pool.request().query(`
      DELETE FROM startapp_magicroute..LotesEntregas 
      WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND ${matchField}
    `);

    try {
      await registrarLogInterno({
        idEmpresa: Number(idEmpresa),
        idLote: Number(idLote),
        usuario: sanitize(req.body.UsuarioNome || 'Admin'),
        tipoAcao: 'ALTERACAO_ADM',
        descricao: `Excluiu a entrega do pedido ${numeroPedido || ''} (NF: ${nrNotaFiscal || ''}) do Lote #${idLote}.`
      });
    } catch (logErr) {
      console.error('Erro ao salvar log de excluir entrega:', logErr);
    }

    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao excluir entrega:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/AtualizaCoordenadasEntrega', async (req, res) => {
  const idEmpresa = sanitize(req.body.IdEmpresa || '1');
  const idLote = sanitize(req.body.IDLote || '');
  const nrNotaFiscal = sanitize(req.body.NrNotaFiscal || '');
  const latitude = sanitize(req.body.Latitude || '');
  const longitude = sanitize(req.body.Longitude || '');

  if (!idLote || !nrNotaFiscal || !latitude || !longitude) {
    return res.status(400).json({ sucesso: false, erro: 'IDLote, NrNotaFiscal, Latitude e Longitude são obrigatórios.' });
  }

  try {
    const pool = await getPool();
    await pool.request().query(`
      UPDATE startapp_magicroute..LotesEntregas 
      SET LatitudeEntrega = '${latitude}', 
          LongitudeEntrega = '${longitude}'
      WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND NrNotaFiscal = '${nrNotaFiscal}'
    `);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao atualizar coordenadas:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ==========================================
// CRUD de Usuarios / Motoristas
// ==========================================
app.get('/ListarUsuarios', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '1');
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT * FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} ORDER BY Nome`
    );
    res.json(result.recordset || []);
  } catch (err: any) {
    console.error('Erro ao listar usuarios:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/AdicionarUsuario', async (req, res) => {
  const idEmpresa = Number(req.body.IdEmpresa || 1);
  const nome = sanitize(req.body.Nome || '');
  const tipoPessoa = sanitize(req.body.TipoPessoa || 'M'); // A, M, A/M
  const situacao = sanitize(req.body.Situacao || 'Ativo');
  const senha = sanitize(req.body.Senha || '');
  const cpf = sanitize(req.body.CPF || '0');
  const rg = sanitize(req.body.RG || '0');
  const cnh = sanitize(req.body.CNH || '0');
  const validadeCnh = sanitize(req.body.ValidadeCNH || '0');
  const categoriaCnh = sanitize(req.body.CategoriaCNH || '0');
  const urlFoto = req.body.UrlFoto ? sanitize(req.body.UrlFoto) : '';

  if (!nome || !senha) {
    return res.status(400).json({ sucesso: false, erro: 'Nome e Senha sao obrigatorios.' });
  }

  try {
    const pool = await getPool();
    
    // Gerar proximo codigo numerico se nao for enviado
    let codigo = Number(req.body.Codigo);
    if (!codigo || isNaN(codigo)) {
      const codeResult = await pool.request().query(
        `SELECT ISNULL(MAX(Codigo), 0) + 1 AS ProximoCodigo FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa}`
      );
      codigo = codeResult.recordset[0].ProximoCodigo;
    } else {
      // Validar duplicidade de Codigo + TipoPessoa + IDEmpresa
      const checkResult = await pool.request().query(
        `SELECT COUNT(*) AS Qtd FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${codigo} AND TipoPessoa = '${tipoPessoa}'`
      );
      if (checkResult.recordset[0].Qtd > 0) {
        return res.status(400).json({ sucesso: false, erro: `Ja existe um usuario com o codigo ${codigo} para o tipo ${tipoPessoa}.` });
      }
    }

    await pool.request().query(`
      INSERT INTO startapp_magicroute..Usuarios (
        IDEmpresa, TipoPessoa, Codigo, Nome, Situacao, Senha, CPF, RG, CNH, ValidadeCNH, CategoriaCNH, UrlFoto
      ) VALUES (
        ${idEmpresa}, '${tipoPessoa}', ${codigo}, '${nome}', '${situacao}', '${senha}', '${cpf}', '${rg}', '${cnh}', '${validadeCnh}', '${categoriaCnh}', '${urlFoto}'
      )
    `);

    res.json({ sucesso: true, codigo });
  } catch (err: any) {
    console.error('Erro ao adicionar usuario:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/EditarUsuario', async (req, res) => {
  const idEmpresa = Number(req.body.IdEmpresa || 1);
  const codigoOriginal = Number(req.body.CodigoOriginal);
  const tipoPessoaOriginal = sanitize(req.body.TipoPessoaOriginal || '');
  
  const novoCodigo = Number(req.body.Codigo || codigoOriginal);
  const nome = sanitize(req.body.Nome || '');
  const tipoPessoa = sanitize(req.body.TipoPessoa || tipoPessoaOriginal);
  const situacao = sanitize(req.body.Situacao || 'Ativo');
  const senha = sanitize(req.body.Senha || '');
  const cpf = sanitize(req.body.CPF || '0');
  const rg = sanitize(req.body.RG || '0');
  const cnh = sanitize(req.body.CNH || '0');
  const validadeCnh = sanitize(req.body.ValidadeCNH || '0');
  const categoriaCnh = sanitize(req.body.CategoriaCNH || '0');
  const urlFoto = req.body.UrlFoto ? sanitize(req.body.UrlFoto) : '';

  if (isNaN(codigoOriginal) || !tipoPessoaOriginal) {
    return res.status(400).json({ sucesso: false, erro: 'CodigoOriginal e TipoPessoaOriginal sao obrigatorios.' });
  }

  try {
    const pool = await getPool();

    // Se mudou o codigo ou o tipo, verificar se o novo par ja existe
    if ((novoCodigo !== codigoOriginal || tipoPessoa !== tipoPessoaOriginal)) {
      const checkResult = await pool.request().query(
        `SELECT COUNT(*) AS Qtd FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${novoCodigo} AND TipoPessoa = '${tipoPessoa}'`
      );
      if (checkResult.recordset[0].Qtd > 0) {
        return res.status(400).json({ sucesso: false, erro: 'Ja existe outro usuario cadastrado com esse novo Codigo e Tipo de Pessoa.' });
      }
    }

    // Se urlFoto for fornecido, atualiza. Senão, mantém a antiga.
    let updatePhotoSql = '';
    if (req.body.UrlFoto !== undefined) {
      updatePhotoSql = `, UrlFoto = '${urlFoto}'`;
    }

    await pool.request().query(`
      UPDATE startapp_magicroute..Usuarios 
      SET Codigo = ${novoCodigo},
          TipoPessoa = '${tipoPessoa}',
          Nome = '${nome}',
          Situacao = '${situacao}',
          Senha = '${senha}',
          CPF = '${cpf}',
          RG = '${rg}',
          CNH = '${cnh}',
          ValidadeCNH = '${validadeCnh}',
          CategoriaCNH = '${categoriaCnh}'
          ${updatePhotoSql}
      WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${codigoOriginal} AND TipoPessoa = '${tipoPessoaOriginal}'
    `);

    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao editar usuario:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/ExcluirUsuario', async (req, res) => {
  const idEmpresa = Number(req.body.IdEmpresa || 1);
  const codigo = Number(req.body.Codigo);
  const tipoPessoa = sanitize(req.body.TipoPessoa || '');

  if (isNaN(codigo) || !tipoPessoa) {
    return res.status(400).json({ sucesso: false, erro: 'Codigo e TipoPessoa sao obrigatorios.' });
  }

  try {
    const pool = await getPool();
    await pool.request().query(`
      DELETE FROM startapp_magicroute..Usuarios 
      WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${codigo} AND TipoPessoa = '${tipoPessoa}'
    `);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao excluir usuario:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ==========================================
// CRUD de Locais / Unidades de Saída
// ==========================================
app.get('/ListarLocais', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CodigoLocal, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo, DataCriacao
      FROM startapp_magicroute..Locais
      WHERE IDEmpresa = ${idEmpresa}
      ORDER BY NomeLocal ASC
    `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error('Erro ao listar locais:', err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/AdicionarLocal', async (req, res) => {
  const { IdEmpresa, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo, UsuarioCriacao } = req.body;
  if (!IdEmpresa || !NomeLocal) return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e NomeLocal são obrigatórios.' });
  try {
    const pool = await getPool();
    const codResult = await pool.request().query(`
      SELECT ISNULL(MAX(CodigoLocal), 0) + 1 AS ProximoCodigo FROM startapp_magicroute..Locais WHERE IDEmpresa = ${Number(IdEmpresa)}
    `);
    const novoCodigo = codResult.recordset[0].ProximoCodigo;
    const lat = Latitude ? Number(Latitude) : 'NULL';
    const lng = Longitude ? Number(Longitude) : 'NULL';
    const ativo = Ativo === false ? 0 : 1;
    await pool.request().query(`
      INSERT INTO startapp_magicroute..Locais (IDEmpresa, CodigoLocal, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo, DataCriacao, UsuarioCriacao)
      VALUES (
        ${Number(IdEmpresa)}, ${novoCodigo},
        N'${sanitize(NomeLocal)}', N'${sanitize(TipoLocal || 'Empresa')}',
        N'${sanitize(Endereco || '')}', N'${sanitize(Bairro || '')}',
        N'${sanitize(Cidade || '')}', '${sanitize(UF || '')}',
        '${sanitize(CEP || '')}', N'${sanitize(Pais || 'Brasil')}',
        ${lat}, ${lng},
        N'${sanitize(Observacoes || '')}', ${ativo},
        GETDATE(), N'${sanitize(String(UsuarioCriacao || ''))}'
      )
    `);
    res.json({ sucesso: true, CodigoLocal: novoCodigo });
  } catch (err: any) {
    console.error('Erro ao adicionar local:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/EditarLocal', async (req, res) => {
  const { IdEmpresa, CodigoLocal, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo } = req.body;
  if (!IdEmpresa || !CodigoLocal) return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e CodigoLocal são obrigatórios.' });
  try {
    const pool = await getPool();
    const lat = Latitude ? Number(Latitude) : 'NULL';
    const lng = Longitude ? Number(Longitude) : 'NULL';
    const ativo = Ativo === false ? 0 : 1;
    await pool.request().query(`
      UPDATE startapp_magicroute..Locais SET
        NomeLocal = N'${sanitize(NomeLocal || '')}',
        TipoLocal = N'${sanitize(TipoLocal || 'Empresa')}',
        Endereco = N'${sanitize(Endereco || '')}',
        Bairro = N'${sanitize(Bairro || '')}',
        Cidade = N'${sanitize(Cidade || '')}',
        UF = '${sanitize(UF || '')}',
        CEP = '${sanitize(CEP || '')}',
        Pais = N'${sanitize(Pais || 'Brasil')}',
        Latitude = ${lat},
        Longitude = ${lng},
        Observacoes = N'${sanitize(Observacoes || '')}',
        Ativo = ${ativo}
      WHERE IDEmpresa = ${Number(IdEmpresa)} AND CodigoLocal = ${Number(CodigoLocal)}
    `);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao editar local:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/ExcluirLocal', async (req, res) => {
  const { IdEmpresa, CodigoLocal } = req.body;
  if (!IdEmpresa || !CodigoLocal) return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e CodigoLocal são obrigatórios.' });
  try {
    const pool = await getPool();
    await pool.request().query(`
      DELETE FROM startapp_magicroute..Locais WHERE IDEmpresa = ${Number(IdEmpresa)} AND CodigoLocal = ${Number(CodigoLocal)}
    `);
    res.json({ sucesso: true });
  } catch (err: any) {
    console.error('Erro ao excluir local:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ==========================================
// Motoristas e Veículos (para modais)
// ==========================================
app.get('/ListarMotoristas', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Codigo, Nome, TipoPessoa, Situacao
      FROM startapp_magicroute..Usuarios
      WHERE IDEmpresa = ${idEmpresa}
        AND TipoPessoa IN ('M', 'A/M')
        AND (Situacao IS NULL OR Situacao = 'Ativo' OR Situacao = 'A')
      ORDER BY Nome ASC
    `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error('Erro ao listar motoristas:', err);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/ListarVeiculos', async (req, res) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT CodigoVeiculo, Veiculo, TipoCombustivel, PlacaEntrega, UrlVeiculo
      FROM startapp_magicroute..Veiculos
      WHERE IdEmpresa = ${idEmpresa}
      ORDER BY Veiculo ASC
    `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error('Erro ao listar veiculos:', err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/AdicionarVeiculo', async (req, res) => {
  const idEmpresa = sanitize(String(req.body.IdEmpresa || ''));
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const veiculo = sanitize(String(req.body.Veiculo || ''));
  if (!requireParam(veiculo, 'Veiculo', res)) return;

  const tipoCombustivel = sanitize(String(req.body.TipoCombustivel || 'Flex'));
  const placaEntrega = sanitize(String(req.body.PlacaEntrega || ''));
  const urlVeiculo = sanitize(String(req.body.UrlVeiculo || ''));

  try {
    const pool = await getPool();
    const nextCodeResult = await pool.request().query(`
      SELECT ISNULL(MAX(CodigoVeiculo), 0) + 1 AS NextCode 
      FROM startapp_magicroute..Veiculos 
      WHERE IdEmpresa = ${idEmpresa}
    `);
    const nextCode = nextCodeResult.recordset[0].NextCode || 1;

    await pool.request().query(`
      INSERT INTO startapp_magicroute..Veiculos (
        IdEmpresa, CodigoVeiculo, Veiculo, TipoCombustivel, PlacaEntrega, UrlVeiculo
      ) VALUES (
        ${idEmpresa}, ${nextCode}, '${veiculo}', '${tipoCombustivel}', '${placaEntrega}', '${urlVeiculo}'
      )
    `);
    res.json({ sucesso: true, mensagem: 'Veículo adicionado com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao adicionar veículo:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/EditarVeiculo', async (req, res) => {
  const idEmpresa = sanitize(String(req.body.IdEmpresa || ''));
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const codigoVeiculo = sanitize(String(req.body.CodigoVeiculo || ''));
  if (!requireParam(codigoVeiculo, 'CodigoVeiculo', res)) return;

  const veiculo = sanitize(String(req.body.Veiculo || ''));
  if (!requireParam(veiculo, 'Veiculo', res)) return;

  const tipoCombustivel = sanitize(String(req.body.TipoCombustivel || 'Flex'));
  const placaEntrega = sanitize(String(req.body.PlacaEntrega || ''));
  const urlVeiculo = sanitize(String(req.body.UrlVeiculo || ''));

  try {
    const pool = await getPool();
    await pool.request().query(`
      UPDATE startapp_magicroute..Veiculos 
      SET Veiculo = '${veiculo}', 
          TipoCombustivel = '${tipoCombustivel}', 
          PlacaEntrega = '${placaEntrega}', 
          UrlVeiculo = '${urlVeiculo}' 
      WHERE IdEmpresa = ${idEmpresa} AND CodigoVeiculo = ${codigoVeiculo}
    `);
    res.json({ sucesso: true, mensagem: 'Veículo atualizado com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao editar veículo:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

app.post('/ExcluirVeiculo', async (req, res) => {
  const idEmpresa = sanitize(String(req.body.IdEmpresa || ''));
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const codigoVeiculo = sanitize(String(req.body.CodigoVeiculo || ''));
  if (!requireParam(codigoVeiculo, 'CodigoVeiculo', res)) return;

  try {
    const pool = await getPool();
    await pool.request().query(`
      DELETE FROM startapp_magicroute..Veiculos 
      WHERE IdEmpresa = ${idEmpresa} AND CodigoVeiculo = ${codigoVeiculo}
    `);
    res.json({ sucesso: true, mensagem: 'Veículo excluído com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao excluir veículo:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// ==========================================
// Iniciar servidor
// ==========================================
async function startServer() {
  try {
    const pool = await getPool();
    
    // Migração de banco: adicionar coluna PermiteMotoristaRoteirizar se não existir
    try {
      await pool.request().query(`
        IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE object_id = OBJECT_ID('startapp_magicroute..Empresas') 
              AND name = 'PermiteMotoristaRoteirizar'
        )
        BEGIN
            ALTER TABLE startapp_magicroute..Empresas ADD PermiteMotoristaRoteirizar BIT NOT NULL DEFAULT 0;
        END
      `);
      console.log('✅ Migração de banco: Coluna PermiteMotoristaRoteirizar verificada/criada.');
    } catch (migErr) {
      console.error('⚠️ Falha ao verificar/adicionar coluna PermiteMotoristaRoteirizar:', migErr);
    }

    app.listen(PORT, () => {
      console.log(`🚀 MagicRoute API rodando em http://localhost:${PORT}`);
      console.log(`📖 Endpoints novos: /api/auth, /api/entregas, /api/dashboard`);
      console.log(`🔄 Endpoints legados: /UrlCliente, /BuscaUsuario, etc.`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    // Iniciar mesmo sem conexão com o banco (para desenvolvimento do frontend)
    app.listen(PORT, () => {
      console.log(`⚠️  MagicRoute API rodando SEM banco em http://localhost:${PORT}`);
    });
  }
}

startServer();
