"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sql_service_1 = require("../services/sql.service");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// ==========================================
// ENTREGAS - MagicRoute (startapp_magicroute)
// ==========================================
/**
 * GET /api/entregas/por-data
 * Busca entregas por data (agrupado por lote)
 */
router.get('/por-data', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    let dataInicial = (0, sql_service_1.sanitize)(req.query.DataInicial || '');
    let dataFinal = (0, sql_service_1.sanitize)(req.query.DataFinal || '');
    if (dataInicial && !dataFinal)
        dataFinal = dataInicial;
    let whereConds = [`lot.IDEmpresa = ${idEmpresa}`];
    if (codigoMotorista) {
        whereConds.push(`lot.CodigoMotorista = ${codigoMotorista}`);
    }
    if (dataInicial) {
        whereConds.push(`(
      lot.DataLote = '${dataInicial}'
      OR TRY_CAST(lot.DataLote AS DATE) BETWEEN TRY_CAST('${dataInicial}' AS DATE) AND TRY_CAST('${dataFinal}' AS DATE)
      OR TRY_CAST(ent.DataEntrega AS DATE) BETWEEN TRY_CAST('${dataInicial}' AS DATE) AND TRY_CAST('${dataFinal}' AS DATE)
    )`);
    }
    const query = `SELECT
    lot.IDLote,
    lot.IDEmpresa,
    lot.DataLote AS DataEntrega,
    lot.CodigoMotorista,
    u.Nome AS NomeMotorista,
    locSaida.NomeLocal AS LocalSaida,
    locChegada.NomeLocal AS LocalChegada,
    vei.Veiculo,
    vei.UrlVeiculo,
    vei.PlacaEntrega,
    lot.HoraSaidaPrevista,
    lot.HoraRetornoPrevista,
    ISNULL(SUM(CASE WHEN ent.StatusEntrega = 'Pendente' THEN 1 ELSE 0 END), 0) AS Pendente,
    ISNULL(SUM(CASE WHEN ent.StatusEntrega = 'Entregue' THEN 1 ELSE 0 END), 0) AS Entregue,
    ISNULL(SUM(CASE WHEN ent.StatusEntrega = 'Em Transporte' OR ent.StatusEntrega = 'EM_ROTA' THEN 1 ELSE 0 END), 0) AS EmTransporte,
    COUNT(ent.NumeroPedido) AS Total,
    ISNULL(lot.Situacao, 'Em Aberto') AS SituacaoLote,
    lot.StatusRoteirizacao
    FROM startapp_magicroute..Lotes lot
    LEFT JOIN startapp_magicroute..Usuarios u ON u.IDEmpresa = lot.IDEmpresa AND u.Codigo = CAST(lot.CodigoMotorista AS NVARCHAR)
    LEFT JOIN startapp_magicroute..Veiculos vei ON vei.IdEmpresa = lot.IDEmpresa AND vei.CodigoVeiculo = lot.CodigoVeiculo
    LEFT JOIN startapp_magicroute..Locais locSaida ON locSaida.IDEmpresa = lot.IDEmpresa AND locSaida.CodigoLocal = lot.CodigoLocalSaida
    LEFT JOIN startapp_magicroute..Locais locChegada ON locChegada.IDEmpresa = lot.IDEmpresa AND locChegada.CodigoLocal = lot.CodigoLocalChegada
    LEFT JOIN startapp_magicroute..LotesEntregas ent ON ent.IDEmpresa = lot.IDEmpresa AND ent.IDLote = lot.IDLote
    WHERE ${whereConds.join(' AND ')}
    GROUP BY lot.IDLote, lot.IDEmpresa, lot.DataLote, lot.CodigoMotorista, u.Nome, locSaida.NomeLocal, locChegada.NomeLocal, vei.Veiculo, vei.PlacaEntrega, vei.UrlVeiculo, lot.HoraSaidaPrevista, lot.HoraRetornoPrevista, lot.Situacao, lot.StatusRoteirizacao
    ORDER BY lot.IDLote DESC`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * GET /api/entregas/por-lote
 * Busca entregas de um lote específico
 */
router.get('/por-lote', async (req, res) => {
    const idEmpresa = (0, sql_service_1.sanitize)(req.query.IdEmpresa || '');
    if (!(0, sql_service_1.requireParam)(idEmpresa, 'IdEmpresa', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    if (!(0, sql_service_1.requireParam)(codigoMotorista, 'CodigoMotorista', res))
        return;
    const idLote = (0, sql_service_1.sanitize)(req.query.IDLote || '');
    if (!(0, sql_service_1.requireParam)(idLote, 'IDLote', res))
        return;
    const query = `SELECT * FROM startapp_magicroute..Entregas ent
    WHERE ent.IDEmpresa = ${idEmpresa} AND ent.CodigoMotorista = ${codigoMotorista} AND ent.IDLote = ${idLote}
    ORDER BY ent.SequenciaRoteirizada, ent.SequenciaOriginal ASC`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * PATCH /api/entregas/salvar-hora-saida
 * Atualiza apenas a hora de saída do lote
 */
router.patch('/salvar-hora-saida', async (req, res) => {
    const { IDEmpresa, IDLote, HoraSaida } = req.body;
    if (!IDEmpresa || !IDLote)
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });
    try {
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET HoraSaidaPrevista = '${(0, sql_service_1.sanitize)(HoraSaida || '')}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        res.json({ sucesso: true, mensagem: 'Hora atualizada.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
/**
 * PATCH /api/entregas/salvar-tempo-atendimento
 * Atualiza apenas o tempo de atendimento (parada) do lote
 */
router.patch('/salvar-tempo-atendimento', async (req, res) => {
    const { IDEmpresa, IDLote, TempoAtendimento } = req.body;
    if (!IDEmpresa || !IDLote)
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });
    try {
        const valorSet = TempoAtendimento === null || TempoAtendimento === '' ? 'NULL' : Number(TempoAtendimento);
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET TempoAtendimento = ${valorSet}
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        res.json({ sucesso: true, mensagem: 'Tempo de atendimento atualizado.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
/**
 * PATCH /api/entregas/alterar-motorista
 * Atualiza o motorista designado para o lote
 */
router.patch('/alterar-motorista', async (req, res) => {
    const { IDEmpresa, IDLote, CodigoMotorista } = req.body;
    if (!IDEmpresa || !IDLote || !CodigoMotorista) {
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros (IDEmpresa, IDLote ou CodigoMotorista).' });
    }
    try {
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET CodigoMotorista = ${Number(CodigoMotorista)}
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        res.json({ sucesso: true, mensagem: 'Motorista do lote alterado com sucesso.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
/**
 * PATCH /api/entregas/salvar-data-lote
 * Atualiza a data do lote inteiro e todas as entregas do lote
 */
router.patch('/salvar-data-lote', async (req, res) => {
    const { IDEmpresa, IDLote, DataLote } = req.body;
    if (!IDEmpresa || !IDLote || !DataLote) {
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });
    }
    try {
        let dateISO = ''; // YYYY-MM-DD
        let dateBR = ''; // DD/MM/YYYY
        const cleanDate = (0, sql_service_1.sanitize)(DataLote);
        if (cleanDate.includes('-')) {
            const parts = cleanDate.split('-');
            dateISO = cleanDate;
            dateBR = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        else if (cleanDate.includes('/')) {
            const parts = cleanDate.split('/');
            dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
            dateBR = cleanDate;
        }
        else {
            return res.status(400).json({ sucesso: false, mensagem: 'Formato de data inválido. Use YYYY-MM-DD ou DD/MM/YYYY.' });
        }
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET DataLote = '${dateISO}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..LotesEntregas 
      SET DataEntrega = '${dateBR}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        res.json({ sucesso: true, mensagem: 'Data do lote e entregas atualizada.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
const google_service_1 = require("../services/google.service");
const routing_service_1 = require("../services/routing.service");
const logs_routes_1 = require("./logs.routes");
/**
 * POST /api/entregas/roteirizar
 * Executa roteirização de um lote
 */
router.post('/roteirizar', async (req, res) => {
    console.log('--- ROTEIRIZAR BODY ---', req.body);
    const { IDEmpresa, IDLote, OtimizarRota, HoraSaida, TempoAtendimento } = req.body;
    let mensagemSucesso = '';
    // Força a gravação síncrona dos valores na base ANTES de rodar a roteirização para evitar corrida com o onBlur
    if (HoraSaida !== undefined || TempoAtendimento !== undefined) {
        try {
            const horaStr = HoraSaida ? `'${(0, sql_service_1.sanitize)(HoraSaida)}'` : 'HoraSaidaPrevista';
            const tempoStr = TempoAtendimento === '' || TempoAtendimento === null || TempoAtendimento === undefined ? 'NULL' : Number(TempoAtendimento);
            await (0, database_1.executeQuery)(`
        UPDATE startapp_magicroute..Lotes 
        SET HoraSaidaPrevista = ${HoraSaida !== undefined ? horaStr : 'HoraSaidaPrevista'},
            TempoAtendimento = ${TempoAtendimento !== undefined ? tempoStr : 'TempoAtendimento'}
        WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
      `);
        }
        catch (e) {
            console.error('Erro ao salvar campos opcionais antes da roteirizacao', e);
        }
    }
    try {
        if (Number(OtimizarRota) !== 0) {
            // 1. Tenta no master2 (onde as procedures estão localizadas)
            await (0, database_1.executeQuery)(`EXEC master2..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
            mensagemSucesso = 'Roteirizado via procedure original no master2.';
        }
        else {
            mensagemSucesso = 'Ordem manual preservada. Calculando apenas ETAs.';
        }
    }
    catch (err2) {
        console.warn('Falhou no master2. Tentando no master...', err2.message);
        try {
            if (Number(OtimizarRota) !== 0) {
                // 2. Tenta no master (fallback histórico)
                await (0, database_1.executeQuery)(`EXEC master..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
                mensagemSucesso = 'Roteirizado via procedure no master.';
            }
        }
        catch (err) {
            console.warn('Procedure no master não encontrada ou falhou. Rodando fallback inteligente...', err.message);
            try {
                // ══════════════════════════════════════════════════════════
                // FALLBACK: Roteirização Inteligente com Janelas de Tempo
                // ══════════════════════════════════════════════════════════
                // Buscar entregas com campos de janela de tempo
                const queryGet = `SELECT le.IDEmpresa, le.IDLote, le.NrNotaFiscal, le.NumeroPedido,
                            le.LatitudeEntrega, le.LongitudeEntrega, 
                            le.DataEntrega, le.DataEntregaExigida, le.HoraEntregaExigida,
                            le.HoraRecebimentoInicio1, le.HoraRecebimentoFim1,
                            le.HoraRecebimentoInicio2, le.HoraRecebimentoFim2,
                            le.StatusEntrega,
                            loc.Latitude as LatOrigemSaida, loc.Longitude as LngOrigemSaida
                          FROM startapp_magicroute..LotesEntregas le
                          INNER JOIN startapp_magicroute..Lotes l ON l.IDLote = le.IDLote AND l.IDEmpresa = le.IDEmpresa
                          LEFT JOIN startapp_magicroute..Locais loc ON loc.CodigoLocal = l.CodigoLocalSaida AND loc.IDEmpresa = l.IDEmpresa
                          WHERE le.IDEmpresa = ${Number(IDEmpresa)} AND le.IDLote = ${Number(IDLote)}`;
                const entregas = await (0, database_1.executeQuery)(queryGet);
                if (entregas.length === 0) {
                    return res.json({ sucesso: true, mensagem: 'Nenhuma entrega encontrada para roteirizar.' });
                }
                // Buscar configuração de hora de saída e tempo de atendimento
                const configResult = await (0, database_1.executeQuery)(`
          SELECT l.HoraSaidaPrevista, l.TempoAtendimento, e.TempoAtendimentoPadrao 
          FROM startapp_magicroute..Lotes l
          INNER JOIN startapp_magicroute..Empresas e ON e.IDEmpresa = l.IDEmpresa
          WHERE l.IDEmpresa = ${Number(IDEmpresa)} AND l.IDLote = ${Number(IDLote)}
        `);
                const horaSaidaConfig = HoraSaida || (configResult.length > 0 ? configResult[0].HoraSaidaPrevista : '08:00') || '08:00';
                let tempoAtendimentoMin = 5;
                if (configResult.length > 0) {
                    if (configResult[0].TempoAtendimento !== null)
                        tempoAtendimentoMin = configResult[0].TempoAtendimento;
                    else if (configResult[0].TempoAtendimentoPadrao !== null)
                        tempoAtendimentoMin = configResult[0].TempoAtendimentoPadrao;
                }
                // Coordenadas do local de saída
                const origemLat = parseFloat(entregas[0].LatOrigemSaida || '0');
                const origemLng = parseFloat(entregas[0].LngOrigemSaida || '0');
                // Filtrar entregas já concluídas (manter posição, não reordenar)
                const entregasConcluidas = entregas.filter((e) => {
                    const status = (e.StatusEntrega || '').toLowerCase();
                    return status.includes('entregue') || status.includes('concluido') || status.includes('finalizada');
                });
                const entregasPendentes = entregas.filter((e) => {
                    const status = (e.StatusEntrega || '').toLowerCase();
                    return !(status.includes('entregue') || status.includes('concluido') || status.includes('finalizada'));
                });
                if (Number(OtimizarRota) === 0) {
                    mensagemSucesso = 'Recálculo de ETAs mantendo a ordem manual.';
                }
                else {
                    // Preparar dados para o serviço de roteirização
                    const pontosParaRoteirizar = entregasPendentes
                        .map((e) => ({
                        NrNotaFiscal: e.NrNotaFiscal || '',
                        NumeroPedido: e.NumeroPedido || '',
                        LatitudeEntrega: e.LatitudeEntrega || '0',
                        LongitudeEntrega: e.LongitudeEntrega || '0',
                        DataEntrega: e.DataEntrega || '',
                        DataEntregaExigida: e.DataEntregaExigida || '',
                        HoraEntregaExigida: e.HoraEntregaExigida || '',
                        HoraRecebimentoInicio1: e.HoraRecebimentoInicio1 || '',
                        HoraRecebimentoFim1: e.HoraRecebimentoFim1 || '',
                        HoraRecebimentoInicio2: e.HoraRecebimentoInicio2 || '',
                        HoraRecebimentoFim2: e.HoraRecebimentoFim2 || '',
                        StatusEntrega: e.StatusEntrega || '',
                        lat: parseFloat(e.LatitudeEntrega || '0'),
                        lng: parseFloat(e.LongitudeEntrega || '0'),
                    }))
                        .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
                    const semCoordenadas = entregasPendentes.filter((e) => {
                        const lat = parseFloat(e.LatitudeEntrega || '0');
                        const lng = parseFloat(e.LongitudeEntrega || '0');
                        return isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0);
                    });
                    if (pontosParaRoteirizar.length <= 1 && semCoordenadas.length === entregasPendentes.length) {
                        // Sem coordenadas válidas – atribuir sequência padrão
                        for (let i = 0; i < entregas.length; i++) {
                            const nf = entregas[i].NrNotaFiscal || entregas[i].NumeroPedido || '';
                            await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${i + 1} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                        }
                        mensagemSucesso = 'Roteirizado por ordem padrão (sem coordenadas suficientes).';
                    }
                    else {
                        // ═══ NOVO ALGORITMO: Roteirização por Janelas de Tempo ═══
                        const rotaOtimizada = (0, routing_service_1.ordenarPorJanelasDeTempo)(pontosParaRoteirizar, horaSaidaConfig, tempoAtendimentoMin, origemLat, origemLng);
                        // Gravar sequências das entregas otimizadas
                        let seq = 1;
                        for (const p of rotaOtimizada) {
                            const nf = p.NrNotaFiscal || p.NumeroPedido || '';
                            await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${seq++} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                        }
                        // Entregas sem coordenadas: colocar no final
                        for (const e of semCoordenadas) {
                            const nf = e.NrNotaFiscal || e.NumeroPedido || '';
                            const jaOrdenada = rotaOtimizada.some(r => (r.NrNotaFiscal === nf) || (r.NumeroPedido === nf));
                            if (!jaOrdenada) {
                                await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                    SET SequenciaRoteirizada = ${seq++} 
                                    WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                            }
                        }
                        // Entregas concluídas: manter no final (não reordenar)
                        for (const e of entregasConcluidas) {
                            const nf = e.NrNotaFiscal || e.NumeroPedido || '';
                            await (0, database_1.executeQuery)(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${seq++} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
                        }
                        mensagemSucesso = 'Roteirizado com sucesso pelo algoritmo inteligente (janelas de tempo).';
                    }
                }
            }
            catch (fallbackErr) {
                console.error('Falha geral no fallback da roteirização:', fallbackErr.message);
                return res.status(500).json({ sucesso: false, mensagem: 'Erro na roteirização: ' + fallbackErr.message });
            }
        }
    }
    // --- CÁLCULO DE ETA (Tempo Estimado) COM GOOGLE MAPS ---
    try {
        const entregasOrdenadas = await (0, database_1.executeQuery)(`
      SELECT e.NrNotaFiscal, e.NumeroPedido, e.LatitudeEntrega, e.LongitudeEntrega, 
             e.HoraRecebimentoInicio1, e.HoraRecebimentoFim1, 
             e.HoraRecebimentoInicio2, e.HoraRecebimentoFim2,
             loc.Latitude as LatitudeLocalSaida, loc.Longitude as LongitudeLocalSaida, 
             locCheg.Latitude as LatitudeLocalChegada, locCheg.Longitude as LongitudeLocalChegada, 
             l.HoraSaidaPrevista 
      FROM startapp_magicroute..Entregas e
      INNER JOIN startapp_magicroute..Lotes l ON l.IDLote = e.IDLote AND l.IDEmpresa = e.IDEmpresa
      LEFT JOIN startapp_magicroute..Locais loc ON loc.CodigoLocal = l.CodigoLocalSaida AND loc.IDEmpresa = l.IDEmpresa
      LEFT JOIN startapp_magicroute..Locais locCheg ON locCheg.CodigoLocal = l.CodigoLocalChegada AND locCheg.IDEmpresa = l.IDEmpresa
      WHERE e.IDEmpresa = ${Number(IDEmpresa)} AND e.IDLote = ${Number(IDLote)}
      ORDER BY e.SequenciaRoteirizada ASC, e.SequenciaOriginal ASC
    `);
        if (entregasOrdenadas.length > 0) {
            const e = entregasOrdenadas[0];
            const latSaida = parseFloat(e.LatitudeLocalSaida);
            const lngSaida = parseFloat(e.LongitudeLocalSaida);
            const latChegada = parseFloat(e.LatitudeLocalChegada) || latSaida;
            const lngChegada = parseFloat(e.LongitudeLocalChegada) || lngSaida;
            if (!isNaN(latSaida) && !isNaN(lngSaida)) {
                const paradas = entregasOrdenadas.map((ent) => ({
                    lat: parseFloat(ent.LatitudeEntrega),
                    lng: parseFloat(ent.LongitudeEntrega),
                    nf: ent.NrNotaFiscal || ent.NumeroPedido || ''
                })).filter((c) => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);
                if (paradas.length > 0) {
                    // Lidar com limite de 25 waypoints agrupando os requests (para simplificar, calculamos os primeiros 25)
                    const waypointsChunk = paradas.slice(0, 25);
                    const origin = { lat: latSaida, lng: lngSaida };
                    const destination = paradas.length > 25
                        ? waypointsChunk[waypointsChunk.length - 1]
                        : { lat: latChegada, lng: lngChegada };
                    const legs = await (0, google_service_1.getDirectionsETA)(origin, destination, waypointsChunk);
                    if (legs && legs.length > 0) {
                        let dataBase = new Date();
                        const horaInicioRaw = req.body.HoraSaida || e.HoraSaidaPrevista || '08:00';
                        if (horaInicioRaw) {
                            const [h, m] = horaInicioRaw.split(':');
                            if (h && m) {
                                dataBase.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                            }
                        }
                        const horaSaidaInicial = `${dataBase.getHours().toString().padStart(2, '0')}:${dataBase.getMinutes().toString().padStart(2, '0')}`;
                        // Buscar configuração de tempo
                        const configResult = await (0, database_1.executeQuery)(`
              SELECT l.TempoAtendimento, e.TempoAtendimentoPadrao 
              FROM startapp_magicroute..Lotes l
              INNER JOIN startapp_magicroute..Empresas e ON e.IDEmpresa = l.IDEmpresa
              WHERE l.IDEmpresa = ${Number(IDEmpresa)} AND l.IDLote = ${Number(IDLote)}
            `);
                        let tempoAtendimentoMinutos = 5;
                        if (configResult.length > 0) {
                            if (configResult[0].TempoAtendimento !== null) {
                                tempoAtendimentoMinutos = configResult[0].TempoAtendimento;
                            }
                            else if (configResult[0].TempoAtendimentoPadrao !== null) {
                                tempoAtendimentoMinutos = configResult[0].TempoAtendimentoPadrao;
                            }
                        }
                        const tempoAtendimentoSegundos = tempoAtendimentoMinutos * 60;
                        for (let i = 0; i < waypointsChunk.length; i++) {
                            if (legs[i]) {
                                const duracaoSegundos = legs[i].duration.value;
                                const distanciaMetros = legs[i].distance.value;
                                const distanciaKm = (distanciaMetros / 1000).toFixed(2);
                                // Soma a viagem
                                dataBase.setSeconds(dataBase.getSeconds() + duracaoSegundos);
                                // Aplicar tempo de espera de janelas de atendimento no ETA real
                                const entOrd = entregasOrdenadas[i];
                                if (entOrd) {
                                    const inicio1Raw = entOrd.HoraRecebimentoInicio1;
                                    const fim1Raw = entOrd.HoraRecebimentoFim1;
                                    const inicio2Raw = entOrd.HoraRecebimentoInicio2;
                                    const fim2Raw = entOrd.HoraRecebimentoFim2;
                                    const p1 = (0, routing_service_1.parseHoraRaw)(entOrd.HoraRecebimentoInicio1);
                                    const pf1 = (0, routing_service_1.parseHoraRaw)(entOrd.HoraRecebimentoFim1);
                                    const p2 = (0, routing_service_1.parseHoraRaw)(entOrd.HoraRecebimentoInicio2);
                                    const pf2 = (0, routing_service_1.parseHoraRaw)(entOrd.HoraRecebimentoFim2);
                                    const w1Def = p1 !== null && pf1 !== null;
                                    const w2Def = p2 !== null && pf2 !== null;
                                    if (w1Def || w2Def) {
                                        const curHours = dataBase.getHours();
                                        const curMinutes = dataBase.getMinutes();
                                        const curMinOfDay = curHours * 60 + curMinutes;
                                        if (w1Def && w2Def) {
                                            const i1Min = p1.h * 60 + p1.m;
                                            const f1Min = pf1.h * 60 + pf1.m;
                                            const i2Min = p2.h * 60 + p2.m;
                                            if (curMinOfDay < i1Min) {
                                                dataBase.setHours(p1.h, p1.m, 0, 0);
                                            }
                                            else if (curMinOfDay > f1Min && curMinOfDay < i2Min) {
                                                dataBase.setHours(p2.h, p2.m, 0, 0);
                                            }
                                        }
                                        else if (w1Def) {
                                            const i1Min = p1.h * 60 + p1.m;
                                            if (curMinOfDay < i1Min) {
                                                dataBase.setHours(p1.h, p1.m, 0, 0);
                                            }
                                        }
                                        else if (w2Def) {
                                            const i2Min = p2.h * 60 + p2.m;
                                            if (curMinOfDay < i2Min) {
                                                dataBase.setHours(p2.h, p2.m, 0, 0);
                                            }
                                        }
                                    }
                                }
                                const dataFormatada = `${dataBase.getFullYear()}-${(dataBase.getMonth() + 1).toString().padStart(2, '0')}-${dataBase.getDate().toString().padStart(2, '0')}`;
                                const horaFormatada = `${dataBase.getHours().toString().padStart(2, '0')}:${dataBase.getMinutes().toString().padStart(2, '0')}`;
                                const tempoFormatado = Math.floor(duracaoSegundos / 60) + ' min';
                                await (0, database_1.executeQuery)(`
                  UPDATE startapp_magicroute..LotesEntregas 
                  SET TempoPrevistoEntrega = '${tempoFormatado}', 
                      DistanciaPrevista = ${distanciaKm}, 
                      DataEntregaPrevista = '${dataFormatada}', 
                      HoraEntregaPrevista = '${horaFormatada}'
                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${waypointsChunk[i].nf}' OR NumeroPedido = '${waypointsChunk[i].nf}')
                `);
                                // Soma o tempo de atendimento antes de ir pra próxima parada
                                dataBase.setSeconds(dataBase.getSeconds() + tempoAtendimentoSegundos);
                            }
                        }
                        // A última leg é o trecho da última entrega de volta para a base (depósito)
                        const legRetorno = legs[waypointsChunk.length];
                        if (legRetorno) {
                            dataBase.setSeconds(dataBase.getSeconds() + legRetorno.duration.value);
                        }
                        const horaRetornoFinal = `${dataBase.getHours().toString().padStart(2, '0')}:${dataBase.getMinutes().toString().padStart(2, '0')}`;
                        // Salvar Início e Fim no Lote
                        await (0, database_1.executeQuery)(`
              UPDATE startapp_magicroute..Lotes 
              SET HoraSaidaPrevista = '${horaSaidaInicial}', HoraRetornoPrevista = '${horaRetornoFinal}'
              WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
            `);
                    }
                }
            }
        }
    }
    catch (etaErr) {
        console.error('Erro ao calcular ETAs:', etaErr);
    }
    // Registrar Log de Roteirização/Reordenação
    try {
        const isOtimizacao = Number(OtimizarRota) !== 0;
        const acaoLog = isOtimizacao ? 'REORDENACAO_ROTA' : 'REORDENACAO_ROTA';
        const descLog = isOtimizacao
            ? `Otimizou inteligentemente a rota do Lote #${IDLote}.`
            : `Alterou manualmente a sequência de entregas do Lote #${IDLote}.`;
        await (0, logs_routes_1.registrarLogInterno)({
            idEmpresa: Number(IDEmpresa),
            idLote: Number(IDLote),
            usuario: req.body.UsuarioNome || 'Admin',
            tipoAcao: acaoLog,
            descricao: descLog
        });
    }
    catch (logErr) {
        console.error('Erro ao salvar log de roteirização:', logErr);
    }
    return res.json({ sucesso: true, mensagem: mensagemSucesso });
});
/**
 * POST /api/entregas/gravar-evento
 * Grava data/hora de evento (início/fim entrega)
 */
router.post('/gravar-evento', async (req, res) => {
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
            console.error('Erro ao gerar log automático em gravar-evento:', logErr);
        }
        res.json({ sucesso: true });
    }
    catch (err) {
        console.error('[ERRO SQL]', err.message);
        res.status(500).json({ sucesso: false, error: err.message });
    }
});
// ==========================================
// LOTES E ENTREGAS PENDENTES - App Rotas
// ==========================================
/**
 * GET /api/entregas/lotes
 * Busca lotes de entrega por data (App Rotas - banco dinâmico)
 */
router.get('/lotes', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const codigoMotorista = (0, sql_service_1.sanitize)(req.query.CodigoMotorista || '');
    if (!(0, sql_service_1.requireParam)(codigoMotorista, 'CodigoMotorista', res))
        return;
    const dataEntrega = (0, sql_service_1.sanitize)(req.query.DataEntrega || '');
    if (!(0, sql_service_1.requireParam)(dataEntrega, 'DataEntrega', res))
        return;
    const query = `SELECT
    idlote,
    sai.Nome as NomeLocal,
    sai.horariosaida,
    vei.veiculo,
    vei.urlfoto,
    vei.placa,
    DataEntrega,
    COUNT(IDENTREGA) as QuantidadeEntregas,
    SUM(Peso) as Peso,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Pendente' AND ent.codigomotorista = lote.codigomotorista) as Pendentes,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Entregue' AND ent.codigomotorista = lote.codigomotorista) as Entregues,
    (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Não Entregue' AND ent.codigomotorista = lote.codigomotorista) as [Não Entregues]
    FROM ${bd}..entregas Lote
    LEFT JOIN ${bd}..LocalSaidas sai ON sai.idlocal = lote.idlocalsaida
    LEFT JOIN ${bd}..veiculos vei ON vei.codigoveiculo = lote.codigoveiculo
    WHERE codigomotorista = ${codigoMotorista}
      AND (SELECT COUNT(IDENTREGA) FROM ${bd}..Entregas ent WHERE ent.idlote = lote.idlote AND situacaoentrega = 'Pendente' AND ent.codigomotorista = lote.codigomotorista) > 0
      AND dataentrega = CAST('${dataEntrega}' AS DATE)
    GROUP BY idlote, codigomotorista, dataentrega, idlocalsaida, sai.nome, vei.veiculo, vei.urlfoto, vei.placa, sai.horariosaida`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * GET /api/entregas/pendentes
 * Busca entregas pendentes de um lote (App Rotas)
 */
router.get('/pendentes', async (req, res) => {
    const bd = (0, sql_service_1.sanitize)(req.query.bd || '');
    if (!(0, sql_service_1.requireParam)(bd, 'bd', res))
        return;
    const idLote = (0, sql_service_1.sanitize)(req.query.IdLote || '');
    if (!(0, sql_service_1.requireParam)(idLote, 'IdLote', res))
        return;
    const query = `SELECT * FROM ${bd}..Entregas
    WHERE IDLOTE = ${idLote} AND situacaoentrega = 'Pendente'
    ORDER BY sequenciaforcada, sequencia ASC`;
    await (0, sql_service_1.execAndRespond)(query, res);
});
/**
 * POST /api/entregas/importar-lote
 * Importa uma lista de entregas em lote para um IDLote
 */
router.post('/importar-lote', async (req, res) => {
    console.log('[importar-lote] body recebido:', req.body);
    const { IdEmpresa, IDLote, Entregas, UsuarioNome } = req.body;
    if (!IdEmpresa || !IDLote || !Array.isArray(Entregas) || Entregas.length === 0) {
        return res.status(400).json({ sucesso: false, erro: 'Parâmetros inválidos ou lista de entregas vazia.' });
    }
    try {
        const pool = await (0, database_1.getPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            // 1. Obter maior sequencia original atual
            const seqResult = await transaction.request().query(`
        SELECT ISNULL(MAX(SequenciaOriginal), 0) AS MaxSeq 
        FROM startapp_magicroute..LotesEntregas 
        WHERE IDEmpresa = ${Number(IdEmpresa)} AND IDLote = ${Number(IDLote)}
      `);
            let seq = seqResult.recordset[0].MaxSeq || 0;
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const hojeStr = `${dd}/${mm}/${yyyy}`;
            for (const entrega of Entregas) {
                seq++;
                const pedido = (0, sql_service_1.sanitize)(String(entrega.NumeroPedido || ''));
                const nota = (0, sql_service_1.sanitize)(String(entrega.NrNotaFiscal || ''));
                const cliente = (0, sql_service_1.sanitize)(String(entrega.NomeCliente || ''));
                const endereco = (0, sql_service_1.sanitize)(String(entrega.EnderecoEntrega || ''));
                const bairro = (0, sql_service_1.sanitize)(String(entrega.Bairro || ''));
                const cidade = (0, sql_service_1.sanitize)(String(entrega.Cidade || ''));
                const cep = (0, sql_service_1.sanitize)(String(entrega.CEP || ''));
                const uf = (0, sql_service_1.sanitize)(String(entrega.UFEntrega || 'SP'));
                const valor = Number(entrega.ValorRecebido || 0);
                const pagamento = (0, sql_service_1.sanitize)(String(entrega.TipoPagamento || 'A Faturar'));
                const obs = (0, sql_service_1.sanitize)(String(entrega.Observacoes || ''));
                let dataEntrega = (0, sql_service_1.sanitize)(String(entrega.DataEntrega || hojeStr));
                if (dataEntrega.includes('-')) {
                    const parts = dataEntrega.split('-');
                    dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                const lat = entrega.LatitudeEntrega !== undefined && entrega.LatitudeEntrega !== '' ? `'${(0, sql_service_1.sanitize)(String(entrega.LatitudeEntrega))}'` : 'NULL';
                const lng = entrega.LongitudeEntrega !== undefined && entrega.LongitudeEntrega !== '' ? `'${(0, sql_service_1.sanitize)(String(entrega.LongitudeEntrega))}'` : 'NULL';
                const horaInicio1 = (0, sql_service_1.sanitize)(String(entrega.HoraRecebimentoInicio1 || ''));
                const horaFim1 = (0, sql_service_1.sanitize)(String(entrega.HoraRecebimentoFim1 || ''));
                const horaInicio2 = (0, sql_service_1.sanitize)(String(entrega.HoraRecebimentoInicio2 || ''));
                const horaFim2 = (0, sql_service_1.sanitize)(String(entrega.HoraRecebimentoFim2 || ''));
                // Validação extra no backend
                if (!pedido || !nota || !cliente) {
                    throw new Error(`Dados obrigatórios ausentes para o cliente ${cliente || '(Desconhecido)'}.`);
                }
                if (!endereco && (lat === 'NULL' || lng === 'NULL')) {
                    throw new Error(`Entrega do pedido ${pedido} deve possuir Endereço ou Latitude e Longitude.`);
                }
                const queryInsert = `
          INSERT INTO startapp_magicroute..LotesEntregas (
            IDEmpresa, IDLote, NumeroPedido, NrNotaFiscal, NomeCliente, EnderecoEntrega, 
            Bairro, Cidade, CEP, StatusEntrega, DataPedido, DataEntrega, 
            StatusRoteirizacao, SequenciaOriginal, SequenciaRoteirizada, DataCriacao, UFEntrega, Pais,
            ValorRecebido, TipoPagamento, Observacoes, DocumentoRecebedor, NomeRecebimento,
            UsuarioCriacao, LatitudeEntrega, LongitudeEntrega,
            HoraRecebimentoInicio1, HoraRecebimentoFim1, HoraRecebimentoInicio2, HoraRecebimentoFim2
          ) VALUES (
            ${Number(IdEmpresa)}, ${Number(IDLote)}, '${pedido}', '${nota}', '${cliente}', '${endereco}', 
            '${bairro}', '${cidade}', '${cep}', 'Pendente', '${hojeStr}', '${dataEntrega}', 
            'Pendente', ${seq}, ${seq}, '${hojeStr}', '${uf}', 'Brasil',
            ${valor}, '${pagamento}', '${obs}', '', '',
            1, ${lat}, ${lng},
            '${horaInicio1}', '${horaFim1}', '${horaInicio2}', '${horaFim2}'
          )
        `;
                await transaction.request().query(queryInsert);
            }
            await transaction.commit();
            // Gravar log da importação em lote
            try {
                await (0, logs_routes_1.registrarLogInterno)({
                    idEmpresa: Number(IdEmpresa),
                    idLote: Number(IDLote),
                    usuario: (0, sql_service_1.sanitize)(UsuarioNome || 'Admin'),
                    tipoAcao: 'ALTERACAO_ADM',
                    descricao: `Importou ${Entregas.length} entregas em lote a partir de planilha.`
                });
            }
            catch (logErr) {
                console.error('Erro ao salvar log de importação em lote:', logErr);
            }
            res.json({ sucesso: true, mensagem: `Importadas ${Entregas.length} entregas com sucesso.` });
        }
        catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    }
    catch (err) {
        console.error('Erro ao importar entregas em lote:', err);
        res.status(500).json({ sucesso: false, erro: err.message });
    }
});
/**
 * PATCH /api/entregas/finalizar-lote
 * Dar baixa / finalizar um lote de entrega
 */
router.patch('/finalizar-lote', async (req, res) => {
    const { IDEmpresa, IDLote, UsuarioNome } = req.body;
    if (!IDEmpresa || !IDLote)
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros obrigatórios.' });
    try {
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET Situacao = 'Concluido'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        try {
            await (0, logs_routes_1.registrarLogInterno)({
                idEmpresa: Number(IDEmpresa),
                idLote: Number(IDLote),
                usuario: (0, sql_service_1.sanitize)(UsuarioNome || 'Admin'),
                tipoAcao: 'ALTERACAO_ADM',
                descricao: `Deu baixa / finalizou o Lote #${IDLote}.`
            });
        }
        catch (logErr) {
            console.error('Erro ao registrar log:', logErr);
        }
        res.json({ sucesso: true, mensagem: 'Lote finalizado com sucesso.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
/**
 * PATCH /api/entregas/reabrir-lote
 * Reabre um lote finalizado
 */
router.patch('/reabrir-lote', async (req, res) => {
    const { IDEmpresa, IDLote, UsuarioNome } = req.body;
    if (!IDEmpresa || !IDLote)
        return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros obrigatórios.' });
    try {
        await (0, database_1.executeQuery)(`
      UPDATE startapp_magicroute..Lotes 
      SET Situacao = 'Em Aberto'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
        try {
            await (0, logs_routes_1.registrarLogInterno)({
                idEmpresa: Number(IDEmpresa),
                idLote: Number(IDLote),
                usuario: (0, sql_service_1.sanitize)(UsuarioNome || 'Admin'),
                tipoAcao: 'ALTERACAO_ADM',
                descricao: `Reabriu o Lote #${IDLote}.`
            });
        }
        catch (logErr) {
            console.error('Erro ao registrar log:', logErr);
        }
        res.json({ sucesso: true, mensagem: 'Lote reaberto com sucesso.' });
    }
    catch (err) {
        res.status(500).json({ sucesso: false, mensagem: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=entregas.routes.js.map