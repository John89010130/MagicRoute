import { Router, Request, Response } from 'express';
import { execAndRespond, sanitize, requireParam } from '../services/sql.service';
import { executeQuery, getPool } from '../config/database';

const router = Router();

// ==========================================
// ENTREGAS - MagicRoute (startapp_magicroute)
// ==========================================

/**
 * GET /api/entregas/por-data
 * Busca entregas por data (agrupado por lote)
 */
router.get('/por-data', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;

  let dataInicial = sanitize(req.query.DataInicial as string || '');
  if (!dataInicial) {
    const today = new Date();
    dataInicial = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  }

  let dataFinal = sanitize(req.query.DataFinal as string || '');
  if (!dataFinal) dataFinal = dataInicial;

  const query = `SELECT
    ent.IDLote, ent.LocalSaida, ent.DataEntrega, ent.Veiculo, ent.UrlVeiculo, ent.PlacaEntrega,
    COUNT(DISTINCT pend.NrNotaFiscal) AS Pendente,
    COUNT(DISTINCT Entregue.NrNotaFiscal) AS Entregue,
    COUNT(DISTINCT EmTransporte.NrNotaFiscal) AS EmTransporte
    FROM startapp_magicroute..Entregas ent
    LEFT JOIN (
      SELECT NrNotaFiscal, IDEmpresa, IDLote FROM startapp_magicroute..Entregas WHERE StatusEntrega = 'Pendente'
    ) Pend ON pend.IDEmpresa = ent.IDEmpresa AND Pend.IDLote = ent.IDLote
    LEFT JOIN (
      SELECT NrNotaFiscal, IDEmpresa, IDLote FROM startapp_magicroute..Entregas WHERE StatusEntrega = 'Entregue'
    ) Entregue ON Entregue.IDEmpresa = ent.IDEmpresa AND Entregue.IDLote = ent.IDLote
    LEFT JOIN (
      SELECT NrNotaFiscal, IDEmpresa, IDLote FROM startapp_magicroute..Entregas WHERE StatusEntrega = 'Em Transporte'
    ) EmTransporte ON EmTransporte.IDEmpresa = ent.IDEmpresa AND EmTransporte.IDLote = ent.IDLote
    WHERE ent.IDEmpresa = ${idEmpresa} AND ent.CodigoMotorista = ${codigoMotorista}
      AND CAST(ent.DataEntrega AS DATE) BETWEEN '${dataInicial}' AND '${dataFinal}'
    GROUP BY ent.IDLote, ent.LocalSaida, ent.DataEntrega, ent.Veiculo, ent.PlacaEntrega, ent.UrlVeiculo`;

  await execAndRespond(query, res);
});

/**
 * GET /api/entregas/por-lote
 * Busca entregas de um lote específico
 */
router.get('/por-lote', async (req: Request, res: Response) => {
  const idEmpresa = sanitize(req.query.IdEmpresa as string || '');
  if (!requireParam(idEmpresa, 'IdEmpresa', res)) return;

  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;

  const idLote = sanitize(req.query.IDLote as string || '');
  if (!requireParam(idLote, 'IDLote', res)) return;

  const query = `SELECT * FROM startapp_magicroute..Entregas ent
    WHERE ent.IDEmpresa = ${idEmpresa} AND ent.CodigoMotorista = ${codigoMotorista} AND ent.IDLote = ${idLote}
    ORDER BY ent.SequenciaRoteirizada, ent.SequenciaOriginal ASC`;

  await execAndRespond(query, res);
});

/**
 * PATCH /api/entregas/salvar-hora-saida
 * Atualiza apenas a hora de saída do lote
 */
