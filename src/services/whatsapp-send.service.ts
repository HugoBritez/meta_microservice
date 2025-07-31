import { config } from '../config/config';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';

// ARREGLADA: interface más precisa para las respuestas de WhatsApp API
interface WhatsAppApiResponse {
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

// ARREGLADA: interface más específica sobre cuándo messageId puede ser undefined
interface SendMessageResponse {
  success: boolean;
  messageId?: string; // Puede ser undefined cuando success es false
  error?: string;     // Solo presente cuando success es false
}

interface TextMessage {
  to: string;
  text: string;
  chatId?: string;
  timestamp?: string;
}

interface MediaMessage {
  to: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  chatId?: string;
  timestamp?: string;
}

export class WhatsAppSendService {
  private readonly baseUrl = 'https://graph.facebook.com/v22.0';
  private readonly accessToken = config.whatsappAccessToken;
  private readonly phoneNumberId = config.whatsappPhoneNumberId;

  // NUEVO MÉTODO: getter público para phoneNumberId
  getPhoneNumberId(): string {
    return this.phoneNumberId;
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage({ to, text, chatId }: TextMessage): Promise<SendMessageResponse> {
    try {
      console.log(`📤 Enviando mensaje de texto a ${to}`);

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: text
        }
      };

      const response = await this.makeApiCall(payload);
      
      if (response.success && response.messageId) {
        const finalChatId = chatId || this.generateChatId(to);
        
        // Guardar mensaje enviado en la BD
        await this.saveOutgoingMessage({
          messageId: response.messageId,
          chatId: finalChatId,
          to,
          content: { text: { body: text } },
          type: 'text'
        });

        await this.updateChat(finalChatId, { to, text, chatId: finalChatId }, { type: 'text', text: { body: text } })
      }

      return response;
    } catch (error) {
      console.error('❌ Error enviando mensaje de texto:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Envía un mensaje con media (imagen, documento, etc.)
   */
  async sendMediaMessage({ to, mediaType, mediaId, mediaUrl, caption, chatId }: MediaMessage): Promise<SendMessageResponse> {
    try {
      console.log(`📤 Enviando mensaje de ${mediaType} a ${to}`);

      const mediaPayload: any = {};
      
      if (mediaId) {
        mediaPayload.id = mediaId;
      } else if (mediaUrl) {
        mediaPayload.link = mediaUrl;
      } else {
        throw new Error('Se requiere mediaId o mediaUrl');
      }

      if (caption && ['image', 'document', 'video'].includes(mediaType)) {
        mediaPayload.caption = caption;
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: mediaType,
        [mediaType]: mediaPayload
      };

      const response = await this.makeApiCall(payload);
      
      if (response.success && response.messageId) {
        const finalChatId = chatId || this.generateChatId(to);
        
        // Guardar mensaje enviado en la BD
        await this.saveOutgoingMessage({
          messageId: response.messageId,
          chatId: finalChatId, // <- usar finalChatId
          to,
          content: { 
            media: {
              type: mediaType, 
              id: mediaId, 
              url: mediaUrl, 
              caption 
            } 
          },
          type: mediaType
        });
        await this.updateChat(finalChatId, { to, text: caption || '', chatId: finalChatId }, { type: mediaType, media: mediaPayload })
      }

      return response;
    } catch (error) {
      console.error(`❌ Error enviando mensaje de ${mediaType}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Realiza la llamada a la API de WhatsApp
   */
  private async makeApiCall(payload: any): Promise<SendMessageResponse> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as WhatsAppApiResponse;

    if (!response.ok) {
      console.error('❌ Error de API WhatsApp:', data);
      throw new Error(`API Error: ${data.error?.message || 'Error desconocido'}`);
    }

    // SOLUCIÓN: Manejar explícitamente el caso donde messageId puede ser undefined
    const messageId = data.messages?.[0]?.id;
    
    if (!messageId) {
      throw new Error('No se recibió messageId en la respuesta de WhatsApp');
    }

    return {
      success: true,
      messageId: messageId // Ahora TypeScript sabe que messageId es string, no undefined
    };
  }

  /**
   * Guarda el mensaje enviado en la base de datos
   */
  private async saveOutgoingMessage(messageData: {
    messageId: string;
    chatId: string;
    to: string;
    content: any;
    type: string;
  }): Promise<void> {
    try {
      const message = new Message({
        messageId: messageData.messageId,
        chatId: messageData.chatId,
        timestamp: new Date(),
        from: this.phoneNumberId,
        to: messageData.to,
        type: messageData.type,
        content: messageData.content,
        status: 'sent',
        direction: 'outgoing'
      });

      await message.save();
      console.log(`✅ Mensaje enviado guardado: ${messageData.messageId}`);
    } catch (error) {
      console.error('❌ Error guardando mensaje enviado:', error);
    }
  }

  private async updateChat (chatId: string, message: TextMessage | MediaMessage, content: any) {
    try {
      const lastMessageContent = this.extractMessageContent(content);
      const timestamp = new Date(); // Simplificado

      let chat = await Chat.findOne({ chatId });
      if(!chat){
        chat = new Chat({
          chatId,
          participants: [message.to],
          lastMessage: timestamp,
          lastMessageContent,
          unreadCount: 0, // Mensajes salientes no incrementan unreadCount
          metadata: {
            contactName: message.to,
            phoneNumberId: message.to
          }
        });
      } else {
        chat.lastMessage = timestamp;
        chat.lastMessageContent = lastMessageContent;
        // No incrementar unreadCount para mensajes salientes
      }

      await chat.save();
    } catch (error) {
      console.error('❌ Error actualizando chat:', error);
    }
  }


  private extractMessageContent(content: any) {
    switch (content.type) {
      case 'text':
        return content.text?.body || 'Mensaje de texto';
      case 'image':
        return content.image?.caption || 'Imagen';
      case 'document':
        return content.document?.caption || 'Documento';
      case 'audio':
        return content.audio?.caption || 'Audio';
      case 'video':
        return content.video?.caption || 'Video';
      case 'sticker':
        return content.sticker?.caption || 'Sticker';
      case 'location':
        return content.location?.caption || 'Ubicación';
      case 'contacts':
        return content.contacts?.caption || 'Contacto';
    }
  }

  /**
   * Genera chatId consistente
   */
  private generateChatId(phoneNumber: string): string {
    return `${phoneNumber}_${this.phoneNumberId}`;
  }
}