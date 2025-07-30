import { Router, Request, Response } from 'express';
import { config } from '../config/config';
import { logger } from '../services/logger.service';
import { WebSocketService } from '../services/websocket.service';

const router = Router();

// Endpoint para obtener información del tenant actual
router.get('/info', (req: Request, res: Response) => {
  logger.info('Consulta de información de tenant', req);
  
  res.json({
    tenant: req.tenant,
    availableTenants: Object.keys(config.tenants),
    requestHeaders: {
      host: req.get('host'),
      origin: req.get('origin'),
      userAgent: req.get('user-agent')
    }
  });
});

// Endpoint para listar todos los tenants configurados
router.get('/list', (req: Request, res: Response) => {
  logger.info('Consulta de lista de tenants', req);
  
  res.json({
    tenants: config.tenants,
    currentTenant: req.tenant
  });
});

// ✨ Endpoints específicos para WebSocket multitenant

// Estadísticas generales de WebSocket por tenant
router.get('/websocket/stats', (req: Request, res: Response) => {
  logger.info('Consulta de estadísticas WebSocket', req);
  
  const wsService = WebSocketService.getInstance();
  const stats = wsService.getStats();
  const connectedTenants = wsService.getConnectedTenants();
  
  res.json({
    ...stats,
    connectedTenants,
    requestedBy: req.tenant?.name || 'Unknown'
  });
});

// Estadísticas específicas de un tenant
router.get('/websocket/stats/:tenantId', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  logger.info(`Consulta de estadísticas WebSocket para tenant: ${tenantId}`, req);
  
  const wsService = WebSocketService.getInstance();
  const tenantStats = wsService.getTenantStats(tenantId);
  
  res.json({
    ...tenantStats,
    requestedBy: req.tenant?.name || 'Unknown'
  });
});

// Enviar evento a todos los clientes de un tenant específico
router.post('/websocket/emit/:tenantId', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { eventName, data } = req.body;
  
  if (!eventName) {
    return res.status(400).json({
      error: 'eventName es requerido',
      tenant: req.tenant?.name || 'Unknown'
    });
  }
  
  logger.info(`Enviando evento WebSocket '${eventName}' a tenant: ${tenantId}`, req);
  
  const wsService = WebSocketService.getInstance();
  wsService.emitToTenant(tenantId, eventName, data);
  
  const tenantClients = wsService.getClientsByTenant(tenantId);
  
  res.json({
    success: true,
    eventName,
    targetTenant: tenantId,
    clientsReached: tenantClients.length,
    data,
    sentBy: req.tenant?.name || 'Unknown'
  });
});

// Desconectar todos los clientes de un tenant
router.post('/websocket/disconnect/:tenantId', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { reason } = req.body;
  
  logger.warn(`Desconectando clientes WebSocket del tenant: ${tenantId}`, req);
  
  const wsService = WebSocketService.getInstance();
  const tenantClients = wsService.getClientsByTenant(tenantId);
  const clientCount = tenantClients.length;
  
  wsService.disconnectTenant(tenantId, reason || 'Disconnected by admin');
  
  res.json({
    success: true,
    disconnectedClients: clientCount,
    tenant: tenantId,
    reason: reason || 'Disconnected by admin',
    disconnectedBy: req.tenant?.name || 'Unknown'
  });
});

// Listar clientes conectados por tenant
router.get('/websocket/clients', (req: Request, res: Response) => {
  logger.info('Consulta de clientes WebSocket por tenant', req);
  
  const wsService = WebSocketService.getInstance();
  const connectedTenants = wsService.getConnectedTenants();
  
  const clientsByTenant = connectedTenants.map(tenant => ({
    ...tenant,
    clients: wsService.getClientsByTenant(tenant.id).map(client => ({
      id: client.id,
      isAuthenticated: client.isAuthenticated,
      subscribedChats: Array.from(client.subscribedChats),
      lastActivity: client.lastActivity,
      clientId: client.clientId,
      userId: client.user?.userId
    }))
  }));
  
  res.json({
    tenants: clientsByTenant,
    totalClients: clientsByTenant.reduce((sum, tenant) => sum + tenant.clientCount, 0),
    requestedBy: req.tenant?.name || 'Unknown'
  });
});

export { router as tenantRoutes };