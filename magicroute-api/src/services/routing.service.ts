/**
 * routing.service.ts
 * 
 * Serviço de roteirização inteligente com suporte a múltiplas janelas de tempo.
 * Utiliza fórmula de Haversine para distâncias precisas e otimização multi-start 2-Opt.
 */

// ─── Tipos ───────────────────────────────────────────────────────

export interface EntregaParaRoteirizar {
  NrNotaFiscal: string;
  NumeroPedido: string;
  LatitudeEntrega: string;
  LongitudeEntrega: string;
  DataEntrega: string;          // DD/MM/YYYY
  DataEntregaExigida: string;   // DD/MM/YYYY
  HoraEntregaExigida: string;   // HH:MM
  HoraRecebimentoInicio1: string; // HH:MM
  HoraRecebimentoFim1: string;    // HH:MM
  HoraRecebimentoInicio2: string; // HH:MM
  HoraRecebimentoFim2: string;    // HH:MM
  StatusEntrega?: string;
  lat: number;
  lng: number;
}

export interface EntregaProcessada extends EntregaParaRoteirizar {
  inicio1Min: number | null;
  fim1Min: number | null;
  inicio2Min: number | null;
  fim2Min: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Converte string de hora (ex: "HH:MM", "HH", "H", "HHMM") para minutos desde meia-noite.
 */
export function parseHora(horaStr: string | null | undefined): number | null {
  if (!horaStr || typeof horaStr !== 'string') return null;
  const trimmed = horaStr.trim();
  if (trimmed === '') return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  // Se não contém dois pontos, limpa caracteres não numéricos
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 1 || digits.length === 2) {
    const h = parseInt(digits, 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h * 60; // assume minutos = 0
  } else if (digits.length === 3 || digits.length === 4) {
    const h = parseInt(digits.substring(0, digits.length - 2), 10);
    const m = parseInt(digits.substring(digits.length - 2), 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }

  return null;
}

/**
 * Retorna o objeto { h, m } decodificado de uma string de hora.
 */
export function parseHoraRaw(horaStr: string | null | undefined): { h: number, m: number } | null {
  const min = parseHora(horaStr);
  if (min === null) return null;
  return {
    h: Math.floor(min / 60),
    m: min % 60
  };
}

/**
 * Calcula a distância real em quilômetros entre dois pontos geográficos 
 * utilizando a Fórmula de Haversine (curvatura da Terra).
 */
export function calcularDistancia(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Estimativa de tempo de viagem em minutos baseada na distância real em km.
 * Considera coeficiente de desvio urbano (circuity factor) de 1.3 e velocidade média de 35 km/h.
 */
export function estimarTempoViagemMinutos(distanciaKm: number): number {
  const circuityFactor = 1.3; 
  const velocidadeMediaKmH = 35;
  return ((distanciaKm * circuityFactor) / velocidadeMediaKmH) * 60;
}

// ─── Avaliação de Rota e Cronograma ─────────────────────────────

interface ResultadoCronograma {
  custoTotal: number;
  esperaTotal: number;
  atrasoTotal: number;
  distanciaTotal: number;
}

/**
 * Simula a rota inteira calculando os horários de chegada, saída,
 * tempos de espera caso o motorista chegue adiantado, e atrasos caso chegue atrasado.
 * Também adiciona o trecho de retorno ao depósito de saída (closed-loop).
 */
export function calcularCronograma(
  rota: EntregaProcessada[],
  horaSaidaMinutos: number,
  tempoAtendimentoMinutos: number,
  origemLat: number,
  origemLng: number
): ResultadoCronograma {
  let tempoAtual = horaSaidaMinutos;
  let pontoAtual = { lat: origemLat, lng: origemLng };
  
  let esperaTotal = 0;
  let atrasoTotal = 0;
  let distanciaTotal = 0;

  for (const entrega of rota) {
    const distKm = calcularDistancia(pontoAtual, entrega);
    distanciaTotal += distKm;

    const tempoViagem = estimarTempoViagemMinutos(distKm);
    tempoAtual += tempoViagem;

    let espera = 0;
    let atraso = 0;

    // Verificar janelas de recebimento
    const hasW1 = entrega.inicio1Min !== null && entrega.fim1Min !== null;
    const hasW2 = entrega.inicio2Min !== null && entrega.fim2Min !== null;

    if (hasW1 && hasW2) {
      const i1 = entrega.inicio1Min!;
      const f1 = entrega.fim1Min!;
      const i2 = entrega.inicio2Min!;
      const f2 = entrega.fim2Min!;

      if (tempoAtual < i1) {
        espera = i1 - tempoAtual;
        tempoAtual = i1;
      } else if (tempoAtual <= f1) {
        espera = 0;
        atraso = 0;
      } else if (tempoAtual < i2) {
        espera = i2 - tempoAtual;
        tempoAtual = i2;
      } else if (tempoAtual <= f2) {
        espera = 0;
        atraso = 0;
      } else {
        atraso = tempoAtual - f2;
      }
    } else if (hasW1) {
      const i1 = entrega.inicio1Min!;
      const f1 = entrega.fim1Min!;

      if (tempoAtual < i1) {
        espera = i1 - tempoAtual;
        tempoAtual = i1;
      } else if (tempoAtual <= f1) {
        espera = 0;
        atraso = 0;
      } else {
        atraso = tempoAtual - f1;
      }
    } else if (hasW2) {
      const i2 = entrega.inicio2Min!;
      const f2 = entrega.fim2Min!;

      if (tempoAtual < i2) {
        espera = i2 - tempoAtual;
        tempoAtual = i2;
      } else if (tempoAtual <= f2) {
        espera = 0;
        atraso = 0;
      } else {
        atraso = tempoAtual - f2;
      }
    } else if (entrega.HoraEntregaExigida) {
      // Fallback para exigida antiga
      const exigidaMin = parseHora(entrega.HoraEntregaExigida);
      if (exigidaMin !== null) {
        if (tempoAtual > exigidaMin + 15) {
          atraso = tempoAtual - exigidaMin;
        }
      }
    }

    esperaTotal += espera;
    atrasoTotal += atraso;

    // Tempo gasto realizando a entrega
    tempoAtual += tempoAtendimentoMinutos;
    pontoAtual = { lat: entrega.lat, lng: entrega.lng };
  }

  // Adicionar o trecho de retorno ao depósito de origem
  const distRetornoKm = calcularDistancia(pontoAtual, { lat: origemLat, lng: origemLng });
  distanciaTotal += distRetornoKm;
  const tempoRetorno = estimarTempoViagemMinutos(distRetornoKm);
  tempoAtual += tempoRetorno;

  // Custo = Distância em Km * 1.0 + Espera * 0.3 + Atraso * 25.0
  const custoTotal = (distanciaTotal * 1.0) + (esperaTotal * 0.3) + (atrasoTotal * 25.0);

  return {
    custoTotal,
    esperaTotal,
    atrasoTotal,
    distanciaTotal
  };
}

// ─── Otimizador Local 2-Opt ─────────────────────────────────────

function otimizar2Opt(
  rotaInicial: EntregaProcessada[],
  horaSaidaMinutos: number,
  tempoAtendimentoMinutos: number,
  origemLat: number,
  origemLng: number
): EntregaProcessada[] {
  let melhorRota = [...rotaInicial];
  let melhorCusto = calcularCronograma(melhorRota, horaSaidaMinutos, tempoAtendimentoMinutos, origemLat, origemLng).custoTotal;
  
  let melhorou = true;
  let iteracoes = 0;
  const MAX_ITERACOES = 500;

  while (melhorou && iteracoes < MAX_ITERACOES) {
    melhorou = false;
    iteracoes++;

    for (let i = 0; i < melhorRota.length - 1; i++) {
      for (let j = i + 1; j < melhorRota.length; j++) {
        const rotaCandidata = inverterTrecho(melhorRota, i, j);
        const custoCandidato = calcularCronograma(rotaCandidata, horaSaidaMinutos, tempoAtendimentoMinutos, origemLat, origemLng).custoTotal;

        if (custoCandidato < melhorCusto) {
          melhorRota = rotaCandidata;
          melhorCusto = custoCandidato;
          melhorou = true;
          break;
        }
      }
      if (melhorou) break;
    }
  }

  return melhorRota;
}

function inverterTrecho(rota: EntregaProcessada[], i: number, j: number): EntregaProcessada[] {
  const novaRota = [...rota];
  let esquerda = i;
  let direita = j;
  while (esquerda < direita) {
    const temp = novaRota[esquerda];
    novaRota[esquerda] = novaRota[direita];
    novaRota[direita] = temp;
    esquerda++;
    direita--;
  }
  return novaRota;
}

// Auxiliar para permutações aleatórias
function shuffle(array: EntregaProcessada[]): EntregaProcessada[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// ─── Algoritmo Principal ────────────────────────────────────────

export function ordenarPorJanelasDeTempo(
  entregas: EntregaParaRoteirizar[],
  horaSaida: string,
  tempoAtendimento: number,
  origemLat: number,
  origemLng: number
): EntregaProcessada[] {
  const horaSaidaMinutos = parseHora(horaSaida) ?? 480; 

  const processadas: EntregaProcessada[] = entregas.map(e => ({
    ...e,
    inicio1Min: parseHora(e.HoraRecebimentoInicio1),
    fim1Min: parseHora(e.HoraRecebimentoFim1),
    inicio2Min: parseHora(e.HoraRecebimentoInicio2),
    fim2Min: parseHora(e.HoraRecebimentoFim2),
  }));

  if (processadas.length <= 1) {
    return processadas;
  }

  console.log(`[ROTEIRIZAÇÃO JANELA DUPLA] Iniciando otimização com Haversine e Multi-Start para ${processadas.length} entregas.`);

  // 1. Gerar Candidatos de Partida Diferentes (Multi-Start GRASP)
  const candidatos: EntregaProcessada[][] = [];

  // Candidato A: Sequenciamento Cronológico de Janelas
  const comJanela = processadas.filter(e => e.inicio1Min !== null || e.inicio2Min !== null);
  const semJanela = processadas.filter(e => e.inicio1Min === null && e.inicio2Min === null);
  comJanela.sort((a, b) => {
    const valA = a.inicio1Min ?? a.inicio2Min ?? 0;
    const valB = b.inicio1Min ?? b.inicio2Min ?? 0;
    return valA - valB;
  });
  candidatos.push([...comJanela, ...semJanela]);

  // Candidato B: Vizinho Mais Próximo Puro (Nearest Neighbor Espacial)
  const iniNN: EntregaProcessada[] = [];
  const naoVisitados = [...processadas];
  let atual = { lat: origemLat, lng: origemLng };
  while (naoVisitados.length > 0) {
    naoVisitados.sort((a, b) => calcularDistancia(atual, a) - calcularDistancia(atual, b));
    const prox = naoVisitados.shift()!;
    iniNN.push(prox);
    atual = { lat: prox.lat, lng: prox.lng };
  }
  candidatos.push(iniNN);

  // Candidato C, D, E: Embaralhamentos Aleatórios das janelas + flexíveis
  candidatos.push(shuffle(processadas));
  candidatos.push(shuffle(processadas));
  candidatos.push(shuffle(processadas));

  // 2. Executar 2-Opt em cada candidato e escolher a melhor solução global
  let melhorRota: EntregaProcessada[] = [];
  let menorCusto = Infinity;

  for (let idx = 0; idx < candidatos.length; idx++) {
    const otimizada = otimizar2Opt(candidatos[idx], horaSaidaMinutos, tempoAtendimento, origemLat, origemLng);
    const cronograma = calcularCronograma(otimizada, horaSaidaMinutos, tempoAtendimento, origemLat, origemLng);
    
    if (cronograma.custoTotal < menorCusto) {
      menorCusto = cronograma.custoTotal;
      melhorRota = otimizada;
    }
  }

  console.log(`[ROTEIRIZAÇÃO JANELA DUPLA] Rota final otimizada (Custo Final: ${menorCusto.toFixed(1)}):`);
  melhorRota.forEach((e, idx) => {
    const descJanelas = (e.inicio1Min !== null || e.inicio2Min !== null)
      ? `[${e.HoraRecebimentoInicio1 || 'vazio'}-${e.HoraRecebimentoFim1 || 'vazio'}${e.HoraRecebimentoInicio2 ? ` | ${e.HoraRecebimentoInicio2}-${e.HoraRecebimentoFim2}` : ''}]`
      : '[Flexível]';
    console.log(`  ${idx + 1}. NF: ${e.NrNotaFiscal || e.NumeroPedido} - Janelas: ${descJanelas}`);
  });

  return melhorRota;
}
