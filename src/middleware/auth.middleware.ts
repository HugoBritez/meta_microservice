import { NextFunction, Request, Response } from "express";
import { JwtPayload, JwtUtil } from "../utils/jwt.util";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = JwtUtil.extractTokenFromHeader(authHeader);

    if(!token) {
        res.status(401).json({ message: 'No se proporcionó un token de autenticación' });
        return;
    }
    try {
        const decoded = JwtUtil.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        if(error instanceof Error) {
            res.status(401).json({ message: error.message });
            return;
        }
        res.status(401).json({ message: 'Token inválido' });
        return;
    }
}