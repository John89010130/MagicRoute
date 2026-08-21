"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const auth_1 = require("./middleware/auth");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const entregas_routes_1 = __importDefault(require("./routes/entregas.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const configuracoes_routes_1 = __importDefault(require("./routes/configuracoes.routes"));
const logs_routes_1 = __importStar(require("./routes/logs.routes"));
const gps_routes_1 = __importDefault(require("./routes/gps.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ==========================================
// Middlewares globais
// ==========================================
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API Key auth (exceto rotas públicas)
app.use('/api', auth_1.apiKeyAuth);
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/entregas', entregas_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/configuracoes', configuracoes_routes_1.default);
app.use('/api/logs', logs_routes_1.default);
app.use('/api/gps', gps_routes_1.default);
// ==========================================
// Manter compatibilidade com endpoints antigos
// (Para que o front existente continue funcionando durante a migração)
// ==========================================
const sql_service_1 = require("./services/sql.service");
// Endpoints legados MagicRoute
app.get('/Inicio', (_req, res) => {
    res.json({ message: 'API MAGIC ROUTE Funcionando!' });
});
app.get('/UrlCliente', async (req, res) => {
    const cnpj = (0, sql_service_1.sanitize)(req.query.CNPJ || '');
    if (!(0, sql_service_1.requireParam)(cnpj, 'CNPJ', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT * FROM startapp_magicroute..empresas WHERE CNPJ = '${cnpj}'`, res);
});
app.get('/BuscaUsuario', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const rawTipoPessoa = req.query.TipoPessoa || '';
    if (!(0, sql_service_1.requireParam)(rawTipoPessoa, 'TipoPessoa', res))
        return;
    let tipoPessoa = 'M';
    if (rawTipoPessoa.toLowerCase() === 'administrador' || rawTipoPessoa.toUpperCase() === 'A') {
        tipoPessoa = 'A';
    }
    tipoPessoa = (0, sql_service_1.sanitize)(tipoPessoa);
    const codigo = (0, sql_service_1.sanitize)(req.query.Codigo || '');
    if (!(0, sql_service_1.requireParam)(codigo, 'Codigo', res))
        return;
    const senha = (0, sql_service_1.sanitize)(req.query.Senha || '');
    if (!(0, sql_service_1.requireParam)(senha, 'Senha', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT * FROM startapp_magicroute..Usuarios WHERE idempresa = '${idEmpresa}' AND tipopessoa IN ('${tipoPessoa}', 'A/M') AND codigo = '${codigo}' AND senha = '${senha}'`, res);
});
function normalizarDataParaISO(dataStr) {
    if (!dataStr)
        return '';
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
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    let dataInicial = (0, sql_service_1.sanitize)(req.query.DataIncial || req.query.DataInicial || '');
    if (!dataInicial) {
        const today = new Date();
        dataInicial = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    }
    let dataFinal = (0, sql_service_1.sanitize)(req.query.DataFinal || '') || dataInicial;
    const dInicialISO = normalizarDataParaISO(dataInicial);
    const dFinalISO = normalizarDataParaISO(dataFinal);
    let whereConds = [`lot.IDEmpresa = ${idEmpresa}`];
    if (codigoMotorista && codigoMotorista !== 'undefined' && codigoMotorista !== 'null' && codigoMotorista.trim() !== '') {
        whereConds.push(`lot.CodigoMotorista = ${codigoMotorista}`);
    }
    if (req.query.ignorarData !== 'true' && dInicialISO) {
        whereConds.push(`(
      lot.DataLote = '${dInicialISO}'
      OR TRY_CAST(lot.DataLote AS DATE) BETWEEN TRY_CAST('${dInicialISO}' AS DATE) AND TRY_CAST('${dFinalISO}' AS DATE)
      OR TRY_CAST(ent.DataEntrega AS DATE) BETWEEN TRY_CAST('${dInicialISO}' AS DATE) AND TRY_CAST('${dFinalISO}' AS DATE)
    )`);
    }
    const query = `SELECT
    lot.IDLote,
    lot.IDEmpresa,
    lot.DataLote AS DataEntrega,
    lot.CodigoMotorista,
    MAX(u.Nome) AS NomeMotorista,
    MAX(locSaida.NomeLocal) AS LocalSaida,
    MAX(locChegada.NomeLocal) AS LocalChegada,
    MAX(vei.Veiculo) AS Veiculo,
    MAX(vei.UrlVeiculo) AS UrlVeiculo,
    MAX(vei.PlacaEntrega) AS PlacaEntrega,
    lot.HoraSaidaPrevista,
    lot.HoraRetornoPrevista,
    COUNT(DISTINCT CASE WHEN ent.StatusEntrega = 'Pendente' THEN ent.NumeroPedido END) AS Pendente,
    COUNT(DISTINCT CASE WHEN ent.StatusEntrega = 'Entregue' THEN ent.NumeroPedido END) AS Entregue,
    COUNT(DISTINCT CASE WHEN ent.StatusEntrega = 'Em Transporte' OR ent.StatusEntrega = 'EM_ROTA' THEN ent.NumeroPedido END) AS EmTransporte,
    COUNT(DISTINCT ent.NumeroPedido) AS Total,
    ISNULL(lot.Situacao, 'Em Aberto') AS SituacaoLote,
    lot.StatusRoteirizacao
    FROM startapp_magicroute..Lotes lot
    LEFT JOIN startapp_magicroute..Usuarios u ON u.IDEmpresa = lot.IDEmpresa AND u.Codigo = CAST(lot.CodigoMotorista AS NVARCHAR) AND u.TipoPessoa IN ('M', 'A/M')
    LEFT JOIN startapp_magicroute..Veiculos vei ON vei.IdEmpresa = lot.IDEmpresa AND vei.CodigoVeiculo = lot.CodigoVeiculo
    LEFT JOIN startapp_magicroute..Locais locSaida ON locSaida.IDEmpresa = lot.IDEmpresa AND locSaida.CodigoLocal = lot.CodigoLocalSaida
    LEFT JOIN startapp_magicroute..Locais locChegada ON locChegada.IDEmpresa = lot.IDEmpresa AND locChegada.CodigoLocal = lot.CodigoLocalChegada
    LEFT JOIN startapp_magicroute..LotesEntregas ent ON ent.IDEmpresa = lot.IDEmpresa AND ent.IDLote = lot.IDLote
    WHERE ${whereConds.join(' AND ')}
    GROUP BY lot.IDLote, lot.IDEmpresa, lot.DataLote, lot.CodigoMotorista, lot.HoraSaidaPrevista, lot.HoraRetornoPrevista, lot.Situacao, lot.StatusRoteirizacao
    ORDER BY lot.IDLote DESC`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
app.get('/BuscaEntregasIDLote', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const idLote = (0, sql_service_1.sanitize)(req.query.IDLote || '');
    if (!(0, sql_service_1.requireParam)(idLote, 'IDLote', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    let filterQuery = `WHERE ent.IDEmpresa = ${idEmpresa} AND ent.IDLote = ${idLote}`;
    if (codigoMotorista && codigoMotorista !== 'undefined' && codigoMotorista !== 'null' && codigoMotorista.trim() !== '') {
        filterQuery += ` AND ent.CodigoMotorista = ${codigoMotorista}`;
    }
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.request().query(`SELECT ent.*, ISNULL(lot.Situacao, 'Em Aberto') AS SituacaoLote 
       FROM startapp_magicroute..Entregas ent 
       LEFT JOIN startapp_magicroute..Lotes lot ON lot.IDEmpresa = ent.IDEmpresa AND lot.IDLote = ent.IDLote
       ${filterQuery} 
       ORDER BY ent.SequenciaRoteirizada, ent.SequenciaOriginal ASC`);
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
                    const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddr)}`, { headers: { 'User-Agent': 'MagicRouteAPI/1.0' } });
                    const data = await nominatimRes.json();
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
                }
                catch (geocodeErr) {
                    console.error(`[Geocodificação Backend] Falha ao geocodificar ${queryAddr}:`, geocodeErr);
                }
            }
        }
        res.json(entregas);
    }
    catch (err) {
        console.error('Erro ao buscar e geocodificar entregas:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/RoteirizaIDLote', async (req, res) => {
    const { IDEmpresa, IDLote, OtimizarRota } = req.body;
    if (Number(OtimizarRota) === 0) {
        return res.json({ sucesso: true, mensagem: 'Ordem manual preservada.' });
    }
    try {
        // 1. Tenta no master2 (onde as procedures estão localizadas)
        await (0, database_1.executeQuery)(`EXEC master2..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
        return res.json({ sucesso: true, mensagem: 'Roteirizado via procedure original no master2.' });
    }
    catch (err2) {
        console.warn('Falhou no master2. Tentando no master...', err2.message);
        try {
            // 2. Tenta no master (fallback histórico)
            await (0, database_1.executeQuery)(`EXEC master..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
            return res.json({ sucesso: true, mensagem: 'Roteirizado via procedure no master.' });
        }
        catch (err) {
            console.warn('Procedure no master não encontrada ou falhou. Rodando fallback local...', err.message);
            try {
                // Fallback: Roteirização interna por proximidade geográfica (Vizinho Mais Próximo)
                // 1. Buscar entregas do lote
                const queryGet = `SELECT IDEmpresa, IDLote, NrNotaFiscal, LatitudeEntrega, LongitudeEntrega 
                          FROM startapp_magicroute..Entregas 
                          WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}`;
                const entregas = await (0, database_1.executeQuery)(queryGet);
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
                        await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                SET SequenciaRoteirizada = ${i + 1} 
                                WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                    }
                    return res.json({ sucesso: true, mensagem: 'Roteirizado por ordem padrão (sem coordenadas suficientes).' });
                }
                // 3. Algoritmo de Vizinho Mais Próximo (Nearest Neighbor)
                const rotaOrdenada = [];
                const naoVisitados = [...pontosValidos];
                // Começa pelo primeiro
                let atual = naoVisitados.shift();
                rotaOrdenada.push(atual);
                const obterDistancia = (p1, p2) => {
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
                    await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                              SET SequenciaRoteirizada = ${idx + 1} 
                              WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                }
                // Se houver pontos sem coordenadas, coloca no final
                const nfsOrdenadas = new Set(rotaOrdenada.map(p => p.NrNotaFiscal || p.NrDocumento || ''));
                let idxSemCoord = rotaOrdenada.length + 1;
                for (const e of entregas) {
                    const nf = e.NrNotaFiscal || e.NrDocumento || '';
                    if (!nfsOrdenadas.has(nf)) {
                        await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                SET SequenciaRoteirizada = ${idxSemCoord++} 
                                WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                    }
                }
                return res.json({ sucesso: true, mensagem: 'Roteirizado com sucesso pelo algoritmo local (fallback).' });
            }
            catch (fallbackErr) {
                console.error('Falha geral no fallback da roteirização:', fallbackErr.message);
                return res.status(500).json({ sucesso: false, mensagem: 'Erro na roteirização: ' + fallbackErr.message });
            }
        }
    }
});
app.post('/AtualizaSequencia', async (req, res) => {
    let { IDEmpresa, IDLote, NrNotaFiscal, NumeroPedido, SequenciaOriginal, Sequencia, Sequencias } = req.body;
    try {
        const idEmp = Number(IDEmpresa);
        const idLot = Number(IDLote);
        if (typeof Sequencias === 'string') {
            try {
                Sequencias = JSON.parse(Sequencias);
            }
            catch (e) { }
        }
        if (Array.isArray(Sequencias) && Sequencias.length > 0) {
            for (const item of Sequencias) {
                const seqNum = Number(item.Sequencia ?? item.sequencia);
                const seqOrig = Number(item.SequenciaOriginal ?? item.sequenciaOriginal);
                const cleanNF = (0, sql_service_1.sanitize)(item.NrNotaFiscal || item.nrNotaFiscal || '');
                const cleanPedido = (0, sql_service_1.sanitize)(item.NumeroPedido || item.numeroPedido || '');
                let whereMatch = '';
                if (!isNaN(seqOrig) && seqOrig > 0) {
                    whereMatch = `AND SequenciaOriginal = ${seqOrig}`;
                }
                else if (cleanNF && cleanPedido) {
                    whereMatch = `AND NrNotaFiscal = '${cleanNF}' AND NumeroPedido = '${cleanPedido}'`;
                }
                else if (cleanNF) {
                    whereMatch = `AND NrNotaFiscal = '${cleanNF}'`;
                }
                else if (cleanPedido) {
                    whereMatch = `AND NumeroPedido = '${cleanPedido}'`;
                }
                else {
                    continue;
                }
                await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
           SET SequenciaRoteirizada = ${seqNum} 
           WHERE IDEmpresa = ${idEmp} AND IDLote = ${idLot} ${whereMatch}`);
            }
            return res.json({ sucesso: true, mensagem: 'Sequências do lote atualizadas em lote com sucesso.' });
        }
        const cleanNF = (0, sql_service_1.sanitize)(NrNotaFiscal || '');
        const cleanPedido = (0, sql_service_1.sanitize)(NumeroPedido || '');
        const seqOrig = Number(SequenciaOriginal);
        let whereMatch = '';
        if (!isNaN(seqOrig) && seqOrig > 0) {
            whereMatch = `AND SequenciaOriginal = ${seqOrig}`;
        }
        else if (cleanNF && cleanPedido) {
            whereMatch = `AND NrNotaFiscal = '${cleanNF}' AND NumeroPedido = '${cleanPedido}'`;
        }
        else if (cleanNF) {
            whereMatch = `AND NrNotaFiscal = '${cleanNF}'`;
        }
        else if (cleanPedido) {
            whereMatch = `AND NumeroPedido = '${cleanPedido}'`;
        }
        else {
            return res.status(400).json({ sucesso: false, mensagem: 'Identificador da entrega (SequenciaOriginal, NrNotaFiscal ou NumeroPedido) é obrigatório.' });
        }
        await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
       SET SequenciaRoteirizada = ${Number(Sequencia)} 
       WHERE IDEmpresa = ${idEmp} AND IDLote = ${idLot} ${whereMatch}`);
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('[ERRO SQL]', err.message);
        res.status(500).json({ sucesso: false, error: err.message });
    }
});
app.get('/Dashboard', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT * FROM startapp_magicroute..DadosDashBoard(${idEmpresa})`, res);
});
app.post('/GravaDataHora', async (req, res) => {
    const { CodigoUsuario, CodigoMotorista, TipoEvento, Chave } = req.body;
    try {
        await (0, database_1.executeQuery)(`EXEC startapp_magicroute..GravaDataEvento '${(0, sql_service_1.sanitize)(CodigoUsuario || '')}', '${(0, sql_service_1.sanitize)(CodigoMotorista || '')}', '${(0, sql_service_1.sanitize)(TipoEvento || '')}', '${(0, sql_service_1.sanitize)(Chave || '')}'`);
        // Registrar log descritivo no banco de dados
        try {
            const cleanChave = (0, sql_service_1.sanitize)(Chave || '');
            const deliveryResult = await (0, database_1.executeQuery)(`
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
                }
                else if (TipoEvento === 'FimEntrega') {
                    desc = `Finalizou a entrega do pedido ${del.NumeroPedido} para o cliente ${del.NomeCliente}.`;
                    acao = 'ENTREGUE';
                }
                else if (TipoEvento === 'LimpaInicioFinalEntrega') {
                    desc = `Reabriu/Reiniciou a entrega do pedido ${del.NumeroPedido} (Cliente: ${del.NomeCliente}).`;
                    acao = 'ALTERACAO_ADM';
                }
                if (desc) {
                    let motoristaNome = `Motorista #${CodigoMotorista}`;
                    try {
                        const userResult = await (0, database_1.executeQuery)(`
              SELECT Nome FROM startapp_magicroute..Usuarios 
              WHERE Codigo = '${(0, sql_service_1.sanitize)(CodigoMotorista)}' AND IDEmpresa = ${Number(del.IDEmpresa)}
            `);
                        if (userResult.length > 0) {
                            motoristaNome = userResult[0].Nome;
                        }
                    }
                    catch (e) {
                        console.error('Erro ao buscar nome do motorista para log:', e);
                    }
                    await (0, logs_routes_1.registrarLogInterno)({
                        idEmpresa: Number(del.IDEmpresa),
                        idLote: Number(del.IDLote),
                        usuario: motoristaNome,
                        tipoAcao: acao,
                        descricao: desc
                    });
                }
            }
        }
        catch (logErr) {
            console.error('Erro ao gerar log automático em GravaDataHora:', logErr);
        }
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('[ERRO SQL]', err.message);
        res.status(500).json({ sucesso: false, error: err.message });
    }
});
// Endpoints legados App Rotas
app.get('/empresa', async (req, res) => {
    const cnpj = (0, sql_service_1.sanitize)(req.query.cnpj || '');
    if (!(0, sql_service_1.requireParam)(cnpj, 'cnpj', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT * FROM apps..Empresas WHERE cnpj = REPLACE(REPLACE(REPLACE(CAST('${cnpj}' AS VARCHAR(100)),'.',''),'/',''),'-','')`, res);
});
app.get('/LoginMotorista', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    if (!(0, sql_service_1.requireParam)(codigoMotorista, 'CodigoMotorista', res))
        return;
    const senhaMotorista = (0, sql_service_1.sanitize)(req.query.SenhaMotorista || '');
    if (!(0, sql_service_1.requireParam)(senhaMotorista, 'SenhaMotorista', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT CODIGOMOTORISTA as Codigo, SenhaMotorista as Senha, nome as Motorista FROM ${bd}..motoristas WHERE CODIGOMOTORISTA = ${codigoMotorista} AND SenhaMotorista = ${senhaMotorista}`, res);
});
app.get('/Lotes', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    if (!(0, sql_service_1.requireParam)(codigoMotorista, 'CodigoMotorista', res))
        return;
    const dataEntrega = (0, sql_service_1.sanitize)(req.query.DataEntrega || '');
    if (!(0, sql_service_1.requireParam)(dataEntrega, 'DataEntrega', res))
        return;
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
    await (0, sql_service_1.execAndRespond)(query, res);
});
app.get('/EntregasPendentes', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const idLote = (0, sql_service_1.sanitize)(req.query.IdLote || '');
    if (!(0, sql_service_1.requireParam)(idLote, 'IdLote', res))
        return;
    await (0, sql_service_1.execAndRespond)(`SELECT * FROM ${bd}..Entregas WHERE IDLOTE = ${idLote} AND situacaoentrega = 'Pendente' ORDER BY sequenciaforcada, sequencia ASC`, res);
});
app.post('/CriaLote', async (req, res) => {
    console.log('[CriaLote] body recebido:', req.body);
    const idEmpresa = (0, sql_service_1.sanitize)(String(req.body.IdEmpresa ?? '1'));
    const codigoMotorista = (0, sql_service_1.sanitize)(String(req.body.CodigoMotorista ?? '1'));
    const codigoVeiculo = (0, sql_service_1.sanitize)(String(req.body.CodigoVeiculo ?? '1'));
    const codigoUsuario = (0, sql_service_1.sanitize)(String(req.body.CodigoUsuario ?? '1'));
    // Garante que LocalSaida e LocalChegada usem o valor real mesmo quando for "0"
    const rawLocalSaida = req.body.CodigoLocalSaida !== undefined && req.body.CodigoLocalSaida !== '' ? req.body.CodigoLocalSaida : '0';
    const rawLocalChegada = req.body.CodigoLocalChegada !== undefined && req.body.CodigoLocalChegada !== '' ? req.body.CodigoLocalChegada : rawLocalSaida;
    const codigoLocalSaida = parseInt(String(rawLocalSaida), 10) || 0;
    const codigoLocalChegada = parseInt(String(rawLocalChegada), 10) || 0;
    console.log(`[CriaLote] LocalSaida=${codigoLocalSaida}, LocalChegada=${codigoLocalChegada}, Motorista=${codigoMotorista}, Veiculo=${codigoVeiculo}`);
    try {
        const pool = await (0, database_1.getPool)();
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
    }
    catch (err) {
        console.error('Erro ao criar lote:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/AdicionarEntrega', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.body.IdEmpresa || '1');
    const idLote = (0, sql_service_1.sanitize)(req.body.IDLote || '');
    const nrNotaFiscal = (0, sql_service_1.sanitize)(req.body.NrNotaFiscal || '');
    const numeroPedido = (0, sql_service_1.sanitize)(req.body.NumeroPedido || '');
    const nomeCliente = (0, sql_service_1.sanitize)(req.body.NomeCliente || '');
    const enderecoEntrega = (0, sql_service_1.sanitize)(req.body.EnderecoEntrega || '');
    const bairro = (0, sql_service_1.sanitize)(req.body.Bairro || '');
    const cidade = (0, sql_service_1.sanitize)(req.body.Cidade || '');
    const cep = (0, sql_service_1.sanitize)(req.body.CEP || '');
    const ufEntrega = (0, sql_service_1.sanitize)(req.body.UFEntrega || 'SP');
    const valorRecebido = Number(req.body.ValorRecebido || 0);
    const tipoPagamento = (0, sql_service_1.sanitize)(req.body.TipoPagamento || 'A Faturar');
    const statusEntrega = (0, sql_service_1.sanitize)(req.body.StatusEntrega || 'Pendente');
    const observacoes = (0, sql_service_1.sanitize)(req.body.Observacoes || '');
    const documentoRecebedor = (0, sql_service_1.sanitize)(req.body.DocumentoRecebedor || '');
    const nomeRecebimento = (0, sql_service_1.sanitize)(req.body.NomeRecebimento || '');
    const dataEntregaExigida = (0, sql_service_1.sanitize)(req.body.DataEntregaExigida || '');
    const horaEntregaExigida = (0, sql_service_1.sanitize)(req.body.HoraEntregaExigida || '');
    const horaRecebimentoInicio1 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoInicio1 || '');
    const horaRecebimentoFim1 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoFim1 || '');
    const horaRecebimentoInicio2 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoInicio2 || '');
    const horaRecebimentoFim2 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoFim2 || '');
    let dataEntrega = (0, sql_service_1.sanitize)(req.body.DataEntrega || '');
    if (!idLote || !nrNotaFiscal || !numeroPedido) {
        return res.status(400).json({ sucesso: false, erro: 'IDLote, NrNotaFiscal e NumeroPedido são obrigatórios.' });
    }
    if (dataEntrega.includes('-')) {
        const parts = dataEntrega.split('-');
        dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
        const pool = await (0, database_1.getPool)();
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
            await (0, logs_routes_1.registrarLogInterno)({
                idEmpresa: Number(idEmpresa),
                idLote: Number(idLote),
                usuario: (0, sql_service_1.sanitize)(req.body.UsuarioNome || 'Admin'),
                tipoAcao: 'ALTERACAO_ADM',
                descricao: `Adicionou a entrega do pedido ${numeroPedido} (NF: ${nrNotaFiscal}) para o cliente ${nomeCliente}.`
            });
        }
        catch (logErr) {
            console.error('Erro ao salvar log de adicionar entrega:', logErr);
        }
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao adicionar entrega:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/EditarEntrega', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.body.IdEmpresa || '1');
    const idLote = (0, sql_service_1.sanitize)(req.body.IDLote || '');
    const nrNotaFiscal = (0, sql_service_1.sanitize)(req.body.NrNotaFiscal || '');
    const numeroPedido = (0, sql_service_1.sanitize)(req.body.NumeroPedido || '');
    const nomeCliente = (0, sql_service_1.sanitize)(req.body.NomeCliente || '');
    const enderecoEntrega = (0, sql_service_1.sanitize)(req.body.EnderecoEntrega || '');
    const bairro = (0, sql_service_1.sanitize)(req.body.Bairro || '');
    const cidade = (0, sql_service_1.sanitize)(req.body.Cidade || '');
    const cep = (0, sql_service_1.sanitize)(req.body.CEP || '');
    const ufEntrega = (0, sql_service_1.sanitize)(req.body.UFEntrega || 'SP');
    const valorRecebido = Number(req.body.ValorRecebido || 0);
    const tipoPagamento = (0, sql_service_1.sanitize)(req.body.TipoPagamento || 'A Faturar');
    const statusEntrega = (0, sql_service_1.sanitize)(req.body.StatusEntrega || 'Pendente');
    const observacoes = (0, sql_service_1.sanitize)(req.body.Observacoes || '');
    const documentoRecebedor = (0, sql_service_1.sanitize)(req.body.DocumentoRecebedor || '');
    const nomeRecebimento = (0, sql_service_1.sanitize)(req.body.NomeRecebimento || '');
    const dataEntregaExigida = (0, sql_service_1.sanitize)(req.body.DataEntregaExigida || '');
    const horaEntregaExigida = (0, sql_service_1.sanitize)(req.body.HoraEntregaExigida || '');
    const horaRecebimentoInicio1 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoInicio1 || '');
    const horaRecebimentoFim1 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoFim1 || '');
    const horaRecebimentoInicio2 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoInicio2 || '');
    const horaRecebimentoFim2 = (0, sql_service_1.sanitize)(req.body.HoraRecebimentoFim2 || '');
    let dataEntrega = (0, sql_service_1.sanitize)(req.body.DataEntrega || '');
    if (!idLote || (!nrNotaFiscal && !numeroPedido)) {
        return res.status(400).json({ sucesso: false, erro: 'IDLote e NrNotaFiscal/NumeroPedido são obrigatórios.' });
    }
    if (dataEntrega.includes('-')) {
        const parts = dataEntrega.split('-');
        dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
        const pool = await (0, database_1.getPool)();
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
            await (0, logs_routes_1.registrarLogInterno)({
                idEmpresa: Number(idEmpresa),
                idLote: Number(idLote),
                usuario: (0, sql_service_1.sanitize)(req.body.UsuarioNome || 'Admin'),
                tipoAcao: 'ALTERACAO_ADM',
                descricao: `Alterou os dados da entrega do pedido ${numeroPedido} (NF: ${nrNotaFiscal}) para o cliente ${nomeCliente}.`
            });
        }
        catch (logErr) {
            console.error('Erro ao salvar log de editar entrega:', logErr);
        }
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao editar entrega:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/ExcluirEntrega', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.body.IdEmpresa || '1');
    const idLote = (0, sql_service_1.sanitize)(req.body.IDLote || '');
    const nrNotaFiscal = (0, sql_service_1.sanitize)(req.body.NrNotaFiscal || '');
    const numeroPedido = (0, sql_service_1.sanitize)(req.body.NumeroPedido || '');
    if (!idLote || (!nrNotaFiscal && !numeroPedido)) {
        return res.status(400).json({ sucesso: false, erro: 'IDLote e NrNotaFiscal/NumeroPedido são obrigatórios.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        const matchField = nrNotaFiscal ? `NrNotaFiscal = '${nrNotaFiscal}'` : `NumeroPedido = '${numeroPedido}'`;
        await pool.request().query(`
      DELETE FROM startapp_magicroute..LotesEntregas 
      WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND ${matchField}
    `);
        try {
            await (0, logs_routes_1.registrarLogInterno)({
                idEmpresa: Number(idEmpresa),
                idLote: Number(idLote),
                usuario: (0, sql_service_1.sanitize)(req.body.UsuarioNome || 'Admin'),
                tipoAcao: 'ALTERACAO_ADM',
                descricao: `Excluiu a entrega do pedido ${numeroPedido || ''} (NF: ${nrNotaFiscal || ''}) do Lote #${idLote}.`
            });
        }
        catch (logErr) {
            console.error('Erro ao salvar log de excluir entrega:', logErr);
        }
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao excluir entrega:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/AtualizaCoordenadasEntrega', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.body.IdEmpresa || '1');
    const idLote = (0, sql_service_1.sanitize)(req.body.IDLote || '');
    const nrNotaFiscal = (0, sql_service_1.sanitize)(req.body.NrNotaFiscal || '');
    const latitude = (0, sql_service_1.sanitize)(req.body.Latitude || '');
    const longitude = (0, sql_service_1.sanitize)(req.body.Longitude || '');
    if (!idLote || !nrNotaFiscal || !latitude || !longitude) {
        return res.status(400).json({ sucesso: false, erro: 'IDLote, NrNotaFiscal, Latitude e Longitude são obrigatórios.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query(`
      UPDATE startapp_magicroute..LotesEntregas 
      SET LatitudeEntrega = '${latitude}', 
          LongitudeEntrega = '${longitude}'
      WHERE IDEmpresa = ${idEmpresa} AND IDLote = ${idLote} AND NrNotaFiscal = '${nrNotaFiscal}'
    `);
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao atualizar coordenadas:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
// ==========================================
// CRUD de Usuarios / Motoristas
// ==========================================
app.get('/ListarUsuarios', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '1');
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.request().query(`SELECT * FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} ORDER BY Nome`);
        res.json(result.recordset || []);
    }
    catch (err) {
        console.error('Erro ao listar usuarios:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/AdicionarUsuario', async (req, res) => {
    const idEmpresa = Number(req.body.IdEmpresa || 1);
    const nome = (0, sql_service_1.sanitize)(req.body.Nome || '');
    const tipoPessoa = (0, sql_service_1.sanitize)(req.body.TipoPessoa || 'M'); // A, M, A/M
    const situacao = (0, sql_service_1.sanitize)(req.body.Situacao || 'Ativo');
    const senha = (0, sql_service_1.sanitize)(req.body.Senha || '');
    const cpf = (0, sql_service_1.sanitize)(req.body.CPF || '0');
    const rg = (0, sql_service_1.sanitize)(req.body.RG || '0');
    const cnh = (0, sql_service_1.sanitize)(req.body.CNH || '0');
    const validadeCnh = (0, sql_service_1.sanitize)(req.body.ValidadeCNH || '0');
    const categoriaCnh = (0, sql_service_1.sanitize)(req.body.CategoriaCNH || '0');
    const urlFoto = req.body.UrlFoto ? (0, sql_service_1.sanitize)(req.body.UrlFoto) : '';
    if (!nome || !senha) {
        return res.status(400).json({ sucesso: false, erro: 'Nome e Senha sao obrigatorios.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        // Gerar proximo codigo numerico se nao for enviado
        let codigo = Number(req.body.Codigo);
        if (!codigo || isNaN(codigo)) {
            const codeResult = await pool.request().query(`SELECT ISNULL(MAX(Codigo), 0) + 1 AS ProximoCodigo FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa}`);
            codigo = codeResult.recordset[0].ProximoCodigo;
        }
        else {
            // Validar duplicidade de Codigo + TipoPessoa + IDEmpresa
            const checkResult = await pool.request().query(`SELECT COUNT(*) AS Qtd FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${codigo} AND TipoPessoa = '${tipoPessoa}'`);
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
    }
    catch (err) {
        console.error('Erro ao adicionar usuario:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/EditarUsuario', async (req, res) => {
    const idEmpresa = Number(req.body.IdEmpresa || 1);
    const codigoOriginal = Number(req.body.CodigoOriginal);
    const tipoPessoaOriginal = (0, sql_service_1.sanitize)(req.body.TipoPessoaOriginal || '');
    const novoCodigo = Number(req.body.Codigo || codigoOriginal);
    const nome = (0, sql_service_1.sanitize)(req.body.Nome || '');
    const tipoPessoa = (0, sql_service_1.sanitize)(req.body.TipoPessoa || tipoPessoaOriginal);
    const situacao = (0, sql_service_1.sanitize)(req.body.Situacao || 'Ativo');
    const senha = (0, sql_service_1.sanitize)(req.body.Senha || '');
    const cpf = (0, sql_service_1.sanitize)(req.body.CPF || '0');
    const rg = (0, sql_service_1.sanitize)(req.body.RG || '0');
    const cnh = (0, sql_service_1.sanitize)(req.body.CNH || '0');
    const validadeCnh = (0, sql_service_1.sanitize)(req.body.ValidadeCNH || '0');
    const categoriaCnh = (0, sql_service_1.sanitize)(req.body.CategoriaCNH || '0');
    const urlFoto = req.body.UrlFoto ? (0, sql_service_1.sanitize)(req.body.UrlFoto) : '';
    if (isNaN(codigoOriginal) || !tipoPessoaOriginal) {
        return res.status(400).json({ sucesso: false, erro: 'CodigoOriginal e TipoPessoaOriginal sao obrigatorios.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        // Se mudou o codigo ou o tipo, verificar se o novo par ja existe
        if ((novoCodigo !== codigoOriginal || tipoPessoa !== tipoPessoaOriginal)) {
            const checkResult = await pool.request().query(`SELECT COUNT(*) AS Qtd FROM startapp_magicroute..Usuarios WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${novoCodigo} AND TipoPessoa = '${tipoPessoa}'`);
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
    }
    catch (err) {
        console.error('Erro ao editar usuario:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/ExcluirUsuario', async (req, res) => {
    const idEmpresa = Number(req.body.IdEmpresa || 1);
    const codigo = Number(req.body.Codigo);
    const tipoPessoa = (0, sql_service_1.sanitize)(req.body.TipoPessoa || '');
    if (isNaN(codigo) || !tipoPessoa) {
        return res.status(400).json({ sucesso: false, erro: 'Codigo e TipoPessoa sao obrigatorios.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query(`
      DELETE FROM startapp_magicroute..Usuarios 
      WHERE IDEmpresa = ${idEmpresa} AND Codigo = ${codigo} AND TipoPessoa = '${tipoPessoa}'
    `);
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao excluir usuario:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
// ==========================================
// CRUD de Locais / Unidades de Saída
// ==========================================
app.get('/ListarLocais', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.request().query(`
      SELECT CodigoLocal, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo, DataCriacao
      FROM startapp_magicroute..Locais
      WHERE IDEmpresa = ${idEmpresa}
      ORDER BY NomeLocal ASC
    `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Erro ao listar locais:', err);
        res.status(500).json({ erro: err.message });
    }
});
app.post('/AdicionarLocal', async (req, res) => {
    const { IdEmpresa, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo, UsuarioCriacao } = req.body;
    if (!IdEmpresa || !NomeLocal)
        return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e NomeLocal são obrigatórios.' });
    try {
        const pool = await (0, database_1.getPool)();
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
        N'${(0, sql_service_1.sanitize)(NomeLocal)}', N'${(0, sql_service_1.sanitize)(TipoLocal || 'Empresa')}',
        N'${(0, sql_service_1.sanitize)(Endereco || '')}', N'${(0, sql_service_1.sanitize)(Bairro || '')}',
        N'${(0, sql_service_1.sanitize)(Cidade || '')}', '${(0, sql_service_1.sanitize)(UF || '')}',
        '${(0, sql_service_1.sanitize)(CEP || '')}', N'${(0, sql_service_1.sanitize)(Pais || 'Brasil')}',
        ${lat}, ${lng},
        N'${(0, sql_service_1.sanitize)(Observacoes || '')}', ${ativo},
        GETDATE(), N'${(0, sql_service_1.sanitize)(String(UsuarioCriacao || ''))}'
      )
    `);
        res.json({ sucesso: true, CodigoLocal: novoCodigo });
    }
    catch (err) {
        console.error('Erro ao adicionar local:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/EditarLocal', async (req, res) => {
    const { IdEmpresa, CodigoLocal, NomeLocal, TipoLocal, Endereco, Bairro, Cidade, UF, CEP, Pais, Latitude, Longitude, Observacoes, Ativo } = req.body;
    if (!IdEmpresa || !CodigoLocal)
        return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e CodigoLocal são obrigatórios.' });
    try {
        const pool = await (0, database_1.getPool)();
        const lat = Latitude ? Number(Latitude) : 'NULL';
        const lng = Longitude ? Number(Longitude) : 'NULL';
        const ativo = Ativo === false ? 0 : 1;
        await pool.request().query(`
      UPDATE startapp_magicroute..Locais SET
        NomeLocal = N'${(0, sql_service_1.sanitize)(NomeLocal || '')}',
        TipoLocal = N'${(0, sql_service_1.sanitize)(TipoLocal || 'Empresa')}',
        Endereco = N'${(0, sql_service_1.sanitize)(Endereco || '')}',
        Bairro = N'${(0, sql_service_1.sanitize)(Bairro || '')}',
        Cidade = N'${(0, sql_service_1.sanitize)(Cidade || '')}',
        UF = '${(0, sql_service_1.sanitize)(UF || '')}',
        CEP = '${(0, sql_service_1.sanitize)(CEP || '')}',
        Pais = N'${(0, sql_service_1.sanitize)(Pais || 'Brasil')}',
        Latitude = ${lat},
        Longitude = ${lng},
        Observacoes = N'${(0, sql_service_1.sanitize)(Observacoes || '')}',
        Ativo = ${ativo}
      WHERE IDEmpresa = ${Number(IdEmpresa)} AND CodigoLocal = ${Number(CodigoLocal)}
    `);
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao editar local:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/ExcluirLocal', async (req, res) => {
    const { IdEmpresa, CodigoLocal } = req.body;
    if (!IdEmpresa || !CodigoLocal)
        return res.status(400).json({ sucesso: false, erro: 'IdEmpresa e CodigoLocal são obrigatórios.' });
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query(`
      DELETE FROM startapp_magicroute..Locais WHERE IDEmpresa = ${Number(IdEmpresa)} AND CodigoLocal = ${Number(CodigoLocal)}
    `);
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('Erro ao excluir local:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
// ==========================================
// Motoristas e Veículos (para modais)
// ==========================================
app.get('/ListarMotoristas', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.request().query(`
      SELECT DISTINCT Codigo, Nome, TipoPessoa, Situacao
      FROM startapp_magicroute..Usuarios
      WHERE IDEmpresa = ${idEmpresa}
        AND TipoPessoa IN ('M', 'A/M')
        AND (Situacao IS NULL OR Situacao = 'Ativo' OR Situacao = 'A')
      ORDER BY Nome ASC
    `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Erro ao listar motoristas:', err);
        res.status(500).json({ erro: err.message });
    }
});
app.get('/ListarVeiculos', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    try {
        const pool = await (0, database_1.getPool)();
        const result = await pool.request().query(`
      SELECT CodigoVeiculo, Veiculo, TipoCombustivel, PlacaEntrega, UrlVeiculo
      FROM startapp_magicroute..Veiculos
      WHERE IdEmpresa = ${idEmpresa}
      ORDER BY Veiculo ASC
    `);
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Erro ao listar veiculos:', err);
        res.status(500).json({ erro: err.message });
    }
});
app.post('/AdicionarVeiculo', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(String(req.body.IdEmpresa || ''));
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const veiculo = (0, sql_service_1.sanitize)(String(req.body.Veiculo || ''));
    if (!(0, sql_service_1.requireParam)(veiculo, 'Veiculo', res))
        return;
    const tipoCombustivel = (0, sql_service_1.sanitize)(String(req.body.TipoCombustivel || 'Flex'));
    const placaEntrega = (0, sql_service_1.sanitize)(String(req.body.PlacaEntrega || ''));
    const urlVeiculo = (0, sql_service_1.sanitize)(String(req.body.UrlVeiculo || ''));
    try {
        const pool = await (0, database_1.getPool)();
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
    }
    catch (err) {
        console.error('Erro ao adicionar veículo:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/EditarVeiculo', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(String(req.body.IdEmpresa || ''));
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const codigoVeiculo = (0, sql_service_1.sanitize)(String(req.body.CodigoVeiculo || ''));
    if (!(0, sql_service_1.requireParam)(codigoVeiculo, 'CodigoVeiculo', res))
        return;
    const veiculo = (0, sql_service_1.sanitize)(String(req.body.Veiculo || ''));
    if (!(0, sql_service_1.requireParam)(veiculo, 'Veiculo', res))
        return;
    const tipoCombustivel = (0, sql_service_1.sanitize)(String(req.body.TipoCombustivel || 'Flex'));
    const placaEntrega = (0, sql_service_1.sanitize)(String(req.body.PlacaEntrega || ''));
    const urlVeiculo = (0, sql_service_1.sanitize)(String(req.body.UrlVeiculo || ''));
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query(`
      UPDATE startapp_magicroute..Veiculos 
      SET Veiculo = '${veiculo}', 
          TipoCombustivel = '${tipoCombustivel}', 
          PlacaEntrega = '${placaEntrega}', 
          UrlVeiculo = '${urlVeiculo}' 
      WHERE IdEmpresa = ${idEmpresa} AND CodigoVeiculo = ${codigoVeiculo}
    `);
        res.json({ sucesso: true, mensagem: 'Veículo atualizado com sucesso.' });
    }
    catch (err) {
        console.error('Erro ao editar veículo:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
app.post('/ExcluirVeiculo', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(String(req.body.IdEmpresa || ''));
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const codigoVeiculo = (0, sql_service_1.sanitize)(String(req.body.CodigoVeiculo || ''));
    if (!(0, sql_service_1.requireParam)(codigoVeiculo, 'CodigoVeiculo', res))
        return;
    try {
        const pool = await (0, database_1.getPool)();
        await pool.request().query(`
      DELETE FROM startapp_magicroute..Veiculos 
      WHERE IdEmpresa = ${idEmpresa} AND CodigoVeiculo = ${codigoVeiculo}
    `);
        res.json({ sucesso: true, mensagem: 'Veículo excluído com sucesso.' });
    }
    catch (err) {
        console.error('Erro ao excluir veículo:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
// ==========================================
// Iniciar servidor
// ==========================================
async function startServer() {
    try {
        const pool = await (0, database_1.getPool)();
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
        }
        catch (migErr) {
            console.error('⚠️ Falha ao verificar/adicionar coluna PermiteMotoristaRoteirizar:', migErr);
        }
        app.listen(PORT, () => {
            console.log(`🚀 MagicRoute API rodando em http://localhost:${PORT}`);
            console.log(`📖 Endpoints novos: /api/auth, /api/entregas, /api/dashboard`);
            console.log(`🔄 Endpoints legados: /UrlCliente, /BuscaUsuario, etc.`);
        });
    }
    catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        // Iniciar mesmo sem conexão com o banco (para desenvolvimento do frontend)
        app.listen(PORT, () => {
            console.log(`⚠️  MagicRoute API rodando SEM banco em http://localhost:${PORT}`);
        });
    }
}
startServer();
//# sourceMappingURL=index.js.map