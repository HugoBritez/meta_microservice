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
  }
  tenants: {
    [key: string]: {
      name: string;
      host: string;
      subdomain?: string;
      isActive: boolean;
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
    expiresIn: process.env['JWT_EXPIRES_IN'] || '1h'
  },
  tenants: {
    localhost: {
      name: "Development",
      host: "localhost",
      isActive: true,
    },
    sofmar: {
      name: "Sofmar Principal",
      host: "sofmar.com.py",
      isActive: true,
    },
    lobeck: {
      name: "Lobeck",
      host: "lobeck.sofmar.com.py",
      subdomain: "lobeck",
      isActive: true,
    }
  }
};

// Validar configuración
if (!config.port || isNaN(config.port)) {
  throw new Error('Puerto inválido en la configuración');
} 


