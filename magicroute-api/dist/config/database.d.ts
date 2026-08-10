import sql from 'mssql';
export declare function getPool(): Promise<sql.ConnectionPool>;
export declare function executeQuery<T = any>(query: string): Promise<T[]>;
export declare function executeQueryWithParams(query: string, params: Record<string, {
    type: sql.ISqlTypeFactoryWithNoParams;
    value: any;
}>): Promise<any[]>;
export { sql };
//# sourceMappingURL=database.d.ts.map