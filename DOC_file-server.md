# 📡 **API REST - Servidor de Archivos Sofmar**

## 🌐 **Base URL**
```
http://localhost:4040/api/files/
# En producción: https://node.sofmar.com.py:4040/api/files/
```

---

## 🔑 **Autenticación**

Para clientes que requieren autenticación, incluir en headers:
```javascript
{
  "Authorization": "Bearer TOKEN",
  "X-Client-Id": "[nombre del cliente]" // ID del cliente
}
```

## 📤 **1. UPLOAD - Subir Archivo**

### **Endpoint**
```http
POST /api/files/upload
```

### **Headers**
```javascript
{
  "Content-Type": "multipart/form-data",
  "X-Client-Id": "acricolor" // ID del cliente
}
```

### **Body (Form Data)**
```javascript
{
  "file": [ARCHIVO_BINARIO], // Campo file con el archivo
  "folder": "whatsapp"        // OPCIONAL: Subcarpeta donde guardar
}
```

### **Ejemplo JavaScript/Fetch**
```javascript
const uploadFile = async (file, clientId, folder = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // NUEVO: Agregar subcarpeta opcionalmente
  if (folder) {
    formData.append('folder', folder);
  }
  
  const response = await fetch('http://localhost:4040/api/files/upload', {
    method: 'POST',
    headers: {
      'X-Client-Id': clientId
    },
    body: formData
  });
  
  return await response.json();
};

// Ejemplos de uso:
// uploadFile(file, 'shared', 'whatsapp')  // Guarda en shared/whatsapp/
// uploadFile(file, 'shared')              // Guarda en shared/
```

### **Respuesta Exitosa (201)**
```json
{
  "success": true,
  "data": {
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "documento.pdf",
    "fileName": "550e8400-e29b-41d4-a716-446655440000.pdf",
    "client": "acricolor",
    "folder": "whatsapp",
    "size": 1024000,
    "mimeType": "application/pdf",
    "extension": ".pdf",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "url": "/static/acricolor/whatsapp/550e8400-e29b-41d4-a716-446655440000.pdf",
    "hash": "sha256_hash_del_archivo"
  },
  "message": "Archivo subido exitosamente"
}
```

---

## 📥 **2. DOWNLOAD - Descargar Archivo**

### **Endpoint**
```http
GET /api/files/download/{fileId}
```

### **Ejemplo**
```javascript
const downloadFile = async (fileId, clientId) => {
  const response = await fetch(`http://localhost:4040/api/files/download/${fileId}`, {
    headers: {
      'X-Client-Id': clientId
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archivo'; // El nombre se obtiene del header Content-Disposition
    a.click();
  }
};
```

### **Respuesta**
- **200**: Archivo binario con headers apropiados
- **206**: Contenido parcial (para streaming)
- **404**: Archivo no encontrado

---

## 📋 **3. LIST - Listar Archivos**

### **Endpoint**
```http
GET /api/files/list/{client}
```

### **Query Parameters (Opcionales)**
```javascript
{
  "limit": 50,        // Número de archivos por página (max 1000)
  "offset": 0,        // Offset para paginación
  "sort": "uploadedAt", // Campo para ordenar: name, size, uploadedAt, extension
  "order": "desc",    // Orden: asc, desc
  "filter": "pdf",    // Filtrar por nombre o extensión
  "folder": "whatsapp" // NUEVO: Filtrar por subcarpeta específica
}
```

### **Ejemplo**
```javascript
const listFiles = async (clientId, options = {}) => {
  const params = new URLSearchParams(options);
  const response = await fetch(`http://localhost:4040/api/files/list/${clientId}?${params}`, {
    headers: {
      'X-Client-Id': clientId
    }
  });
  
  return await response.json();
};

// Ejemplos de uso:
// Listar todos los archivos
const allFiles = await listFiles('shared');

// Listar solo archivos de subcarpeta "whatsapp"
const whatsappFiles = await listFiles('shared', { folder: 'whatsapp' });

