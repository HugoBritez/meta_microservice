import { NextFunction, Request, Response } from "express";
import { config } from "../config/config";
import { MultitenantService } from "../services/multitenant.service";

export interface TenantInfo {
    id: string;
    name: string;
    host: string;
    subdomain?: string;
    isActive: boolean;
    isKnown: boolean;
    originalHost: string;
    userAgent?: string;
    clientIp?: string;
    // ⭐ NUEVO: Configuración de tokens
    accessToken?: string;
    verifyToken?: string;
    // ⭐ NUEVO: Nombre de la base de datos
    databaseName?: string;
}

declare global {
    namespace Express {
        interface Request {
            tenant?: TenantInfo;
        }
    }
}

export const tenantMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const host = req.get('host') || req.get('x-forwarded-host') || 'unknown';
        const origin = req.get('origin') || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const clientIp = req.ip || req.socket.remoteAddress || req.get('x-forwarded-for') || 'unknown';

        let tenantInfo: TenantInfo = {
            id: 'unknown',
            name: 'unknown',
            host: host,
            isKnown: false,
            originalHost: host,
            userAgent: userAgent,
            clientIp: clientIp,
            isActive: false,
        }

        // Buscar tenant en configuración estática
        for (const [tenantId, tenantConfig] of Object.entries(config.tenants)) {
            if (host.includes(tenantConfig.host)) {
                tenantInfo = {
                    id: tenantId,
                    name: tenantConfig.name,
                    host: tenantConfig.host,
                    subdomain: tenantConfig.subdomain || '',
                    isActive: tenantConfig.isActive,
                    isKnown: true,
                    originalHost: host,
                    userAgent: userAgent,
                    clientIp: clientIp,
                    // ⭐ NUEVO: Usar databaseName específico o fallback al tenantId
                    databaseName: tenantConfig.databaseName || tenantId,
                }
                break;
            }
        }

        if (!tenantInfo.isKnown && origin) {
            for (const [tenantId, tenantConfig] of Object.entries(config.tenants)) {
                if (origin.includes(tenantConfig.host)) {
                    tenantInfo = {
                        id: tenantId,
                        name: tenantConfig.name,
                        host: tenantConfig.host,
                        subdomain: tenantConfig.subdomain || '',
                        isActive: tenantConfig.isActive,
                        isKnown: true,
                        originalHost: host,
                        userAgent,
                        clientIp,
                        databaseName: tenantConfig.databaseName || tenantId,
                    };
                    break;
                }
            }
        }

        // ⭐ NUEVO: Obtener configuración dinámica usando databaseName
        if (tenantInfo.isKnown && tenantInfo.isActive && tenantInfo.databaseName) {
            try {
                const multitenantService = MultitenantService.getInstance();
                const dbConfig = await multitenantService.getTenantConfig(tenantInfo.databaseName);
                
                if (dbConfig) {
                    tenantInfo.accessToken = dbConfig.conf_access_token || '';
                    tenantInfo.verifyToken = dbConfig.conf_verify_token || '';
                    console.log(`✅ Configuración de tenant cargada: ${tenantInfo.id} (DB: ${tenantInfo.databaseName})`);
                } else {
                    console.warn(`⚠️ No se encontró configuración en DB para tenant: ${tenantInfo.id} (DB: ${tenantInfo.databaseName})`);
                }
            } catch (error) {
                console.error(`❌ Error cargando configuración de tenant ${tenantInfo.id} (DB: ${tenantInfo.databaseName}):`, error);
            }
        }

        req.tenant = tenantInfo;
        next();
    } catch (error) {
        console.error('Error en el middleware de tenant:', error);
        req.tenant = {
            id: 'error',
            name: 'Error Tenant',
            host: 'unknown',
            isActive: false,
            isKnown: false,
            originalHost: req.get('host') || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            clientIp: req.ip || req.socket.remoteAddress || req.get('x-forwarded-for') || 'unknown'
        };
        next();
    }
}