import { Router, Response, Request } from 'express';

const router = Router();

// Ruta de salud básica
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// Ruta de salud detallada
router.get('/detailed', (_req: Request, res: Response) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform,
    pid: process.pid
  };

  res.json(healthInfo);
});

export const healthRoutes = router; 