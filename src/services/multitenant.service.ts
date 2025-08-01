import { mysqlDatabase } from "../config/mysql";
import { RowDataPacket } from "mysql2/promise";

interface TenantInfo extends RowDataPacket {
    conf_codigo: number;
    conf_access_token?: string;
    conf_verify_token?: string;
    conf_estado: number;
}

export class MultitenantService {
    private static instance: MultitenantService;
    private tenants: Map<string, TenantInfo> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
    private cacheTimestamps: Map<string, number> = new Map();

    static getInstance(): MultitenantService {
        if (!MultitenantService.instance) {
            MultitenantService.instance = new MultitenantService();
        }
        return MultitenantService.instance;
    }

    async getTenantConfig(databaseName: string): Promise<TenantInfo | null> {
        // Validar databaseName
        if (!databaseName || typeof databaseName !== 'string') {
            throw new Error('DatabaseName inválido');
        }

        // Verificar cache y TTL
        if (this.isCacheValid(databaseName)) {
            return this.tenants.get(databaseName)!;
        }

        try {
            const config = await mysqlDatabase.query<TenantInfo[]>(
                `SELECT conf_codigo, conf_access_token, conf_verify_token, conf_estado 
                 FROM ${this.sanitizeDatabaseName(databaseName)}.conf_configuracion 
                 WHERE conf_estado = 1 
                 LIMIT 1`
            );

            if (config.length === 0) {
                // Limpiar cache si no existe configuración
                this.clearCache(databaseName);
                return null;
            }

            const tenant = config[0];
            if (tenant) {
                this.updateCache(databaseName, tenant);
            }
            return tenant || null;

        } catch (error) {
            console.error(`Error obteniendo configuración del tenant ${databaseName}:`, error);
            throw new Error(`No se pudo obtener la configuración del tenant: ${databaseName}`);
        }
    }

    private isCacheValid(hostName: string): boolean {
        const timestamp = this.cacheTimestamps.get(hostName);
        if (!timestamp) return false;
        
        return (Date.now() - timestamp) < this.CACHE_TTL;
    }

    private updateCache(hostName: string, tenant: TenantInfo): void {
        this.tenants.set(hostName, tenant);
        this.cacheTimestamps.set(hostName, Date.now());
    }

    private clearCache(hostName: string): void {
        this.tenants.delete(hostName);
        this.cacheTimestamps.delete(hostName);
    }

    private sanitizeDatabaseName(dbName: string): string {
        // Validar que solo contenga caracteres seguros para nombres de base de datos
        if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
            throw new Error('Nombre de base de datos inválido');
        }
        
        return dbName;
    }

    // Método para limpiar cache manualmente
    clearAllCache(): void {
        this.tenants.clear();
        this.cacheTimestamps.clear();
    }

    // Método para obtener estadísticas del cache
    getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.tenants.size,
            entries: Array.from(this.tenants.keys())
        };
    }
}