router.patch('/salvar-hora-saida', async (req: Request, res: Response) => {
  const { IDEmpresa, IDLote, HoraSaida } = req.body;
  if (!IDEmpresa || !IDLote) return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });

  try {
    await executeQuery(`
      UPDATE startapp_magicroute..Lotes 
      SET HoraSaidaPrevista = '${sanitize(HoraSaida || '')}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
    res.json({ sucesso: true, mensagem: 'Hora atualizada.' });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

/**
 * PATCH /api/entregas/salvar-tempo-atendimento
 * Atualiza apenas o tempo de atendimento (parada) do lote
 */
router.patch('/salvar-tempo-atendimento', async (req: Request, res: Response) => {
  const { IDEmpresa, IDLote, TempoAtendimento } = req.body;
  if (!IDEmpresa || !IDLote) return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });

  try {
    const valorSet = TempoAtendimento === null || TempoAtendimento === '' ? 'NULL' : Number(TempoAtendimento);
    await executeQuery(`
      UPDATE startapp_magicroute..Lotes 
      SET TempoAtendimento = ${valorSet}
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);
    res.json({ sucesso: true, mensagem: 'Tempo de atendimento atualizado.' });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

/**
 * PATCH /api/entregas/salvar-data-lote
 * Atualiza a data do lote inteiro e todas as entregas do lote
 */
router.patch('/salvar-data-lote', async (req: Request, res: Response) => {
  const { IDEmpresa, IDLote, DataLote } = req.body;
  if (!IDEmpresa || !IDLote || !DataLote) {
    return res.status(400).json({ sucesso: false, mensagem: 'Faltam parâmetros.' });
  }

  try {
    let dateISO = ''; // YYYY-MM-DD
    let dateBR = '';  // DD/MM/YYYY
    const cleanDate = sanitize(DataLote);

    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      dateISO = cleanDate;
      dateBR = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
      dateBR = cleanDate;
    } else {
      return res.status(400).json({ sucesso: false, mensagem: 'Formato de data inválido. Use YYYY-MM-DD ou DD/MM/YYYY.' });
    }

    await executeQuery(`
      UPDATE startapp_magicroute..Lotes 
      SET DataLote = '${dateISO}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);

    await executeQuery(`
      UPDATE startapp_magicroute..LotesEntregas 
      SET DataEntrega = '${dateBR}'
      WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
    `);

    res.json({ sucesso: true, mensagem: 'Data do lote e entregas atualizada.' });
  } catch (err: any) {
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

import { getDirectionsETA } from '../services/google.service';
import { ordenarPorJanelasDeTempo, EntregaParaRoteirizar, parseHoraRaw } from '../services/routing.service';
import { registrarLogInterno } from './logs.routes';

/**
 * POST /api/entregas/roteirizar
 * Executa roteirização de um lote
 */
router.post('/roteirizar', async (req: Request, res: Response) => {
  console.log('--- ROTEIRIZAR BODY ---', req.body);
  const { IDEmpresa, IDLote, OtimizarRota, HoraSaida, TempoAtendimento } = req.body;
  let mensagemSucesso = '';

  // Força a gravação síncrona dos valores na base ANTES de rodar a roteirização para evitar corrida com o onBlur
  if (HoraSaida !== undefined || TempoAtendimento !== undefined) {
    try {
      const horaStr = HoraSaida ? `'${sanitize(HoraSaida)}'` : 'HoraSaidaPrevista';
      const tempoStr = TempoAtendimento === '' || TempoAtendimento === null || TempoAtendimento === undefined ? 'NULL' : Number(TempoAtendimento);
      
      await executeQuery(`
        UPDATE startapp_magicroute..Lotes 
        SET HoraSaidaPrevista = ${HoraSaida !== undefined ? horaStr : 'HoraSaidaPrevista'},
            TempoAtendimento = ${TempoAtendimento !== undefined ? tempoStr : 'TempoAtendimento'}
        WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
      `);
    } catch(e) {
      console.error('Erro ao salvar campos opcionais antes da roteirizacao', e);
    }
  }

  try {
    if (Number(OtimizarRota) !== 0) {
      // 1. Tenta no master2 (onde as procedures estão localizadas)
      await executeQuery(`EXEC master2..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
      mensagemSucesso = 'Roteirizado via procedure original no master2.';
    } else {
      mensagemSucesso = 'Ordem manual preservada. Calculando apenas ETAs.';
    }
  } catch (err2: any) {
    console.warn('Falhou no master2. Tentando no master...', err2.message);
    try {
      if (Number(OtimizarRota) !== 0) {
        // 2. Tenta no master (fallback histórico)
        await executeQuery(`EXEC master..ExecutaRoteirizacao ${Number(IDEmpresa)}, ${Number(IDLote)}, ${Number(OtimizarRota)}`);
        mensagemSucesso = 'Roteirizado via procedure no master.';
      }
    } catch (err: any) {
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
        const entregas = await executeQuery(queryGet);
        
        if (entregas.length === 0) {
          return res.json({ sucesso: true, mensagem: 'Nenhuma entrega encontrada para roteirizar.' });
        }

        // Buscar configuração de hora de saída e tempo de atendimento
        const configResult = await executeQuery(`
          SELECT l.HoraSaidaPrevista, l.TempoAtendimento, e.TempoAtendimentoPadrao 
          FROM startapp_magicroute..Lotes l
          INNER JOIN startapp_magicroute..Empresas e ON e.IDEmpresa = l.IDEmpresa
          WHERE l.IDEmpresa = ${Number(IDEmpresa)} AND l.IDLote = ${Number(IDLote)}
        `);
        
        const horaSaidaConfig = HoraSaida || (configResult.length > 0 ? configResult[0].HoraSaidaPrevista : '08:00') || '08:00';
        let tempoAtendimentoMin = 5;
        if (configResult.length > 0) {
          if (configResult[0].TempoAtendimento !== null) tempoAtendimentoMin = configResult[0].TempoAtendimento;
          else if (configResult[0].TempoAtendimentoPadrao !== null) tempoAtendimentoMin = configResult[0].TempoAtendimentoPadrao;
        }

        // Coordenadas do local de saída
        const origemLat = parseFloat(entregas[0].LatOrigemSaida || '0');
        const origemLng = parseFloat(entregas[0].LngOrigemSaida || '0');

        // Filtrar entregas já concluídas (manter posição, não reordenar)
        const entregasConcluidas = entregas.filter((e: any) => {
          const status = (e.StatusEntrega || '').toLowerCase();
          return status.includes('entregue') || status.includes('concluido') || status.includes('finalizada');
        });
        const entregasPendentes = entregas.filter((e: any) => {
          const status = (e.StatusEntrega || '').toLowerCase();
          return !(status.includes('entregue') || status.includes('concluido') || status.includes('finalizada'));
        });

        if (Number(OtimizarRota) === 0) {
          mensagemSucesso = 'Recálculo de ETAs mantendo a ordem manual.';
        } else {
          // Preparar dados para o serviço de roteirização
          const pontosParaRoteirizar: EntregaParaRoteirizar[] = entregasPendentes
            .map((e: any) => ({
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
            .filter((p: EntregaParaRoteirizar) => !isNaN(p.lat) && !isNaN(p.lng));

          const semCoordenadas = entregasPendentes.filter((e: any) => {
            const lat = parseFloat(e.LatitudeEntrega || '0');
            const lng = parseFloat(e.LongitudeEntrega || '0');
            return isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0);
          });

          if (pontosParaRoteirizar.length <= 1 && semCoordenadas.length === entregasPendentes.length) {
            // Sem coordenadas válidas – atribuir sequência padrão
            for (let i = 0; i < entregas.length; i++) {
              const nf = entregas[i].NrNotaFiscal || entregas[i].NumeroPedido || '';
              await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${i + 1} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
            }
            mensagemSucesso = 'Roteirizado por ordem padrão (sem coordenadas suficientes).';
          } else {
            // ═══ NOVO ALGORITMO: Roteirização por Janelas de Tempo ═══
            const rotaOtimizada = ordenarPorJanelasDeTempo(
              pontosParaRoteirizar,
              horaSaidaConfig,
              tempoAtendimentoMin,
              origemLat,
              origemLng
            );

            // Gravar sequências das entregas otimizadas
            let seq = 1;
            for (const p of rotaOtimizada) {
              const nf = p.NrNotaFiscal || p.NumeroPedido || '';
              await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${seq++} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
            }

            // Entregas sem coordenadas: colocar no final
            for (const e of semCoordenadas) {
              const nf = e.NrNotaFiscal || e.NumeroPedido || '';
              const jaOrdenada = rotaOtimizada.some(r => (r.NrNotaFiscal === nf) || (r.NumeroPedido === nf));
              if (!jaOrdenada) {
                await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                    SET SequenciaRoteirizada = ${seq++} 
                                    WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
              }
            }

            // Entregas concluídas: manter no final (não reordenar)
            for (const e of entregasConcluidas) {
              const nf = e.NrNotaFiscal || e.NumeroPedido || '';
              await executeQuery(`UPDATE startapp_magicroute..LotesEntregas 
                                  SET SequenciaRoteirizada = ${seq++} 
                                  WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)} AND (NrNotaFiscal = '${nf}' OR NumeroPedido = '${nf}')`);
            }

            mensagemSucesso = 'Roteirizado com sucesso pelo algoritmo inteligente (janelas de tempo).';
          }
        }
        
      } catch (fallbackErr: any) {
        console.error('Falha geral no fallback da roteirização:', fallbackErr.message);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro na roteirização: ' + fallbackErr.message });
      }
    }
  }

  // --- CÁLCULO DE ETA (Tempo Estimado) COM GOOGLE MAPS ---
  try {
    const entregasOrdenadas = await executeQuery(`
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
        const paradas = entregasOrdenadas.map((ent: any) => ({
          lat: parseFloat(ent.LatitudeEntrega),
          lng: parseFloat(ent.LongitudeEntrega),
          nf: ent.NrNotaFiscal || ent.NumeroPedido || ''
        })).filter((c: any) => !isNaN(c.lat) && !isNaN(c.lng) && c.lat !== 0 && c.lng !== 0);

        if (paradas.length > 0) {
          // Lidar com limite de 25 waypoints agrupando os requests (para simplificar, calculamos os primeiros 25)
          const waypointsChunk = paradas.slice(0, 25);
          
          const origin = { lat: latSaida, lng: lngSaida };
          const destination = paradas.length > 25 
             ? waypointsChunk[waypointsChunk.length - 1] 
             : { lat: latChegada, lng: lngChegada };

          const legs = await getDirectionsETA(origin, destination, waypointsChunk);

          if (legs && legs.length > 0) {
            let dataBase = new Date();
            const horaInicioRaw = req.body.HoraSaida || e.HoraSaidaPrevista || '08:00';
            if (horaInicioRaw) {
              const [h, m] = horaInicioRaw.split(':');
              if (h && m) {
                dataBase.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
              }
            }
            
            const horaSaidaInicial = `${dataBase.getHours().toString().padStart(2,'0')}:${dataBase.getMinutes().toString().padStart(2,'0')}`;

            // Buscar configuração de tempo
            const configResult = await executeQuery(`
              SELECT l.TempoAtendimento, e.TempoAtendimentoPadrao 
              FROM startapp_magicroute..Lotes l
              INNER JOIN startapp_magicroute..Empresas e ON e.IDEmpresa = l.IDEmpresa
              WHERE l.IDEmpresa = ${Number(IDEmpresa)} AND l.IDLote = ${Number(IDLote)}
            `);
            
            let tempoAtendimentoMinutos = 5;
            if (configResult.length > 0) {
              if (configResult[0].TempoAtendimento !== null) {
                tempoAtendimentoMinutos = configResult[0].TempoAtendimento;
              } else if (configResult[0].TempoAtendimentoPadrao !== null) {
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

                  const p1 = parseHoraRaw(entOrd.HoraRecebimentoInicio1);
                  const pf1 = parseHoraRaw(entOrd.HoraRecebimentoFim1);
                  const p2 = parseHoraRaw(entOrd.HoraRecebimentoInicio2);
                  const pf2 = parseHoraRaw(entOrd.HoraRecebimentoFim2);

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
                      } else if (curMinOfDay > f1Min && curMinOfDay < i2Min) {
                        dataBase.setHours(p2.h, p2.m, 0, 0);
                      }
                    } else if (w1Def) {
                      const i1Min = p1.h * 60 + p1.m;
                      if (curMinOfDay < i1Min) {
                        dataBase.setHours(p1.h, p1.m, 0, 0);
                      }
                    } else if (w2Def) {
                      const i2Min = p2.h * 60 + p2.m;
                      if (curMinOfDay < i2Min) {
                        dataBase.setHours(p2.h, p2.m, 0, 0);
                      }
                    }
                  }
                }

                const dataFormatada = `${dataBase.getFullYear()}-${(dataBase.getMonth()+1).toString().padStart(2,'0')}-${dataBase.getDate().toString().padStart(2,'0')}`;
                const horaFormatada = `${dataBase.getHours().toString().padStart(2,'0')}:${dataBase.getMinutes().toString().padStart(2,'0')}`;
                const tempoFormatado = Math.floor(duracaoSegundos / 60) + ' min';

                await executeQuery(`
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
            const horaRetornoFinal = `${dataBase.getHours().toString().padStart(2,'0')}:${dataBase.getMinutes().toString().padStart(2,'0')}`;

            // Salvar Início e Fim no Lote
            await executeQuery(`
              UPDATE startapp_magicroute..Lotes 
              SET HoraSaidaPrevista = '${horaSaidaInicial}', HoraRetornoPrevista = '${horaRetornoFinal}'
              WHERE IDEmpresa = ${Number(IDEmpresa)} AND IDLote = ${Number(IDLote)}
            `);
          }
        }
      }
    }
  } catch (etaErr) {
    console.error('Erro ao calcular ETAs:', etaErr);
  }

  // Registrar Log de Roteirização/Reordenação
  try {
    const isOtimizacao = Number(OtimizarRota) !== 0;
    const acaoLog = isOtimizacao ? 'REORDENACAO_ROTA' : 'REORDENACAO_ROTA';
    const descLog = isOtimizacao 
      ? `Otimizou inteligentemente a rota do Lote #${IDLote}.` 
      : `Alterou manualmente a sequência de entregas do Lote #${IDLote}.`;

    await registrarLogInterno({
      idEmpresa: Number(IDEmpresa),
      idLote: Number(IDLote),
      usuario: req.body.UsuarioNome || 'Admin',
      tipoAcao: acaoLog,
      descricao: descLog
    });
  } catch (logErr) {
    console.error('Erro ao salvar log de roteirização:', logErr);
  }

  return res.json({ sucesso: true, mensagem: mensagemSucesso });
});