// Listar archivos PDF de subcarpeta "documentos"
const pdfFiles = await listFiles('shared', { 
  folder: 'documentos',
  filter: 'pdf',
  sort: 'uploadedAt',
  order: 'desc'
});
```

### **Respuesta Exitosa (200)**
```json
{
  "success": true,
  "data": [
    {
      "fileId": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "documento.pdf",
      "fileName": "550e8400-e29b-41d4-a716-446655440000.pdf",
      "client": "acricolor",
      "folder": "documentos",
      "size": 1024000,
      "mimeType": "application/pdf",
      "extension": ".pdf",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "url": "/static/acricolor/documentos/550e8400-e29b-41d4-a716-446655440000.pdf"
    }
  ],
  "count": 1
}
```

---

## 🗑️ **4. DELETE - Eliminar Archivo**

### **Endpoint**
```http
DELETE /api/files/{fileId}
```

### **Ejemplo**
```javascript
const deleteFile = async (fileId, clientId) => {
  const response = await fetch(`http://localhost:4040/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'X-Client-Id': clientId
    }
  });
  
  return await response.json();
};
```

### **Respuesta Exitosa (200)**
```json
{
  "success": true,
  "message": "Archivo eliminado exitosamente",
  "fileId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## ℹ️ **5. METADATA - Información del Archivo**

### **Endpoint**
```http
GET /api/files/metadata/{fileId}
```

### **Ejemplo**
```javascript
const getFileMetadata = async (fileId, clientId) => {
  const response = await fetch(`http://localhost:4040/api/files/metadata/${fileId}`, {
    headers: {
      'X-Client-Id': clientId
    }
  });
  
  return await response.json();
};
```

---

## 🔍 **6. SEARCH - Búsqueda Avanzada**

### **Endpoint**
```http
POST /api/files/search/{client}
```

### **Body**
```json
{
  "query": "documento",
  "types": ["application/pdf", "image/*"],
  "minSize": 1024,
  "maxSize": 10485760,
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

### **Ejemplo**
```javascript
const searchFiles = async (clientId, searchCriteria) => {
  const response = await fetch(`http://localhost:4040/api/files/search/${clientId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': clientId
    },
    body: JSON.stringify(searchCriteria)
  });
  
  return await response.json();
};

// Buscar PDFs grandes
const results = await searchFiles('acricolor', {
  query: 'manual',
  types: ['application/pdf'],
  minSize: 1024000 // 1MB
});
```

---

## 🌐 **7. ACCESO DIRECTO A ARCHIVOS ESTÁTICOS**

Los archivos se pueden acceder directamente vía nginx (más rápido):

### **URL Pattern**
```
http://localhost:4040/static/{client}/{filename}
```

### **Ejemplo**
```html
<!-- Mostrar imagen directamente -->
<img src="http://localhost:4040/static/acricolor/550e8400-e29b-41d4-a716-446655440000.jpg" />

<!-- Link de descarga directo -->
<a href="http://localhost:4040/static/acricolor/documento.pdf" download>Descargar PDF</a>
```

---

## 🔧 **Health Check**

### **Endpoint**
```http
GET /health
```

### **Respuesta**
```json
{
  "status": "ok",
  "service": "file-server",
  "version": "1.0.0"
}
```

---

## ⚠️ **Códigos de Error**

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido o faltante |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Archivo no encontrado |
| 413 | Payload Too Large - Archivo muy grande |
| 415 | Unsupported Media Type - Tipo no permitido |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error interno |

### **Formato de Error**
```json
{
  "success": false,
  "error": "Descripción del error",
  "code": 400
}
```

---

## 📊 **Límites por Cliente**

| Cliente | Tamaño Max | Tipos Permitidos |
|---------|------------|------------------|
| acricolor | 50MB | image/*, application/pdf, text/* |
| lobeck | 100MB | Todos los tipos |
| gaesa | 200MB | Todos los tipos |
| maderapy | 150MB | image/*, pdf, excel |
| automotorescentro | 100MB | image/*, pdf, text/* |
| ferromat | 100MB | image/*, pdf, text/* |
| shared | 10MB | image/*, pdf, text/* |

---

## 🚀 **Ejemplos de Uso Completos**

### **Subir y Listar Archivos**
```javascript
// Función completa para manejo de archivos
class FileManager {
  constructor(baseUrl, clientId) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
  }

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-Client-Id': this.clientId },
      body: formData
    });
    
    return await response.json();
  }

  async list(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseUrl}/list/${this.clientId}?${params}`, {
      headers: { 'X-Client-Id': this.clientId }
    });
    
    return await response.json();
  }

  async delete(fileId) {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE',
      headers: { 'X-Client-Id': this.clientId }
    });
    
    return await response.json();
  }
}

// Uso
const fileManager = new FileManager('http://localhost:4040/api/files', 'acricolor');

// Subir archivo
const result = await fileManager.upload(fileInput.files[0]);
console.log('Archivo subido:', result.data.url);

// Listar archivos
const files = await fileManager.list({ limit: 10, sort: 'uploadedAt', order: 'desc' });
console.log('Archivos:', files.data);
```

