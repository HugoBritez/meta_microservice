import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { Chat, Message, WebSocketMessage } from '@/features/Chat/types/whatsapp.types';
import { config } from '@/config/env';
import { notificationService } from '@/features/Chat/services/notificationService';

const SOCKET_URL = config.webSocketUri || "https://node.sofmar.com.py:8443";

interface SocketContextType {
  socket: typeof Socket | null;
  connected: boolean;
  chats: Chat[];
  messages: Record<string, Message[]>;
  isLoading: boolean;
  getChatList: (options?: { limit?: number, unreadOnly?: boolean }) => void;
  getChatMessages: (chatId: string, options?: { limit?: number, offset?: number }) => void;
  subscribeToChat: (chatId: string) => void;
  unsubscribeFromChat: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  closeConnection: () => void;
  // ⭐ AGREGAR: Función para optimistic updates
  addOptimisticMessage: (chatId: string, message: Partial<Message>) => void;
  // 🔄 AGREGAR: Función para reconectar con nuevo token
  reconnectWithNewToken: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎯 AGREGAR: Sistema de deduplicación
  const [lastNotification, setLastNotification] = useState<{chatId: string, message: string, timestamp: number} | null>(null);

  useEffect(() => {
    if (!socket) {
      console.log('🔌 Creando nueva conexión WebSocket...');
      
      // Verificar que tenemos token antes de conectar
      const token = sessionStorage.getItem('token');
      const userId = sessionStorage.getItem('user_id');
      
      if (!token) {
        console.error('❌ No hay token disponible para autenticación WebSocket');
        setIsLoading(false);
        return;
      }

      const newSocket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        auth: {
          token: token,
          clientId: `sofmar_crm_${userId}_${Math.random().toString(36).substring(2, 15)}`,
        },
        forceNew: true, // Forzar nueva conexión para evitar problemas de auth
      });

      newSocket.on("connect", () => {
        console.log('🟢 WebSocket conectado');
        setConnected(true);
        
        // Autenticar explícitamente después de conectar
        newSocket.emit('authenticate', {
          token: token,
          clientId: `sofmar_crm_${userId}_${Math.random().toString(36).substring(2, 15)}`,
        });
      });

      newSocket.on('authenticated', (data: any) => {
        console.log('✅ Autenticado correctamente', data);
      });

      newSocket.on('authentication_error', (error: any) => {
        console.error('❌ Error de autenticación WebSocket:', error);
        setConnected(false);
        
        // Si el token es inválido, cerrar la conexión
        if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
          console.log('🔄 Token inválido o expirado, cerrando conexión...');
          newSocket.close();
          setSocket(null);
        }
      });

      newSocket.on("disconnect", () => {
        console.log('🔴 WebSocket desconectado');
        setConnected(false);
      });

      newSocket.on("chat_list", (data: { chats: Chat[], total: number }) => {
        console.log('📋 Lista de chats recibida:', data.chats.length);
        setChats(data.chats);
        setIsLoading(false);
      });

      newSocket.on('chat_messages', (data: { chatId: string, messages: Message[], hasMore: boolean }) => {
        console.log('💬 Mensajes del chat recibidos:', data.chatId, data.messages);
        setMessages(prev => ({
          ...prev,
          [data.chatId]: data.messages
        }));
      });

      newSocket.on('new_message', (notification: WebSocketMessage) => {
        console.log('🔔 Nuevo mensaje recibido:', notification);
        if (notification.type === 'new_message') {
          // Actualizar mensajes del chat
          setMessages(prev => ({
            ...prev,
            [notification.chatId]: [
              ...(prev[notification.chatId] || []),
              notification.data
            ]
          }));

          // Actualizar lista de chats (mover al tope)
          setChats(prev => {
            const updatedChats = prev.filter(chat => chat.chatId !== notification.chatId);
            const targetChat = prev.find(chat => chat.chatId === notification.chatId);
            
            if (targetChat) {
              targetChat.lastMessage = notification.timestamp;
              targetChat.lastMessageContent = notification.data.content?.text?.body || 'Nuevo mensaje';
              targetChat.unreadCount += 1;
              
              // Notificación desde new_message
              notificationService.showMessageNotification(
                notification.chatId,
                targetChat.metadata.contactName || 'Contacto desconocido',
                notification.data.content?.text?.body || 'Nuevo mensaje'
              );
              
              return [targetChat, ...updatedChats];
            }
            
            return prev;
          });
        }
      });