/**
 * POST /api/entregas/gravar-evento
 * Grava data/hora de evento (início/fim entrega)
 */
router.post('/gravar-evento', async (req: Request, res: Response) => {
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
      console.error('Erro ao gerar log automático em gravar-evento:', logErr);
    }

    res.json({ sucesso: true });
  } catch (err: any) {
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
router.get('/lotes', async (req: Request, res: Response) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;

  const codigoMotorista = sanitize(req.query.CodigoMotorista as string || '');
  if (!requireParam(codigoMotorista, 'CodigoMotorista', res)) return;

  const dataEntrega = sanitize(req.query.DataEntrega as string || '');
  if (!requireParam(dataEntrega, 'DataEntrega', res)) return;

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

  await execAndRespond(query, res);
});

/**
 * GET /api/entregas/pendentes
 * Busca entregas pendentes de um lote (App Rotas)
 */
router.get('/pendentes', async (req: Request, res: Response) => {
  const bd = sanitize(req.query.bd as string || '');
  if (!requireParam(bd, 'bd', res)) return;

  const idLote = sanitize(req.query.IdLote as string || '');
  if (!requireParam(idLote, 'IdLote', res)) return;

  const query = `SELECT * FROM ${bd}..Entregas
    WHERE IDLOTE = ${idLote} AND situacaoentrega = 'Pendente'
    ORDER BY sequenciaforcada, sequencia ASC`;

  await execAndRespond(query, res);
});

