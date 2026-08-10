/**
 * routing.service.ts
 *
 * Serviço de roteirização inteligente com suporte a múltiplas janelas de tempo.
 * Utiliza fórmula de Haversine para distâncias precisas e otimização multi-start 2-Opt.
 */
export interface EntregaParaRoteirizar {
    NrNotaFiscal: string;
    NumeroPedido: string;
    SequenciaOriginal?: number;
    LatitudeEntrega: string;
    LongitudeEntrega: string;
    DataEntrega: string;
    DataEntregaExigida: string;
    HoraEntregaExigida: string;
    HoraRecebimentoInicio1: string;
    HoraRecebimentoFim1: string;
    HoraRecebimentoInicio2: string;
    HoraRecebimentoFim2: string;
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
/**
 * Converte string de hora (ex: "HH:MM", "HH", "H", "HHMM") para minutos desde meia-noite.
 */
export declare function parseHora(horaStr: string | null | undefined): number | null;
/**
 * Retorna o objeto { h, m } decodificado de uma string de hora.
 */
export declare function parseHoraRaw(horaStr: string | null | undefined): {
    h: number;
    m: number;
} | null;
/**
 * Calcula a distância real em quilômetros entre dois pontos geográficos
 * utilizando a Fórmula de Haversine (curvatura da Terra).
 */
export declare function calcularDistancia(p1: {
    lat: number;
    lng: number;
}, p2: {
    lat: number;
    lng: number;
}): number;
/**
 * Estimativa de tempo de viagem em minutos baseada na distância real em km.
 * Considera coeficiente de desvio urbano (circuity factor) de 1.3 e velocidade média de 35 km/h.
 */
export declare function estimarTempoViagemMinutos(distanciaKm: number): number;
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
export declare function calcularCronograma(rota: EntregaProcessada[], horaSaidaMinutos: number, tempoAtendimentoMinutos: number, origemLat: number, origemLng: number): ResultadoCronograma;
export declare function ordenarPorJanelasDeTempo(entregas: EntregaParaRoteirizar[], horaSaida: string, tempoAtendimento: number, origemLat: number, origemLng: number): EntregaProcessada[];
export {};
//# sourceMappingURL=routing.service.d.ts.map