---

## 📁 **SUBCARPETAS - Nuevas Funcionalidades**

### **🆕 Subir archivos a subcarpetas específicas**

```bash
# Subir a shared/whatsapp/
curl -X POST \
  -H "X-Client-Id: shared" \
  -F "file=@imagen.jpg" \
  -F "folder=whatsapp" \
  http://localhost:4040/api/files/upload

# Subir a shared/documentos/
curl -X POST \
  -H "X-Client-Id: shared" \
  -F "file=@contrato.pdf" \
  -F "folder=documentos" \
  http://localhost:4040/api/files/upload

# Subir a acricolor/catalogos/ (con auth)
curl -X POST \
  -H "X-Client-Id: acricolor" \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -F "file=@catalogo.pdf" \
  -F "folder=catalogos" \
  http://localhost:4040/api/files/upload
```

### **📋 Listar archivos por subcarpeta**

```bash
# Listar todos los archivos de shared
curl "http://localhost:4040/api/files/list/shared"

# Listar solo archivos de shared/whatsapp/
curl "http://localhost:4040/api/files/list/shared?folder=whatsapp"

# Listar archivos PDF de shared/documentos/
curl "http://localhost:4040/api/files/list/shared?folder=documentos&filter=pdf"

# Listar archivos de la raíz (sin subcarpeta)
curl "http://localhost:4040/api/files/list/shared?folder="
```

### **🌐 Acceso directo a archivos en subcarpetas**

```bash
# Acceso directo via nginx (MÁS RÁPIDO)
# Estructura: /static/{cliente}/{subcarpeta}/{archivo}

# Archivo en subcarpeta
curl "http://localhost:4040/static/shared/whatsapp/uuid-imagen.jpg"

# Archivo en raíz del cliente
curl "http://localhost:4040/static/shared/uuid-archivo.pdf"
```

### **💡 Organización sugerida de subcarpetas**

```
shared/
├── whatsapp/          # Archivos de WhatsApp
├── documentos/        # Documentos oficiales
├── imagenes/          # Imágenes generales
├── contratos/         # Contratos y legales
└── temporales/        # Archivos temporales

acricolor/
├── catalogos/         # Catálogos de productos
├── fichas_tecnicas/   # Fichas técnicas
└── manuales/          # Manuales de usuario

lobeck/
├── proyectos/         # Archivos de proyectos
├── planos/           # Planos técnicos
└── reportes/         # Reportes y análisis
```

### **🔧 Reglas y limitaciones**

- ✅ **Nombres de carpeta**: Solo letras, números, guiones y guiones bajos
- ✅ **Auto-creación**: Las carpetas se crean automáticamente al subir
- ✅ **Longitud máxima**: 50 caracteres por nombre de carpeta
- ✅ **Espacios**: Se convierten automáticamente a guiones bajos
- ⚠️ **Seguridad**: Se previene path traversal (../)
- 📁 **Profundidad**: Solo 1 nivel de subcarpeta (por ahora)

### **🎯 Ejemplos prácticos de uso**

```javascript
// Organizar archivos de WhatsApp Business
const subirWhatsApp = async (archivo) => {
  return await uploadFile(archivo, 'shared', 'whatsapp');
};

// Organizar documentos por tipo
const subirContrato = async (archivo) => {
  return await uploadFile(archivo, 'shared', 'contratos');
};

// Listar solo imágenes de WhatsApp
const imagenes = await listFiles('shared', {
  folder: 'whatsapp',
  filter: 'jpg'
});

// Listar todos los PDFs de documentos
const documentos = await listFiles('shared', {
  folder: 'documentos',
  filter: 'pdf'
});
```