/**
 * POST /api/entregas/importar-lote
 * Importa uma lista de entregas em lote para um IDLote
 */
router.post('/importar-lote', async (req: Request, res: Response) => {
  console.log('[importar-lote] body recebido:', req.body);
  const { IdEmpresa, IDLote, Entregas, UsuarioNome } = req.body;
  if (!IdEmpresa || !IDLote || !Array.isArray(Entregas) || Entregas.length === 0) {
    return res.status(400).json({ sucesso: false, erro: 'Parâmetros inválidos ou lista de entregas vazia.' });
  }

  try {
    const pool = await getPool();
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
        
        const pedido = sanitize(String(entrega.NumeroPedido || ''));
        const nota = sanitize(String(entrega.NrNotaFiscal || ''));
        const cliente = sanitize(String(entrega.NomeCliente || ''));
        const endereco = sanitize(String(entrega.EnderecoEntrega || ''));
        const bairro = sanitize(String(entrega.Bairro || ''));
        const cidade = sanitize(String(entrega.Cidade || ''));
        const cep = sanitize(String(entrega.CEP || ''));
        const uf = sanitize(String(entrega.UFEntrega || 'SP'));
        const valor = Number(entrega.ValorRecebido || 0);
        const pagamento = sanitize(String(entrega.TipoPagamento || 'A Faturar'));
        const obs = sanitize(String(entrega.Observacoes || ''));
        
        let dataEntrega = sanitize(String(entrega.DataEntrega || hojeStr));
        if (dataEntrega.includes('-')) {
          const parts = dataEntrega.split('-');
          dataEntrega = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        const lat = entrega.LatitudeEntrega !== undefined && entrega.LatitudeEntrega !== '' ? `'${sanitize(String(entrega.LatitudeEntrega))}'` : 'NULL';
        const lng = entrega.LongitudeEntrega !== undefined && entrega.LongitudeEntrega !== '' ? `'${sanitize(String(entrega.LongitudeEntrega))}'` : 'NULL';

        const horaInicio1 = sanitize(String(entrega.HoraRecebimentoInicio1 || ''));
        const horaFim1 = sanitize(String(entrega.HoraRecebimentoFim1 || ''));
        const horaInicio2 = sanitize(String(entrega.HoraRecebimentoInicio2 || ''));
        const horaFim2 = sanitize(String(entrega.HoraRecebimentoFim2 || ''));

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
        await registrarLogInterno({
          idEmpresa: Number(IdEmpresa),
          idLote: Number(IDLote),
          usuario: sanitize(UsuarioNome || 'Admin'),
          tipoAcao: 'ALTERACAO_ADM',
          descricao: `Importou ${Entregas.length} entregas em lote a partir de planilha.`
        });
      } catch (logErr) {
        console.error('Erro ao salvar log de importação em lote:', logErr);
      }

      res.json({ sucesso: true, mensagem: `Importadas ${Entregas.length} entregas com sucesso.` });
    } catch (innerErr: any) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (err: any) {
    console.error('Erro ao importar entregas em lote:', err);
    res.status(500).json({ sucesso: false, erro: err.message });
  }
});

export default router;
