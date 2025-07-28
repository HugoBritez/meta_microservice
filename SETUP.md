# 🚀 WhatsApp Microservice - Setup y Configuración

## 📋 Variables de Entorno Necesarias

Crea un archivo `.env` en la raíz del proyecto con estas variables:

```bash
# Servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://admin:tu_password@localhost:27017/whatsapp_db?authSource=admin

# WhatsApp API
VERIFY_TOKEN=tu_verify_token_secreto

# CORS (opcional)
CORS_ORIGIN=*
LOG_LEVEL=info
```

## 🏃‍♂️ Ejecución Rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Levantar MongoDB con Docker
```bash
docker-compose up -d
```

### 3. Iniciar el microservicio
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 🔧 Endpoints Principales

### **Webhook de WhatsApp**
- **GET** `/meta` - Verificación del webhook
- **POST** `/meta` - Recepción de mensajes

### **API REST**
- **GET** `/health` - Estado del servicio
- **GET** `/` - Información general

### **WebSocket**
- **Conexión**: `ws://localhost:3000`
- **Eventos**: `new_message`, `message_status`, `chat_updated`

## 📡 Conexión desde tu CRM

### Ejemplo de conexión WebSocket:

```javascript
const socket = io('ws://localhost:3000');

// Autenticación
socket.emit('authenticate', { 
  token: 'tu_token', 
  clientId: 'tu_crm' 
});

// Suscribirse a un chat
socket.emit('subscribe_chat', 'numero_telefono');

// Escuchar mensajes nuevos
socket.on('new_message', (data) => {
  console.log('Nuevo mensaje:', data);
  // Procesar en tu CRM
});

// Obtener lista de chats
socket.emit('get_chat_list', { limit: 20 });

// Obtener mensajes de un chat
socket.emit('get_chat_messages', { 
  chatId: 'numero_telefono', 
  limit: 50 
});
```

## 🗃️ Estructura de Datos

### Mensaje guardado en MongoDB:
```json
{
  "messageId": "wamid.xxx",
  "chatId": "5491234567890",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "from": "5491234567890",
  "type": "text",
  "content": {
    "text": { "body": "Hola!" },
    "type": "text"
  },
  "rawWebhook": { /* webhook completo */ },
  "status": "received"
}
```

### Evento WebSocket:
```json
{
  "type": "new_message",
  "chatId": "5491234567890",
  "data": { /* mensaje completo */ },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## ⚡ Funcionalidades Implementadas

- ✅ **Recepción de webhooks** de WhatsApp
- ✅ **Almacenamiento en MongoDB** (mensajes y chats)
- ✅ **WebSockets en tiempo real** para CRM
- ✅ **Procesamiento de todos los tipos** de mensajes
- ✅ **Estados de mensaje** (enviado, entregado, leído)
- ✅ **Gestión de chats** y participantes
- ✅ **API REST** para consultas
- ✅ **Interfaces TypeScript** oficiales de WhatsApp

## 🔮 Próximos Pasos

1. **Envío de mensajes** - Implementar API para enviar mensajes
2. **Autenticación** - JWT para WebSocket
3. **Rate limiting** - Para proteger la API
4. **Logs estructurados** - Winston o similar
5. **Tests** - Jest para testing
6. **Deployment** - Docker en producción

## 🆘 Troubleshooting

### MongoDB no conecta:
```bash
# Verificar que Docker esté corriendo
docker ps

# Reiniciar MongoDB
docker-compose restart mongodb
```

### Webhook no recibe mensajes:
1. Verificar `VERIFY_TOKEN` en `.env`
2. Comprobar URL del webhook en Meta
3. Revisar logs del microservicio

### WebSocket no conecta:
1. Verificar puerto 3000 disponible
2. Comprobar CORS si es cross-origin
3. Revisar autenticación 