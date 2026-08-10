declare const router: import("express-serve-static-core").Router;
/**
 * Função utilitária para registrar log no banco do SQL Server.
 * Pode ser chamada internamente ou via API.
 */
export declare function registrarLogInterno(params: {
    idEmpresa: number;
    idLote: number | null;
    usuario: string;
    tipoAcao: string;
    descricao: string;
}): Promise<void>;
export default router;
//# sourceMappingURL=logs.routes.d.ts.map