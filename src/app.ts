import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { config } from './config/config';
import { database } from './config/database';
import { WebSocketService } from './services/websocket.service';

// Importar rutas
import { healthRoutes } from './routes/health.routes';
import { metaApiRoutes } from './routes/meta_api.routes';
import { messagesRoutes } from './routes/meesages.routes';

class App {
  public app: Application;
  private httpServer: any;
  private wsService: WebSocketService;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
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
    // Middleware de logging - formato minimalista personalizado
    this.app.use(morgan(':method :url :status - :response-time ms'));
    // Middleware para parsear JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    // Rutas de salud
    this.app.use('/health', healthRoutes);
    this.app.use('/meta', metaApiRoutes);
    this.app.use('/messages', messagesRoutes);
    
    // Ruta por defecto
    this.app.get('/', ( res: Response) => {
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
      res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl
      });
    });

    // Middleware para manejo global de errores
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(`ERROR [${req.method}] ${req.originalUrl} - ${error.message}`);
       console.log('Next', next)
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env['NODE_ENV'] === 'development' ? error.message : 'Algo salió mal'
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
      console.log(`🚀 Servidor HTTP corriendo en puerto ${port}`);
      console.log(`🔌 WebSocket Server disponible en ws://localhost:${port}`);
      console.log(`📱 WhatsApp Microservice iniciado`);
    });
  }
}

export default App; 