      // ✅ SIMPLE: Listener para message_sent
      newSocket.on('message_sent', (data: any) => {
        console.log('📤 Mensaje enviado confirmado - ESTRUCTURA COMPLETA:', JSON.stringify(data, null, 2));
        
        // Reemplazar mensaje optimístico temporal con el mensaje real
        setMessages(prev => {
          const currentMessages = prev[data.chatId] || [];
          
          // Buscar mensaje temporal con el mismo contenido
          const tempMessageIndex = currentMessages.findIndex(msg => 
            msg.messageId.startsWith('temp_') && 
            msg.content?.text?.body === data.content?.text?.body
          );
          
          if (tempMessageIndex !== -1) {
            // Reemplazar mensaje temporal con el real
            const updatedMessages = [...currentMessages];
            updatedMessages[tempMessageIndex] = {
              _id: data.messageId,
              messageId: data.messageId,
              chatId: data.chatId,
              timestamp: new Date(data.timestamp),
              from: 'outgoing_user', // Nuestro número
              to: data.to,
              type: 'text',
              content: data.content,
              status: 'sent' // Inicialmente sent
            };
            
            return {
              ...prev,
              [data.chatId]: updatedMessages
            };
          } else {
            // Si no hay mensaje temporal, agregar el nuevo (fallback)
            return {
              ...prev,
              [data.chatId]: [
                ...currentMessages,
                {
                  _id: data.messageId,
                  messageId: data.messageId,
                  chatId: data.chatId,
                  timestamp: new Date(data.timestamp),
                  from: 'outgoing_user',
                  to: data.to,
                  type: 'text',
                  content: data.content,
                  status: 'sent'
                }
              ]
            };
          }
        });
      });

      // ✅ SIMPLE: Listener para message_status  
      newSocket.on('message_status', (statusUpdate: any) => {
        console.log('📋 [LISTENER_2025] Estado de mensaje actualizado - ESTRUCTURA COMPLETA:', JSON.stringify(statusUpdate, null, 2));
        
        // Actualizar el estado del mensaje en la lista
        setMessages(prev => {
          const updatedMessages = { ...prev };
          let messageFound = false;
          
          // Buscar el mensaje en todos los chats y actualizar su estado
          Object.keys(updatedMessages).forEach(chatId => {
            updatedMessages[chatId] = updatedMessages[chatId].map(message => {
              if (message.messageId === statusUpdate.data?.id) {
                messageFound = true;
                console.log(`🎯 [LISTENER_2025] ENCONTRADO! Actualizando mensaje ${message.messageId} de ${message.status} → ${statusUpdate.data?.status}`);
                return { ...message, status: statusUpdate.data?.status || message.status };
              }
              return message;
            });
          });
          
          if (!messageFound) {
            console.log(`❌ [LISTENER_2025] NO ENCONTRADO! Buscando messageId: ${statusUpdate.data?.id}`);
            console.log('📝 [LISTENER_2025] Mensajes actuales:', Object.keys(updatedMessages).reduce((acc: Record<string, any>, chatId) => {
              acc[chatId] = updatedMessages[chatId].map(m => ({ messageId: m.messageId, status: m.status }));
              return acc;
            }, {}));
          }
          
          return updatedMessages;
        });
      });

