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
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    index: true
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  collection: 'messages'
});

// Índices compuestos para consultas eficientes
MessageSchema.index({ chatId: 1, timestamp: -1 });
MessageSchema.index({ from: 1, timestamp: -1 });
MessageSchema.index({ type: 1, timestamp: -1 });

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

// Métodos de instancia
MessageSchema.methods.updateStatus = function(newStatus: 'sent' | 'delivered' | 'read' | 'failed') {
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