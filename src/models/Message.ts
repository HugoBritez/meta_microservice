import mongoose, { Schema, Document } from 'mongoose';
import { MessageDocument } from '../types/whatsapp.interfaces';

// Extender la interfaz para incluir los métodos de Mongoose
export interface IMessage extends Omit<MessageDocument, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chatId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  from: {
    type: String,
    required: true,
    index: true
  },
  to: {
    type: String,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'image', 'audio', 'document', 'video', 'sticker', 'location', 'contacts', 'interactive', 'button', 'reaction', 'unknown', 'unsupported']
  },
  content: {
    type: Schema.Types.Mixed,
    required: true
  },
  rawWebhook: {
    type: Schema.Types.Mixed,
    required: false  // ⭐ CAMBIO: Ahora es opcional
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'received'],
    index: true
  },
  direction: {  // ⭐ NUEVO CAMPO: Para diferenciar incoming/outgoing
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
    index: true,
    default: 'incoming'  // Por compatibilidad con mensajes existentes
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// Índices compuestos para consultas eficientes
MessageSchema.index({ chatId: 1, timestamp: -1 });
MessageSchema.index({ from: 1, timestamp: -1 });
MessageSchema.index({ type: 1, timestamp: -1 });
MessageSchema.index({ direction: 1, timestamp: -1 }); // ⭐ NUEVO ÍNDICE

// Métodos estáticos
MessageSchema.statics.findByChatId = function(chatId: string, limit: number = 50) {
  return this.find({ chatId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

MessageSchema.statics.findByPhoneNumber = function(phoneNumber: string, limit: number = 50) {
  return this.find({ $or: [{ from: phoneNumber }, { to: phoneNumber }] })
    .sort({ timestamp: -1 })
    .limit(limit);
};

MessageSchema.statics.searchInContent = function(chatId: string, searchTerm: string) {
  return this.find({
    chatId,
    $or: [
      { 'content.text.body': { $regex: searchTerm, $options: 'i' } },
      { 'content.caption': { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ timestamp: -1 });
};

// ⭐ NUEVO MÉTODO: Buscar solo mensajes enviados
MessageSchema.statics.findOutgoingMessages = function(chatId: string, limit: number = 50) {
  return this.find({ chatId, direction: 'outgoing' })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// ⭐ NUEVO MÉTODO: Buscar solo mensajes recibidos
MessageSchema.statics.findIncomingMessages = function(chatId: string, limit: number = 50) {
  return this.find({ chatId, direction: 'incoming' })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Métodos de instancia
MessageSchema.methods.updateStatus = function(newStatus: 'sent' | 'delivered' | 'read' | 'failed' | 'received') {
  this.status = newStatus;
  return this.save();
};

MessageSchema.methods.generateChatId = function() {
  // Generar un chatId consistente para la conversación
  const participants = [this.from, this.to].filter(Boolean).sort();
  return participants.join('_');
};

// Middleware pre-save
MessageSchema.pre('save', function(next) {
  if (!this.chatId && this.from) {
    // Auto-generar chatId si no está presente
    this.chatId = this.from; // Para mensajes entrantes, usar el número del remitente
  }
  next();
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema); 