      // 📸 NUEVO: Listener para media-processed
      newSocket.on('media-processed', (data: any) => {
        console.log('📸 [MEDIA_PROCESSED] Media procesado recibido:', JSON.stringify(data, null, 2));
        
        // Actualizar el mensaje con la información del media procesado
        setMessages(prev => {
          const updatedMessages = { ...prev };
          let messageFound = false;
          
          // Buscar el mensaje en todos los chats y actualizar su media
          Object.keys(updatedMessages).forEach(chatId => {
            updatedMessages[chatId] = updatedMessages[chatId].map(message => {
              if (message._id === data.messageId || message.messageId === data.messageId) {
                messageFound = true;
                console.log(`🎯 [MEDIA_PROCESSED] ENCONTRADO! Actualizando media del mensaje ${message.messageId}`);
                
                return {
                  ...message,
                  content: {
                    ...message.content,
                    media: data.media // Reemplazar completamente el objeto media
                  }
                };
              }
              return message;
            });
          });
          
          if (!messageFound) {
            console.log(`❌ [MEDIA_PROCESSED] NO ENCONTRADO! Buscando messageId: ${data.messageId}`);
            console.log('📝 [MEDIA_PROCESSED] Mensajes actuales:', Object.keys(updatedMessages).reduce((acc: Record<string, any>, chatId) => {
              acc[chatId] = updatedMessages[chatId].map(m => ({ 
                _id: m._id, 
                messageId: m.messageId, 
                hasMedia: !!m.content?.media 
              }));
              return acc;
            }, {}));
          }
          
          return updatedMessages;
        });
      });

      newSocket.on('chat_updated', (data: any) => {
        console.log('📱 Chat actualizado:', data);
        
        // ✅ AGREGAR: Actualizar mensajes si viene un mensaje nuevo
        if (data.newMessage) {
          setMessages(prev => ({
            ...prev,
            [data.chatId]: [
              ...(prev[data.chatId] || []),
              data.newMessage
            ]
          }));
        }
        
        setChats(prev => {
          const chatIndex = prev.findIndex(chat => chat.chatId === data.chatId);
          
          if (chatIndex !== -1) {
            const updatedChats = [...prev];
            const chatToUpdate = { ...updatedChats[chatIndex] };
            
            if (data.lastMessage) chatToUpdate.lastMessage = new Date(data.lastMessage);
            if (data.lastMessageContent) chatToUpdate.lastMessageContent = data.lastMessageContent;
            if (data.unreadIncrement) chatToUpdate.unreadCount += data.unreadIncrement;
            
            // 🎯 DEDUPLICACIÓN: Solo notificar si hay incremento Y no es duplicado
            if (data.unreadIncrement && data.unreadIncrement > 0) {
              const now = Date.now();
              
              // Verificar si es una notificación duplicada (mismo chat y mensaje en los últimos 2 segundos)
              if (!lastNotification || 
                  lastNotification.chatId !== data.chatId || 
                  lastNotification.message !== data.lastMessageContent ||
                  (now - lastNotification.timestamp) > 2000) {
                
                console.log('🔔 Disparando notificación desde chat_updated');
                
                const contactName = chatToUpdate.metadata?.contactName || 
                                   chatToUpdate.metadata?.phoneNumberId || 
                                   'Contacto desconocido';
                
                console.log('👤 Nombre del contacto:', contactName);
                
                notificationService.showMessageNotification(
                  data.chatId,
                  contactName,
                  data.lastMessageContent || 'Nuevo mensaje'
                );
                
                // Actualizar último notification
                setLastNotification({
                  chatId: data.chatId,
                  message: data.lastMessageContent || '',
                  timestamp: now
                });
              } else {
                console.log('🔄 Notificación duplicada ignorada');
              }
            }
            
            updatedChats.splice(chatIndex, 1);
            return [chatToUpdate, ...updatedChats];
          }
          
          return prev;
        });
      });

