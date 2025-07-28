import { Message } from '../models/Message';

interface GetMessagesOptions {
  chatId?: string;
  limit?: number;
  offset?: number;
  type?: string;
}

export const MessageService = {
  // Obtener mensajes con filtros
  getMessages: async (options: GetMessagesOptions = {}) => {
    const { chatId, limit = 50, offset = 0, type } = options;
    
    let query: any = {};
    
    if (chatId) {
      query.chatId = chatId;
    }
    
    if (type) {
      query.type = type;
    }
    
    return await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean(); // Para mejor performance
  },

  // Obtener mensajes por chat específico
  getMessagesByChat: async (chatId: string, limit: number = 50, offset: number = 0) => {
    return await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
  },

  // Buscar mensajes por contenido
  searchMessages: async (chatId: string, searchTerm: string) => {
    return await Message.find({
      chatId,
      $or: [
        { 'content.text.body': { $regex: searchTerm, $options: 'i' } },
        { 'content.media.caption': { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ timestamp: -1 });
  }
};