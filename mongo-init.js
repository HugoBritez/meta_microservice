// Inicialización de MongoDB para Docker
db = db.getSiblingDB('whatsapp_db');

// Crear usuario para la aplicación
db.createUser({
  user: 'whatsapp_user',
  pwd: 'whatsapp_password',
  roles: [
    {
      role: 'readWrite',
      db: 'whatsapp_db'
    }
  ]
});

// Crear índices básicos
db.messages.createIndex({ "messageId": 1 }, { unique: true });
db.messages.createIndex({ "chatId": 1, "timestamp": -1 });
db.messages.createIndex({ "from": 1, "timestamp": -1 });
db.messages.createIndex({ "type": 1, "timestamp": -1 });

db.chats.createIndex({ "chatId": 1 }, { unique: true });
db.chats.createIndex({ "lastMessageTimestamp": -1 });

print('Database initialized successfully!');