      newSocket.on('error', (error: string) => {
        console.error('❌ Error WebSocket:', error);
        setIsLoading(false);
      });

      setSocket(newSocket);
    }

    return () => {
      // No cerrar la conexión aquí, mantenerla activa
    };
  }, [lastNotification]);

  // Función para cerrar la conexión
  const closeConnection = useCallback(() => {
    if (socket) {
      console.log('🔌 Cerrando conexión WebSocket...');
      socket.close();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const getChatList = useCallback((options?: { limit?: number, unreadOnly?: boolean }) => {
    if (socket && connected) {
      setIsLoading(true);
      socket.emit('get_chat_list', {
        limit: options?.limit || 20,
        unreadOnly: options?.unreadOnly || false
      });
    }
  }, [socket, connected]);

  const getChatMessages = useCallback((chatId: string, options?: { limit?: number, offset?: number }) => {
    if (socket && connected) {
      socket.emit('get_chat_messages', {
        chatId,
        limit: options?.limit || 50,
        offset: options?.offset || 0
      });
    }
  }, [socket, connected]);

  const subscribeToChat = useCallback((chatId: string) => {
    if (socket && connected) {
      socket.emit('subscribe_chat', chatId);
    }
  }, [socket, connected]);

  const unsubscribeFromChat = useCallback((chatId: string) => {
    if (socket && connected) {
      socket.emit('unsubscribe_chat', chatId);
    }
  }, [socket, connected]);

  const markChatAsRead = useCallback((chatId: string) => {
    if (socket && connected) {
      socket.emit('mark_chat_read', chatId);
      
      setChats(prev => 
        prev.map(chat => 
          chat.chatId === chatId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    }
  }, [socket, connected]);

  const addOptimisticMessage = useCallback((chatId: string, messageData: Partial<Message>) => {
    const optimisticMessage: Message = {
      _id: `temp_${Date.now()}_${Math.random()}`,
      messageId: `temp_${Date.now()}`,
      chatId,
      timestamp: new Date(),
      from: messageData.from || 'outgoing_user', // Tu número de WhatsApp Business
      to: messageData.to,
      type: 'text',
      content: messageData.content,
      status: 'sending', // Estado temporal mientras se envía
      ...messageData
    };

    // Agregar mensaje optimísticamente
    setMessages(prev => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] || []),
        optimisticMessage
      ]
    }));

    // Actualizar lista de chats
    setChats(prev => {
      const chatIndex = prev.findIndex(chat => chat.chatId === chatId);
      
      if (chatIndex !== -1) {
        const updatedChats = [...prev];
        const chatToUpdate = { ...updatedChats[chatIndex] };
        
        chatToUpdate.lastMessage = new Date();
        chatToUpdate.lastMessageContent = messageData.content?.text?.body || 'Mensaje enviado';
        
        updatedChats.splice(chatIndex, 1);
        return [chatToUpdate, ...updatedChats];
      }
      
      return prev;
    });
  }, []);

  // 🔄 Función para reconectar con nuevo token
  const reconnectWithNewToken = useCallback(() => {
    console.log('🔄 Reconectando WebSocket con nuevo token...');
    
    // Cerrar conexión actual
    if (socket) {
      socket.close();
      setSocket(null);
      setConnected(false);
    }
    
    // Limpiar estados
    setChats([]);
    setMessages({});
    setIsLoading(false);
    
    // El useEffect se encargará de crear una nueva conexión automáticamente
    // cuando socket sea null en el siguiente render
  }, [socket]);

  const value: SocketContextType = {
    socket,
    connected,
    chats,
    messages,
    isLoading,
    getChatList,
    getChatMessages,
    subscribeToChat,
    unsubscribeFromChat,
    markChatAsRead,
    closeConnection,
    addOptimisticMessage,
    reconnectWithNewToken, 
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext debe ser usado dentro de un SocketProvider');
  }
  return context;
};