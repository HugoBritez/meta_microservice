import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { Chat, Message, WebSocketMessage } from '@/features/Chat/types/whatsapp.types';
import { config } from '@/config/env';
import { notificationService } from '@/features/Chat/services/notificationService';

const SOCKET_URL = config.webSocketUri || "https://meta-microservice-19rg.onrender.com";

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
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log('🟢 WebSocket conectado');
        setConnected(true);
        
        newSocket.emit('authenticate', {
          token: sessionStorage.getItem('token'),
          clientId: `sofmar_crm_${sessionStorage.getItem('user_id') + Math.random().toString(36).substring(2, 15)}`,
        });
      });

      newSocket.on('authenticated', (data: any) => {
        console.log('✅ Autenticado', data);
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
        console.log('💬 Mensajes del chat recibidos:', data.chatId, data.messages.length);
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
};import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import { Chat, Message, WebSocketMessage } from '@/features/Chat/types/whatsapp.types';
import { config } from '@/config/env';
import { notificationService } from '@/features/Chat/services/notificationService';

const SOCKET_URL = config.webSocketUri || "https://meta-microservice-19rg.onrender.com";

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
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log('🟢 WebSocket conectado');
        setConnected(true);
        
        newSocket.emit('authenticate', {
          token: sessionStorage.getItem('token'),
          clientId: `sofmar_crm_${sessionStorage.getItem('user_id') + Math.random().toString(36).substring(2, 15)}`,
        });
      });

      newSocket.on('authenticated', (data: any) => {
        console.log('✅ Autenticado', data);
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
        console.log('💬 Mensajes del chat recibidos:', data.chatId, data.messages.length);
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