# 📡 Notificaciones de Media Procesado

## 🎯 Descripción

Cuando un mensaje con media (imagen, audio, video, etc.) llega a través del webhook de WhatsApp, el sistema:

1. **Guarda el mensaje inmediatamente** con estado `pending`
2. **Procesa el media asíncronamente** (descarga → sube al servidor de archivos)
3. **Notifica al frontend** cuando el media está listo para usar

## 🔄 Flujo Completo

### 1. Mensaje llega (inmediato)
```javascript
// El frontend recibe el mensaje con:
{
  _id: "688bc40fe72879f9e003aece",
  content: {
    media: {
      status: "pending",
      downloadUrl: null,
      localUrls: null
    }
  }
}
```

### 2. Procesamiento asíncrono (en segundo plano)
```
📥 Procesando media de WhatsApp: 673628782393527
✅ Media procesado exitosamente: http://host.docker.internal:4040/static/shared/whatsapp/5fc83d39-b06a-4202-ad7f-eff7865cac6d.jpg
```

### 3. Notificación WebSocket (cuando termina)
```javascript
// El backend envía:
{
  event: 'media-processed',
  data: {
    messageId: "688bc40fe72879f9e003aece",
    chatId: "595982373124",
    media: {
      status: "processed",
      downloadUrl: "http://host.docker.internal:4040/static/shared/whatsapp/5fc83d39-b06a-4202-ad7f-eff7865cac6d.jpg",
      localUrls: {
        original: "http://host.docker.internal:4040/static/shared/whatsapp/5fc83d39-b06a-4202-ad7f-eff7865cac6d.jpg",
        fileServerId: "5fc83d39-b06a-4202-ad7f-eff7865cac6d"
      },
      processedAt: "2025-07-31T19:32:46.863Z",
      fileSize: 12345,
      mimeType: "image/jpeg"
    }
  }
}
```

## 🛠️ Implementación en el Frontend

### React/TypeScript Example

```typescript
// hooks/useMediaNotifications.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';

interface MediaData {
  messageId: string;
  chatId: string;
  media: {
    status: 'processed';
    downloadUrl: string;
    localUrls: {
      original: string;
      fileServerId: string;
    };
    processedAt: string;
    fileSize: number;
    mimeType: string;
  };
}

export const useMediaNotifications = (
  onMediaProcessed: (data: MediaData) => void
) => {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleMediaProcessed = (data: MediaData) => {
      console.log('📸 Media procesado:', data);
      onMediaProcessed(data);
    };

    socket.on('media-processed', handleMediaProcessed);

    return () => {
      socket.off('media-processed', handleMediaProcessed);
    };
  }, [socket, onMediaProcessed]);
};
```

### Componente de Chat

```typescript
// components/Chat.tsx
import { useState, useCallback } from 'react';
import { useMediaNotifications } from '../hooks/useMediaNotifications';

interface Message {
  _id: string;
  content: {
    media?: {
      status: 'pending' | 'processed' | 'error';
      downloadUrl?: string;
      localUrls?: any;
    };
  };
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleMediaProcessed = useCallback((data: MediaData) => {
    setMessages(prev => prev.map(msg => 
      msg._id === data.messageId 
        ? { 
            ...msg, 
            content: { 
              ...msg.content, 
              media: data.media 
            }
          }
        : msg
    ));
  }, []);

  useMediaNotifications(handleMediaProcessed);

  const renderMessage = (message: Message) => {
    if (message.content.media?.status === 'processed') {
      return (
        <div className="media-message">
          <img 
            src={message.content.media.downloadUrl} 
            alt="Media" 
            className="media-image"
          />
        </div>
      );
    } else if (message.content.media?.status === 'pending') {
      return (
        <div className="media-message pending">
          <div className="loading-spinner">⏳</div>
          <span>Procesando imagen...</span>
        </div>
      );
    } else if (message.content.media?.status === 'error') {
      return (
        <div className="media-message error">
          <span>❌ Error procesando media</span>
        </div>
      );
    }
    
    return <div>Mensaje de texto</div>;
  };

  return (
    <div className="chat">
      {messages.map(message => (
        <div key={message._id} className="message">
          {renderMessage(message)}
        </div>
      ))}
    </div>
  );
};
```

### Vue.js Example

```javascript
// composables/useMediaNotifications.js
import { ref, onMounted, onUnmounted } from 'vue';
import { useSocket } from './useSocket';

export function useMediaNotifications() {
  const socket = useSocket();
  const processedMedia = ref(new Map());

  const handleMediaProcessed = (data) => {
    console.log('📸 Media procesado:', data);
    processedMedia.value.set(data.messageId, data.media);
  };

  onMounted(() => {
    if (socket) {
      socket.on('media-processed', handleMediaProcessed);
    }
  });

  onUnmounted(() => {
    if (socket) {
      socket.off('media-processed', handleMediaProcessed);
    }
  });

  return {
    processedMedia
  };
}
```

## 🎨 Estados Visuales

### Estados del Media

1. **`pending`** - Media en procesamiento
   ```html
   <div class="media-pending">
     <div class="spinner">⏳</div>
     <span>Procesando imagen...</span>
   </div>
   ```

2. **`processed`** - Media listo para mostrar
   ```html
   <div class="media-processed">
     <img src="[downloadUrl]" alt="Media" />
   </div>
   ```

3. **`error`** - Error en procesamiento
   ```html
   <div class="media-error">
     <span>❌ Error procesando media</span>
   </div>
   ```

## 🔧 Configuración

### Variables de Entorno

```env
# Configurar phone_number_id para cada tenant
SOFMAR_PHONE_NUMBER_ID=769414586246354
LOBECK_PHONE_NUMBER_ID=your_phone_number_id
```

### Configuración de Tenants

```typescript
// config/config.ts
tenants: {
  sofmar: {
    name: "Sofmar Principal",
    host: "sofmar.com.py",
    isActive: true,
    phoneNumberId: "769414586246354", // ⭐ WhatsApp Phone Number ID
  },
  lobeck: {
    name: "Lobeck",
    host: "lobeck.sofmar.com.py",
    isActive: true,
    phoneNumberId: "your_phone_number_id", // ⭐ Configurar
  }
}
```

## 🚀 Beneficios

✅ **Experiencia de usuario fluida** - Los mensajes aparecen inmediatamente
✅ **Actualización en tiempo real** - Las imágenes aparecen cuando están listas
✅ **No bloquea la UI** - El procesamiento es asíncrono
✅ **Eficiente** - No hay polling innecesario
✅ **Escalable** - Funciona con múltiples tenants

## 🔍 Debugging

### Logs del Backend
```
📥 Procesando media de WhatsApp: 673628782393527
✅ Media procesado exitosamente: http://host.docker.internal:4040/static/shared/whatsapp/5fc83d39-b06a-4202-ad7f-eff7865cac6d.jpg
📊 Media procesado notificado para mensaje 688bc40fe72879f9e003aece en tenant sofmar
```

### Verificar en el Frontend
```javascript
// En la consola del navegador
socket.on('media-processed', (data) => {
  console.log('📸 Media procesado recibido:', data);
});
``` 