import { Socket } from 'socket.io';
import { config } from '../config/config';
import { TenantInfo } from '../middleware/tenant.middleware';

export class TenantUtil {
  /**
   * Detecta el tenant desde el handshake del WebSocket
   */
  static detectTenantFromSocket(socket: Socket): TenantInfo {
    try {
      // Obtener información del handshake
      const handshake = socket.handshake;
      const headers = handshake.headers;
      
      // Obtener información de origen
      const host = headers.host || headers['x-forwarded-host'] || 'unknown';
      const origin = headers.origin || headers.referer || 'unknown';
      const userAgent = headers['user-agent'] || 'unknown';
      const clientIp = socket.conn.remoteAddress || 
                       headers['x-forwarded-for'] || 
                       headers['x-real-ip'] || 
                       'unknown';

      console.log(`🔍 Detectando tenant para WebSocket - Host: ${host}, Origin: ${origin}`);

      // Tenant por defecto (desconocido)
      let tenantInfo: TenantInfo = {
        id: 'unknown',
        name: 'Unknown WebSocket Client',
        host: host.toString(),
        isKnown: false,
        isActive: false,
        originalHost: host.toString(),
        userAgent: userAgent.toString(),
        clientIp: clientIp.toString()
      };

      // Buscar tenant por host
      for (const [tenantId, tenantConfig] of Object.entries(config.tenants)) {
        const hostStr = host.toString();
        if (hostStr.includes(tenantConfig.host)) {
          tenantInfo = {
            id: tenantId,
            name: tenantConfig.name,
            host: tenantConfig.host,
            subdomain: tenantConfig.subdomain || '',
            isActive: tenantConfig.isActive,
            isKnown: true,
            originalHost: hostStr,
            userAgent: userAgent.toString(),
            clientIp: clientIp.toString()
          };
          console.log(`✅ Tenant detectado por host: ${tenantId} (${tenantConfig.name})`);
          break;
        }
      }

      // Si no se encontró por host, buscar por origin
      if (!tenantInfo.isKnown && origin !== 'unknown') {
        for (const [tenantId, tenantConfig] of Object.entries(config.tenants)) {
          const originStr = origin.toString();
          if (originStr.includes(tenantConfig.host)) {
            tenantInfo = {
              id: tenantId,
              name: tenantConfig.name,
              host: tenantConfig.host,
              subdomain: tenantConfig.subdomain || '',
              isActive: tenantConfig.isActive,
              isKnown: true,
              originalHost: host.toString(),
              userAgent: userAgent.toString(),
              clientIp: clientIp.toString()
            };
            console.log(`✅ Tenant detectado por origin: ${tenantId} (${tenantConfig.name})`);
            break;
          }
        }
      }

      // Log del resultado
      if (!tenantInfo.isKnown) {
        console.log(`❓ Tenant desconocido - Host: ${host}, Origin: ${origin}`);
      }

      return tenantInfo;

    } catch (error) {
      console.error('Error detectando tenant para WebSocket:', error);
      
      // Retornar tenant de error
      return {
        id: 'error',
        name: 'Error Tenant',
        host: 'unknown',
        isKnown: false,
        isActive: false,
        originalHost: 'unknown',
        userAgent: 'unknown',
        clientIp: 'unknown'
      };
    }
  }

  /**
   * Obtiene el emoji de estado del tenant
   */
  static getTenantStatusEmoji(tenant: TenantInfo): string {
    if (!tenant.isKnown) return '❓';
    if (!tenant.isActive) return '🟡';
    return '🟢';
  }

  /**
   * Formatea información de tenant para logging
   */
  static formatTenantForLog(tenant: TenantInfo): string {
    const emoji = this.getTenantStatusEmoji(tenant);
    return `${emoji} [${tenant.id}] "${tenant.name}"`;
  }
}