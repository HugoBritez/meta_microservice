import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'https'; // Cambiar a https
import fs from 'fs';
import path from 'path';
import { config } from './config/config';
import { database } from './config/database';
import { WebSocketService } from './services/websocket.service';

// Importar rutas
import { healthRoutes } from './routes/health.routes';
import { metaApiRoutes } from './routes/meta_api.routes';
import { messagesRoutes } from './routes/meesages.routes';
import { logger } from './services/logger.service';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { tenantRoutes } from './routes/tenant.routes';

class App {
  public app: Application;
  private httpServer: any;
  private wsService: WebSocketService;

  constructor() {
    this.app = express();
    
    // Configurar HTTPS con tus certificados
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '../ssl/server.key')),
      cert: fs.readFileSync(path.join(__dirname, '../ssl/server.cer'))
    };
    
    this.httpServer = createServer(sslOptions, this.app);
    this.wsService = WebSocketService.getInstance();
    
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await database.connect();
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      process.exit(1);
    }
  }

  private initializeMiddlewares(): void {
    // Middlewares de seguridad
    this.app.use(helmet());
    this.app.use(cors());
    
    // Middleware de tenant - DEBE ir antes del logging
    this.app.use(tenantMiddleware);
    
    // Middleware de logging con información de tenant
    this.app.use(logger.getMorganMiddleware());
    
    // Middleware para parsear JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    // Rutas de salud
    this.app.use('/health', healthRoutes);
    this.app.use('/meta', metaApiRoutes);
    this.app.use('/messages', messagesRoutes);
    
    // Rutas de tenant (multitenant)
    this.app.use('/tenant', tenantRoutes);
    
    // Ruta por defecto
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'WhatsApp Microservice API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv
      });
    });
  }

  private initializeWebSocket(): void {
    this.wsService.initialize(this.httpServer);
    console.log('🔌 WebSocket Service inicializado');
  }

  private initializeErrorHandling(): void {
    // Middleware para manejar rutas no encontradas
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn(`Ruta no encontrada: ${req.originalUrl}`, req);
      res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        tenant: req.tenant?.name || 'Unknown'
      });
    });

    // Middleware para manejo global de errores
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error(`Error en ${req.method} ${req.originalUrl}: ${error.message}`, req);
      console.log('Next', next);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env['NODE_ENV'] === 'development' ? error.message : 'Algo salió mal',
        tenant: req.tenant?.name || 'Unknown'
      });
    });
  }

  // Método para obtener estadísticas (opcional)
  public getWebSocketStats() {
    return this.wsService.getStats();
  }

  public listen(): void {
    const port = config.port;
    this.httpServer.listen(port, () => {
      console.log(`🚀 Servidor HTTPS ejecutándose en puerto ${port}`);
      console.log(`🔒 HTTPS habilitado con certificados SSL`);
      console.log(`📡 WebSocket disponible en wss://localhost:${port}`);
    });
  }
}

export default App; 