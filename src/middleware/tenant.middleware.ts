import { NextFunction, Request, Response } from "express";

import { config } from "../config/config";

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
}


declare global {
    namespace Express {
        interface Request {
            tenant?: TenantInfo;
        }
    }
}


export const tenantMiddleware  =  (req: Request, _res: Response, next: NextFunction ) : void => {
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

        for (const [tenantId, tenantConfig] of Object.entries(config.tenants)){
            if(host.includes(tenantConfig.host)){
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
                  clientIp
                };
                break;
              }
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