import jwt from 'jsonwebtoken';

import { config } from '../config/config';

export interface JwtPayload {
    // Campos del token que van a recibir
    op_codigo?: string;
    op_nombre?: string;
    op_sucursal?: string;
    or_rol?: string;
    
    // Campos estándar JWT
    iat?: number;
    exp?: number;
    
    // Mantener userId por compatibilidad (si algún día lo necesitan)
    userId?: string;
}

export class JwtUtil {
    private static readonly secretKey: string = config.jwt.secret;

    private static readonly issuer: string = config.jwt.issuer || 'SofmarAPI';

    private static readonly audience: string = config.jwt.audience || 'WebStock';

    private static readonly expiresIn: string = config.jwt.expiresIn;

    static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
        return jwt.sign(
            payload,
            this.secretKey,
            {
                expiresIn: this.expiresIn,
                algorithm: 'HS256',
                issuer: this.issuer,
                audience: this.audience
            } as jwt.SignOptions
        );
    }

    
    static verifyToken(token: string): JwtPayload {
        console.log('[JWT] Verificando token...');
        console.log('[JWT] Token recibido (primeros 50 chars):', token.substring(0, 50) + '...');
        
        // Limpiar el token si viene con "Bearer "
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        console.log('[JWT] Token limpio (primeros 50 chars):', cleanToken.substring(0, 50) + '...');
        
        console.log('[JWT] Configuración utilizada:');
        console.log('[JWT]   - Issuer:', this.issuer);
        console.log('[JWT]   - Audience:', this.audience);
        console.log('[JWT]   - Secret (primeros 10 chars):', this.secretKey.substring(0, 10) + '...');
        
        try {
            // Primero decodificar sin verificar para ver el contenido
            const unverified = jwt.decode(cleanToken, { complete: true });
            console.log('[JWT] Token decodificado (sin verificar):');
            console.log('[JWT]   - Header:', JSON.stringify(unverified?.header, null, 2));
            console.log('[JWT]   - Payload:', JSON.stringify(unverified?.payload, null, 2));
            
            // Ahora verificar con las opciones
            const decoded = jwt.verify(cleanToken, this.secretKey, {
                issuer: this.issuer,
                audience: this.audience
            }) as JwtPayload;
            
            console.log('[JWT] ✅ Token verificado exitosamente');
            console.log('[JWT] Payload verificado:', JSON.stringify(decoded, null, 2));
            
            return decoded;
        } catch (error) {
            console.log('[JWT] ❌ Error verificando token:', error);
            
            if (error instanceof jwt.JsonWebTokenError) {
                console.log('[JWT] Tipo de error: JsonWebTokenError');
                console.log('[JWT] Mensaje:', error.message);
                throw new Error('Token inválido: ' + error.message);
            }
            else if (error instanceof jwt.TokenExpiredError) {
                console.log('[JWT] Tipo de error: TokenExpiredError');
                console.log('[JWT] Fecha de expiración:', error.expiredAt);
                throw new Error('Token expirado: ' + error.message);
            }
            else if (error instanceof jwt.NotBeforeError) {
                console.log('[JWT] Tipo de error: NotBeforeError');
                throw new Error('Token no válido aún: ' + error.message);
            }
            
            console.log('[JWT] Error desconocido:', error);
            throw new Error('Token inválido: ' + (error as Error).message);
        }
    }


    static extractTokenFromHeader(req: string | undefined): string | undefined {
        console.log('[JWT] Extrayendo token del header...');
        console.log('[JWT] Authorization header:', req);
        
        if (!req) {
            console.log('[JWT] ❌ No hay header de autorización');
            return undefined;
        }

        const parts = req.split(' ');
        console.log('[JWT] Partes del header:', parts);
        
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            console.log('[JWT] ❌ Formato de header inválido. Esperado: "Bearer <token>"');
            return undefined;
        }

        const token = parts[1];
        console.log('[JWT] ✅ Token extraído exitosamente (longitud:', token?.length, 'chars)');
        return token;
    }


}