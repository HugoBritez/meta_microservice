import mongoose from 'mongoose';
import { config } from './config';

export class Database {
  private static instance: Database;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    try {
      const mongoUri = config.mongoUri;
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log('✅ Conectado a MongoDB');
      
      // Event listeners
      mongoose.connection.on('error', (error) => {
        console.error('❌ Error de conexión MongoDB:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB desconectado');
      });

    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      process.exit(1);
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

export const database = Database.getInstance(); 