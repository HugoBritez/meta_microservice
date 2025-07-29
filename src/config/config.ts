import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  logLevel: string;
  mongoUri: string;
  verifyToken: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
}

export const config: Config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  corsOrigin: process.env['CORS_ORIGIN'] || '*',
  logLevel: process.env['LOG_LEVEL'] || 'info',
  mongoUri: process.env['MONGODB_URI'] || 'mongodb://admin:tu_password@localhost:27017/whatsapp_db?authSource=admin',
  verifyToken: process.env['VERIFY_TOKEN'] || 'tu_verify_token',
  whatsappAccessToken: process.env['WHATSAPP_ACCESS_TOKEN'] || 'tu_access_token',
  whatsappPhoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] || 'tu_phone_number_id'
};

// Validar configuración
if (!config.port || isNaN(config.port)) {
  throw new Error('Puerto inválido en la configuración');
} 