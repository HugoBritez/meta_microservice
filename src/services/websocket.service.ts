import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { WebSocketMessage, WhatsAppStatus } from '../types/whatsapp.interfaces';
import { JwtUtil, JwtPayload } from '../utils/jwt.util';

interface ConnectedClient {
  id: string;
  socket: Socket;
  subscribedChats: Set<string>;
  lastActivity: Date;
  isAuthenticated: boolean;
  user?: JwtPayload;
  clientId?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Configurar según tu dominio
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket Server inicializado');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔗 Cliente conectado: ${socket.id}`);

      // Registrar cliente SIN autenticar inicialmente
      this.clients.set(socket.id, {
        id: socket.id,
        socket,
        subscribedChats: new Set(),
        lastActivity: new Date(),
        isAuthenticated: false
      });

      // ===========================================
      // EVENTOS DE AUTENTICACIÓN
      // ===========================================
      
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });

      // ===========================================
      // EVENTOS PROTEGIDOS (requieren autenticación)
      // ===========================================

      socket.on('subscribe_chat', (chatId: string) => {
        if (this.isClientAuthenticated(socket.id)) {
          this.handleChatSubscription(socket, chatId);
        } else {
          socket.emit('error', { 
            message: 'Autenticación requerida para suscribirse a chats',
            code: 'AUTH_REQUIRED'
          });
        }
      });

      socket.on('unsubscribe_chat', (chatId: string) => {
        if (this.isClientAuthenticated(socket.id)) {
          this.handleChatUnsubscription(socket, chatId);
        } else {
          socket.emit('error', { 
            message: 'Autenticación requerida',
            code: 'AUTH_REQUIRED'
          });
        }
      });

      socket.on('get_chat_list', (options = {}) => {
        if (this.isClientAuthenticated(socket.id)) {
          this.handleGetChatList(socket, options);
        } else {
          socket.emit('error', { 
            message: 'Autenticación requerida para obtener lista de chats',
            code: 'AUTH_REQUIRED'
          });
        }
      });

      socket.on('get_chat_messages', (data) => {
        if (this.isClientAuthenticated(socket.id)) {
          this.handleGetChatMessages(socket, data);
        } else {
          socket.emit('error', { 
            message: 'Autenticación requerida para obtener mensajes',
            code: 'AUTH_REQUIRED'
          });
        }
      });

      socket.on('mark_chat_read', (chatId: string) => {
        if (this.isClientAuthenticated(socket.id)) {
          this.handleMarkChatRead(socket, chatId);
        } else {
          socket.emit('error', { 
            message: 'Autenticación requerida',
            code: 'AUTH_REQUIRED'
          });
        }
      });

      // ===========================================
      // EVENTOS DE DESCONEXIÓN
      // ===========================================

      socket.on('disconnect', (reason) => {
        console.log(`🔌 Cliente desconectado: ${socket.id} - Razón: ${reason}`);
        this.clients.delete(socket.id);
      });

      // Timeout de autenticación: si no se autentica en 30 segundos, desconectar
      setTimeout(() => {
        const client = this.clients.get(socket.id);
        if (client && !client.isAuthenticated) {
          console.log(`⏰ Timeout de autenticación para cliente: ${socket.id}`);
          socket.emit('error', { 
            message: 'Timeout de autenticación. Desconectando...',
            code: 'AUTH_TIMEOUT'
          });
          socket.disconnect();
        }
      }, 30000); // 30 segundos
    });

    // Limpiar clientes inactivos cada 5 minutos
    setInterval(() => {
      this.cleanupInactiveClients();
    }, 5 * 60 * 1000);
  }

  private handleAuthentication(socket: Socket, data: any): void {
    try {
      const { token, clientId } = data;
      
      console.log(`🔐 Intento de autenticación - Cliente: ${socket.id}, ClientId: ${clientId || 'sin clientId'}`);

      if (!token) {
        socket.emit('authentication_failed', {
          success: false,
          error: 'Token requerido',
          code: 'TOKEN_MISSING'
        });
        return;
      }

      // Verificar JWT
      const payload = JwtUtil.verifyToken(token);
      
      // Actualizar información del cliente
      const client = this.clients.get(socket.id);
      if (client) {
        client.isAuthenticated = true;
        client.user = payload;
        client.clientId = clientId;
        client.lastActivity = new Date();
        
        console.log(`✅ Cliente autenticado: ${socket.id}`);
        console.log(`   📧 Usuario: ${payload.userId}`);
        console.log(`   🏷️  Cliente ID: ${clientId || 'anónimo'}`);
        console.log(`   🕒 Expira: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'nunca'}`);
        
        socket.emit('authenticated', { 
          success: true, 
          clientId: socket.id,
          serverTime: new Date().toISOString(),
          userId: payload.userId,
        });
      }

    } catch (error) {
      console.error(`❌ Error de autenticación para ${socket.id}:`, error);
      
      let errorCode = 'AUTH_ERROR';
      let errorMessage = 'Error de autenticación';
      
      if (error instanceof Error) {
        if (error.message === 'Token expirado') {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Token expirado';
        } else if (error.message === 'Token inválido') {
          errorCode = 'TOKEN_INVALID';
          errorMessage = 'Token inválido';
        }
      }
      
      socket.emit('authentication_failed', {
        success: false,
        error: errorMessage,
        code: errorCode
      });
    }
  }

  /**
   * Verificar si un cliente está autenticado
   */
  private isClientAuthenticated(socketId: string): boolean {
    const client = this.clients.get(socketId);
    return client?.isAuthenticated || false;
  }

  /**
   * Obtener información del usuario autenticado
   */
  private getAuthenticatedUser(socketId: string): JwtPayload | null {
    const client = this.clients.get(socketId);
    return client?.isAuthenticated ? client.user || null : null;
  }

  private handleChatSubscription(socket: Socket, chatId: string): void {
    const client = this.clients.get(socket.id);
    if (client) {
      client.subscribedChats.add(chatId);
      socket.join(`chat:${chatId}`);
      console.log(`📱 Cliente ${socket.id} suscrito al chat: ${chatId}`);
      
      socket.emit('chat_subscribed', { chatId, success: true });
    }
  }

  private handleChatUnsubscription(socket: Socket, chatId: string): void {
    const client = this.clients.get(socket.id);
    if (client) {
      client.subscribedChats.delete(chatId);
      socket.leave(`chat:${chatId}`);
      console.log(`📱 Cliente ${socket.id} desuscrito del chat: ${chatId}`);
      
      socket.emit('chat_unsubscribed', { chatId, success: true });
    }
  }

  private async handleMarkChatRead(socket: Socket, chatId: string): Promise<void> {
    try {
      // Importar modelos
      const { Message } = await import('../models/Message');
      const { Chat } = await import('../models/Chat');

      // Marcar todos los mensajes no leídos del chat como "read"
      await Message.updateMany(
        { 
          chatId, 
          status: { $in: ['sent', 'delivered', 'received'] } // Mensajes que no están en "read" o "failed"
        },
        { 
          $set: { status: 'read' } 
        }
      );

      // Marcar el chat como leído (resetear contador de no leídos)
      const chat = await Chat.findOne({ chatId });
      if (chat) {
        await chat.markAsRead();
      }

      // Notificar al cliente que solicitó la acción
      socket.emit('chat_marked_read', { chatId, success: true });

      // Notificar a otros clientes suscritos al chat sobre la actualización
      await this.notifyChatUpdate(chatId, {
        unreadCount: 0,
        markedReadBy: socket.id,
        timestamp: new Date()
      });

      console.log(`✅ Chat marcado como leído: ${chatId} por cliente: ${socket.id}`);

    } catch (error) {
      console.error('Error marcando chat como leído:', error);
      socket.emit('error', { 
        action: 'mark_chat_read', 
        error: 'Error interno',
        chatId 
      });
    }
  }

  private async handleGetChatMessages(socket: Socket, data: { chatId: string, limit?: number, offset?: number }): Promise<void> {
    try {
      const { Message } = await import('../models/Message');
      
      const messages = await Message.find({ chatId: data.chatId })
        .sort({ timestamp: -1 })
        .limit(data.limit || 50)
        .skip(data.offset || 0);

      socket.emit('chat_messages', {
        chatId: data.chatId,
        messages: messages.reverse(), // Orden cronológico
        hasMore: messages.length === (data.limit || 50)
      });
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      socket.emit('error', { action: 'get_chat_messages', error: 'Error interno' });
    }
  }

  private async handleGetChatList(socket: Socket, data: { limit?: number, unreadOnly?: boolean }): Promise<void> {
    try {
      const { Chat } = await import('../models/Chat');
      
      let query: any = {};
      if (data.unreadOnly) {
        query.unreadCount = { $gt: 0 };
      }

      const chats = await Chat.find(query)
        .sort({ lastMessage: -1 })
        .limit(data.limit || 20);

      socket.emit('chat_list', {
        chats,
        total: chats.length
      });
    } catch (error) {
      console.error('Error obteniendo lista de chats:', error);
      socket.emit('error', { action: 'get_chat_list', error: 'Error interno' });
    }
  }

  private setupHeartbeat(socket: Socket): void {
    const interval = setInterval(() => {
      socket.emit('ping');
    }, 30000); // Ping cada 30 segundos

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  private updateClientActivity(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  private cleanupInactiveClients(): void {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutos

    for (const [clientId, client] of this.clients.entries()) {
      if (now.getTime() - client.lastActivity.getTime() > timeout) {
        console.log(`🧹 Limpiando cliente inactivo: ${clientId}`);
        client.socket.disconnect();
        this.clients.delete(clientId);
      }
    }
  }

  // Métodos públicos para notificar eventos
  async notifyNewMessage(chatId: string, message: any): Promise<void> {
    if (!this.io) return;

    const notification: WebSocketMessage = {
      type: 'new_message',
      chatId,
      data: message,
      timestamp: new Date()
    };

    // Enviar a todos los clientes suscritos al chat
    this.io.to(`chat:${chatId}`).emit('new_message', notification);
    
    // También enviar a todos los clientes para actualizar lista de chats
    this.io.emit('chat_updated', {
      chatId,
      lastMessage: message.timestamp,
      lastMessageContent: this.getMessagePreview(message),
      unreadIncrement: 1
    });

    console.log(`📤 Mensaje notificado por WebSocket: ${chatId}`);
  }

  // NUEVO MÉTODO: broadcastToChat genérico
  broadcastToChat(chatId: string, eventName: string, data: any): void {
    if (!this.io) return;

    // Enviar evento específico a todos los clientes suscritos al chat
    this.io.to(`chat:${chatId}`).emit(eventName, data);
    
    console.log(`📡 Evento '${eventName}' enviado al chat: ${chatId}`);
  }

  // NUEVO MÉTODO: broadcast general a todos los clientes
  broadcast(eventName: string, data: any): void {
    if (!this.io) return;

    this.io.emit(eventName, data);
    console.log(`📡 Evento '${eventName}' enviado a todos los clientes`);
  }

  async notifyMessageStatus(chatId: string, status: WhatsAppStatus): Promise<void> {
    if (!this.io) return;

    const notification: WebSocketMessage = {
      type: 'message_status',
      chatId,
      data: status,
      timestamp: new Date()
    };

    this.io.to(`chat:${chatId}`).emit('message_status', notification);
    console.log(`📊 Estado de mensaje notificado: ${status.id} -> ${status.status}`);
  }

  async notifyChatUpdate(chatId: string, updateData: any): Promise<void> {
    if (!this.io) return;

    const notification: WebSocketMessage = {
      type: 'chat_update',
      chatId,
      data: updateData,
      timestamp: new Date()
    };

    this.io.emit('chat_updated', notification);
  }

  private getMessagePreview(message: any): string {
    try {
      const content = message.content;
      switch (content.type) {
        case 'text':
          return content.text?.body || 'Mensaje de texto';
        case 'image':
          return '📷 Imagen';
        case 'audio':
          return '🎵 Audio';
        case 'document':
          return '📄 Documento';
        case 'video':
          return '🎥 Video';
        default:
          return 'Mensaje';
      }
    } catch {
      return 'Mensaje';
    }
  }

  // Obtener estadísticas de conexiones
  getStats(): any {
    return {
      connectedClients: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        subscribedChats: Array.from(client.subscribedChats),
        lastActivity: client.lastActivity
      }))
    };
  }
} 