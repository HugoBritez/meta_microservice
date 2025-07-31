import { WhatsAppWebhook, WhatsAppMessage, WhatsAppStatus } from '../types/whatsapp.interfaces';
import { Message } from '../models/Message';
import { Chat } from '../models/Chat';
import { WebSocketService } from './websocket.service';
import { mediaService } from './media.service';
import { config } from '../config/config';

export class WhatsAppWebhookService {
  private wsService: WebSocketService;

  constructor() {
    this.wsService = WebSocketService.getInstance();
  }

  async processWebhook(webhookData: WhatsAppWebhook): Promise<void> {
    try {

      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          switch (change.field) {
            case 'messages':
              await this.processMessages(change.value, webhookData);
              break;
            case 'message_template_status_update':
              break;
            case 'account_update':
              break;
            default:
              console.log('ℹ️ Campo no manejado:', change.field);
          }
        }
      }
    } catch (error) {
      console.error('Error procesando webhook:', error);
      throw error;
    }
  }

  private async processMessages(changeValue: any, originalWebhook: WhatsAppWebhook): Promise<void> {
    // Procesar mensajes recibidos
    if (changeValue.messages) {
      for (const message of changeValue.messages) {
        await this.saveMessage(message, changeValue, originalWebhook);
      }
    }

    // Procesar estados de mensajes
    if (changeValue.statuses) {
      for (const status of changeValue.statuses) {
        await this.updateMessageStatus(status);
      }
    }
  }

  private async saveMessage(
    message: WhatsAppMessage, 
    changeValue: any, 
    originalWebhook: WhatsAppWebhook
  ): Promise<void> {
    try {
      console.log(`💬 Procesando mensaje ${message.type} de ${message.from}`);

      // Generar chatId único para la conversación
      const chatId = this.generateChatId(message.from, changeValue.metadata?.phone_number_id);
      
      // Extraer contenido según el tipo de mensaje
      const content = this.extractMessageContent(message);
      
      // Crear documento del mensaje
      const messageDoc = new Message({
        messageId: message.id,
        chatId,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        from: message.from,
        to: changeValue.metadata?.phone_number_id,
        type: message.type,
        content,
        rawWebhook: originalWebhook,  // Solo los mensajes recibidos tienen webhook
        status: 'received',
        direction: 'incoming' 
      });

      // Guardar mensaje en BD
      await messageDoc.save();
      console.log(`✅ Mensaje guardado: ${message.id}`);

      // Actualizar o crear chat
      await this.updateChat(chatId, message, content);

      // Enviar a WebSocket para el CRM
      await this.notifyWebSocket(chatId, messageDoc);

      // Procesar archivos multimedia de forma asíncrona (sin bloquear)
      if (this.isMediaMessage(message.type)) {
        this.processMediaAsync(message, (messageDoc as any)._id.toString()).catch(error => {
          console.error(`Error procesando media ${message.id}:`, error);
        });
      }

    } catch (error) {
      console.error(`Error guardando mensaje ${message.id}:`, error);
    }
  }

  private extractMessageContent(message: WhatsAppMessage): any {
    switch (message.type) {
      case 'text':
        return {
          text: message.text,
          type: 'text'
        };
      
      case 'image':
      case 'audio':
      case 'document':
      case 'video':
      case 'sticker':
        const mediaContent = message[message.type];
        return {
          media: {
            ...mediaContent,
            status: 'pending', // Estado inicial
            downloadUrl: null,  // Se llenará después del procesamiento
            localUrls: null     // URLs locales después del procesamiento
          },
          type: message.type
        };
      
      case 'location':
        return {
          location: message.location,
          type: 'location'
        };
      
      case 'contacts':
        return {
          contacts: message.contacts,
          type: 'contacts'
        };
      
      case 'interactive':
        return {
          interactive: message.interactive,
          type: 'interactive'
        };
      
      case 'button':
        return {
          button: message.button,
          type: 'button'
        };
      
      case 'reaction':
        return {
          reaction: message.reaction,
          type: 'reaction'
        };
      
      default:
        return {
          raw: message,
          type: message.type || 'unknown'
        };
    }
  }

  private generateChatId(from: string, phoneNumberId?: string): string {
    // Para mensajes entrantes, usar el número del remitente como chatId
    console.log(phoneNumberId)
    return from;
  }

  private async updateChat(chatId: string, message: WhatsAppMessage, content: any): Promise<void> {
    try {
      const lastMessageContent = this.getDisplayText(content);
      const timestamp = new Date(parseInt(message.timestamp) * 1000);

      // Buscar chat existente o crear uno nuevo
      let chat = await Chat.findOne({ chatId });
      
      if (!chat) {
        chat = new Chat({
          chatId,
          participants: [message.from],
          lastMessage: timestamp,
          lastMessageContent,
          unreadCount: 1,
          metadata: {
            contactName: message.from, // Se puede actualizar después con el nombre real
            phoneNumberId: message.from
          }
        });
      } else {
        chat.lastMessage = timestamp;
        chat.lastMessageContent = lastMessageContent;
        chat.unreadCount += 1;
      }

      await chat.save();
      console.log(`✅ Chat actualizado: ${chatId}`);
    } catch (error) {
      console.error(`❌ Error actualizando chat ${chatId}:`, error);
    }
  }

  private getDisplayText(content: any): string {
    switch (content.type) {
      case 'text':
        return content.text?.body || 'Mensaje de texto';
      case 'image':
        return content.media?.caption || '📷 Imagen';
      case 'audio':
        return 'Audio';
      case 'document':
        return 'Documento';
      case 'video':
        return 'Video';
      case 'sticker':
        return 'Sticker';
      case 'location':
        return 'Ubicación';
      case 'contacts':
        return 'Contacto';
      case 'interactive':
        return 'Mensaje interactivo';
      case 'button':
        return 'Botón';
      case 'reaction':
        return `${content.reaction?.emoji || '👍'} Reacción`;
      default:
        return 'Mensaje';
    }
  }

  private async updateMessageStatus(status: WhatsAppStatus): Promise<void> {
    try {
      console.log(`📊 Actualizando estado de mensaje ${status.id}: ${status.status}`);

      const message = await Message.findOne({ messageId: status.id });
      if (message) {
        message.status = status.status;
        await message.save();
        console.log(`✅ Estado actualizado: ${status.id} -> ${status.status}`);

        // Notificar cambio de estado por WebSocket
        await this.wsService.notifyMessageStatus(message.chatId, status);
      } else {
        console.log(`⚠️ Mensaje no encontrado para actualizar estado: ${status.id}`);
      }
    } catch (error) {
      console.error(`❌ Error actualizando estado de mensaje ${status.id}:`, error);
    }
  }

  private async notifyWebSocket(chatId: string, message: any): Promise<void> {
    try {
      await this.wsService.notifyNewMessage(chatId, message);
    } catch (error) {
      console.error('❌ Error enviando notificación WebSocket:', error);
    }
  }

  /**
   * 🖼️ Verifica si el mensaje es de tipo multimedia
   */
  private isMediaMessage(messageType: string): boolean {
    return ['image', 'audio', 'document', 'video', 'sticker'].includes(messageType);
  }

  /**
   * 📥 Procesa archivos multimedia de forma asíncrona
   */
  private async processMediaAsync(message: WhatsAppMessage, messageId: string): Promise<void> {
    try {
      console.log(`🔄 Iniciando procesamiento asíncrono de media: ${message.id}`);

      if (!config.whatsappAccessToken) {
        console.error('❌ WHATSAPP_ACCESS_TOKEN no configurado');
        return;
      }

      // Obtener metadatos del archivo
      const mediaContent = (message as any)[message.type];
      if (!mediaContent || !mediaContent.id) {
        console.error('❌ No se encontraron metadatos de media');
        return;
      }

      // Procesar archivo con Media Service
      const processedFile = await mediaService.processWhatsAppMedia(
        mediaContent.id,
        config.whatsappAccessToken,
        {
          id: mediaContent.id,
          mimeType: mediaContent.mime_type,
          sha256: mediaContent.sha256,
          caption: mediaContent.caption
        }
      );

      // Actualizar mensaje en base de datos
      await this.updateMessageWithMediaInfo(messageId, processedFile);

      console.log(`✅ Media procesado exitosamente: ${processedFile.publicUrl}`);
      
      // Notificar actualización por WebSocket
      await this.notifyMediaProcessed(messageId, processedFile);

    } catch (error) {
      console.error(`❌ Error en procesamiento asíncrono de media:`, error);
      
      // Marcar como error en la base de datos
      await this.markMediaAsError(messageId, (error as Error).message);
    }
  }

  /**
   * 💾 Actualiza mensaje con información del archivo procesado
   */
  private async updateMessageWithMediaInfo(messageId: string, processedFile: any): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.error(`Mensaje no encontrado: ${messageId}`);
        return;
      }

      // Actualizar content con información del archivo procesado
      message.content.media = {
        ...message.content.media,
        status: 'processed',
        downloadUrl: processedFile.publicUrl,
        localUrls: {
          original: processedFile.publicUrl,
          fileServerId: processedFile.fileServerId
        },
        processedAt: new Date(),
        fileSize: processedFile.size
      };

      await message.save();
      console.log(`📊 Metadatos de media actualizados para mensaje: ${messageId}`);

    } catch (error) {
      console.error(`Error actualizando metadatos de media:`, error);
    }
  }

  /**
   * 🔔 Notifica que el archivo fue procesado
   */
  private async notifyMediaProcessed(messageId: string, processedFile: any): Promise<void> {
    try {
      console.log(`📊 Media procesado para mensaje ${messageId}: ${processedFile.publicUrl}`);
      // TODO: Implementar notificación WebSocket específica para media procesado
    } catch (error) {
      console.error(`Error notificando procesamiento de media:`, error);
    }
  }

  /**
   * ❌ Marca archivo como error en procesamiento
   */
  private async markMediaAsError(messageId: string, errorMessage: string): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.content.media = {
          ...message.content.media,
          status: 'error',
          errorMessage,
          processedAt: new Date()
        };
        await message.save();
      }
    } catch (error) {
      console.error(`Error marcando media como error:`, error);
    }
  }
} 