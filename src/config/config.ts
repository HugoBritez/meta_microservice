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
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  }
  tenants: {
    [key: string]: {
      name: string;
      host: string;
      subdomain?: string;
      isActive: boolean;
      phoneNumberId?: string; // ⭐ NUEVO: Mapeo con WhatsApp
    }
  }
}

export const config: Config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  corsOrigin: process.env['CORS_ORIGIN'] || '*',
  logLevel: process.env['LOG_LEVEL'] || 'info',
  mongoUri: process.env['MONGODB_URI'] || '',
  verifyToken: process.env['VERIFY_TOKEN'] || '',
  whatsappAccessToken: process.env['WHATSAPP_ACCESS_TOKEN'] || '',
  whatsappPhoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] || '',
  jwt: {
    secret: process.env['JWT_SECRET'] || '',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '1h',
    issuer: process.env['JWT_ISSUER'] || 'SofmarAPI',
    audience: process.env['JWT_AUDIENCE'] || 'WebStock'
  },
  tenants: {
    localhost: {
      name: "Development",
      host: "localhost",
      isActive: true,
      phoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] || '',
    },
    sofmar: {
      name: "Sofmar Principal",
      host: "sofmar.com.py",
      isActive: true,
      phoneNumberId: "769414586246354", // ⭐ WhatsApp Phone Number ID de Sofmar
    },
    lobeck: {
      name: "Lobeck",
      host: "lobeck.sofmar.com.py",
      subdomain: "lobeck",
      isActive: true,
      phoneNumberId: "", // ⭐ Configurar cuando se tenga
    }
  }
};

// Validar configuración
if (!config.port || isNaN(config.port)) {
  throw new Error('Puerto inválido en la configuración');
} 


