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
        try {
            const decoded = jwt.verify(token, this.secretKey, {
                issuer: this.issuer,
                audience: this.audience
            }) as JwtPayload;
            return decoded;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Token inválido');
            }
            else if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expirado');
            }
            throw new Error('Token inválido');
        }
    }


    static extractTokenFromHeader(req: string | undefined): string | undefined {
        if (!req) return undefined;

        const parts = req.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') return undefined;

        return parts[1];
    }


}