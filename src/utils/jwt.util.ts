import jwt from 'jsonwebtoken';

import { config } from '../config/config';

export interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

export class JwtUtil {
    private static readonly secretKey: string = config.jwt.secret;

    private static readonly expiresIn: string = config.jwt.expiresIn;

    static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
        return jwt.sign(
            payload,
            this.secretKey,
            {
                expiresIn: this.expiresIn,
                algorithm: 'HS256'
            } as jwt.SignOptions
        );
    }

    static verifyToken(token: string): JwtPayload {
        try {
            const decoded = jwt.verify(token, this.secretKey, { algorithms: ['HS256']}) as JwtPayload;
            return decoded;
        } catch (error) {
            if(error instanceof jwt.JsonWebTokenError) {
                throw new Error('Token inválido');
            }
            else if(error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expirado');
            }
            throw new Error('Token inválido');
        }
    }


    static extractTokenFromHeader(req: string | undefined): string | undefined {
        if (!req) return undefined;

        const parts = req.split(' ');
        if(parts.length !== 2 || parts[0] !== 'Bearer') return undefined;

        return parts[1];
    }


}