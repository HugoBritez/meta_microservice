import { Router, Request, Response } from 'express';
import { MessageService } from '../services/messages.service';
import { WhatsAppSendService } from '../services/whatsapp-send.service';
import { WebSocketService } from '../services/websocket.service';

const router = Router();
const sendService = new WhatsAppSendService();
const wsService = WebSocketService.getInstance();

// Obtener mensajes (con filtros opcionales)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chatId, limit = '50', offset = '0', type } = req.query;
    
    const messages = await MessageService.getMessages({
      chatId: chatId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string
    });
    
    return res.json({
      success: true,
      data: messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener mensajes por chat específico
router.get('/chat/:chatId', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    const messages = await MessageService.getMessagesByChat(
      chatId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    return res.json({
      success: true,
      chatId,
      data: messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Error obteniendo mensajes del chat:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ========== NUEVOS ENDPOINTS PARA ENVÍO ==========

// Enviar mensaje de texto
router.post('/send/text', async (req: Request, res: Response) => {
  try {
    const { to, text, chatId } = req.body;

    // Validaciones
    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "to" y "text" son requeridos'
      });
    }

    // Validar formato del número de teléfono (opcional)
    if (!/^\d{10,15}$/.test(to.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Formato de número de teléfono inválido'
      });
    }

    console.log(`📤 Enviando mensaje de texto a ${to}: "${text}"`);

    // Enviar mensaje via WhatsApp API
    const result = await sendService.sendTextMessage({ to, text, chatId });

    if (result.success) {
      // Notificar via WebSocket a clientes conectados
      const finalChatId = chatId || `${to}_${sendService.getPhoneNumberId()}`;
      const notificationData = {
        type: 'message_sent',
        chatId: finalChatId,
        messageId: result.messageId,
        to,
        content: { text: { body: text } },
        timestamp: new Date().toISOString(),
        direction: 'outgoing'
      };

      wsService.broadcastToChat(finalChatId, 'message_sent', notificationData);

      return res.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensaje enviado exitosamente'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Error enviando mensaje'
      });
    }

  } catch (error) {
    console.error('❌ Error en endpoint de envío de texto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Enviar mensaje con media (imagen, documento, etc.)
router.post('/send/media', async (req: Request, res: Response) => {
  try {
    const { to, mediaType, mediaId, mediaUrl, caption, chatId } = req.body;

    // Validaciones
    if (!to || !mediaType) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "to" y "mediaType" son requeridos'
      });
    }

    if (!mediaId && !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere "mediaId" o "mediaUrl"'
      });
    }

    const validMediaTypes = ['image', 'document', 'audio', 'video'];
    if (!validMediaTypes.includes(mediaType)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de media inválido. Válidos: ${validMediaTypes.join(', ')}`
      });
    }

    console.log(`📤 Enviando mensaje de ${mediaType} a ${to}`);

    // Enviar mensaje via WhatsApp API
    const result = await sendService.sendMediaMessage({ 
      to, 
      mediaType, 
      mediaId, 
      mediaUrl, 
      caption, 
      chatId 
    });

    if (result.success) {
      // Notificar via WebSocket
      const finalChatId = chatId || `${to}_${sendService.getPhoneNumberId()}`;
      const notificationData = {
        type: 'message_sent',
        chatId: finalChatId,
        messageId: result.messageId,
        to,
        content: { 
          media: { 
            type: mediaType, 
            id: mediaId, 
            url: mediaUrl, 
            caption 
          } 
        },
        timestamp: new Date().toISOString(),
        direction: 'outgoing'
      };

      wsService.broadcastToChat(finalChatId, 'message_sent', notificationData);

      return res.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensaje con media enviado exitosamente'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Error enviando mensaje con media'
      });
    }

  } catch (error) {
    console.error('❌ Error en endpoint de envío de media:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export const messagesRoutes = router;