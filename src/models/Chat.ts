import mongoose, { Schema, Document } from 'mongoose';
import { ChatDocument } from '../types/whatsapp.interfaces';

// Definir la interfaz con los métodos de instancia
export interface IChat extends Omit<ChatDocument, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos de instancia
  updateLastMessage(content: string, timestamp?: Date): Promise<IChat>;
  markAsRead(): Promise<IChat>;
  addParticipant(phoneNumber: string): Promise<IChat>;
  removeParticipant(phoneNumber: string): Promise<IChat>;
}

const ChatSchema: Schema = new Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  participants: [{
    type: String,
    required: true
  }],
  lastMessage: {
    type: Date,
    required: true,
    index: true
  },
  lastMessageContent: {
    type: String,
    required: true
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'chats'
});

// Índices
ChatSchema.index({ lastMessage: -1 }); // Para ordenar por última actividad
ChatSchema.index({ participants: 1 }); // Para buscar por participantes
ChatSchema.index({ unreadCount: 1 }); // Para filtrar chats no leídos

// Métodos estáticos
ChatSchema.statics.findByParticipant = function(phoneNumber: string) {
  return this.find({ participants: phoneNumber })
    .sort({ lastMessage: -1 });
};

ChatSchema.statics.getUnreadChats = function() {
  return this.find({ unreadCount: { $gt: 0 } })
    .sort({ lastMessage: -1 });
};

ChatSchema.statics.findOrCreateChat = async function(chatId: string, participants: string[]) {
  let chat = await this.findOne({ chatId });
  
  if (!chat) {
    chat = new this({
      chatId,
      participants: [...new Set(participants)], // Eliminar duplicados
      lastMessage: new Date(),
      lastMessageContent: '',
      unreadCount: 0,
      metadata: {}
    });
    await chat.save();
  }
  
  return chat;
};

// Métodos de instancia
ChatSchema.methods.updateLastMessage = function(content: string, timestamp: Date = new Date()) {
  this.lastMessage = timestamp;
  this.lastMessageContent = content;
  this.unreadCount += 1;
  return this.save();
};

ChatSchema.methods.markAsRead = function() {
  this.unreadCount = 0;
  return this.save();
};

ChatSchema.methods.addParticipant = function(phoneNumber: string) {
  if (!this.participants.includes(phoneNumber)) {
    this.participants.push(phoneNumber);
    return this.save();
  }
  return Promise.resolve(this);
};

ChatSchema.methods.removeParticipant = function(phoneNumber: string) {
  this.participants = this.participants.filter((p: string) => p !== phoneNumber);
  return this.save();
};

export const Chat = mongoose.model<IChat>('Chat', ChatSchema); 