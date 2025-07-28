# WhatsApp Microservice

Microservicio para integración con WhatsApp API desarrollado con Node.js, Express y TypeScript.

## 🚀 Características

- **TypeScript**: Código tipado para mayor seguridad y mantenibilidad
- **Express**: Framework web rápido y minimalista
- **Arquitectura modular**: Separación clara de responsabilidades
- **Middleware de seguridad**: Helmet, CORS y validaciones
- **Logging**: Morgan para logs de requests
- **Manejo de errores**: Middleware global para errores
- **Health checks**: Endpoints para monitoreo

## 📋 Prerrequisitos

- Node.js (versión 18 o superior)
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd whatsapp_microservice
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

## 🏃‍♂️ Desarrollo

### Scripts disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start

# Ejecutar tests
npm test

# Linting
npm run lint
```

### Estructura del proyecto

```
src/
├── config/          # Configuraciones
├── controllers/     # Controladores
├── middleware/      # Middlewares personalizados
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── types/           # Definiciones de tipos
├── utils/           # Utilidades
├── app.ts          # Configuración de Express
└── server.ts       # Punto de entrada
```

## 📡 API Endpoints

### Health Checks
- `GET /health` - Estado básico del servicio
- `GET /health/detailed` - Información detallada del servicio

### Root
- `GET /` - Información del microservicio

## 🔧 Configuración

### Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `LOG_LEVEL` | Nivel de logging | `info` |

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 📦 Build

```bash
# Compilar para producción
npm run build

# Ejecutar build compilado
npm start
```

## 🐳 Docker

```bash
# Construir imagen
docker build -t whatsapp-microservice .

# Ejecutar contenedor
docker run -p 3000:3000 whatsapp-microservice
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request # meta_microservice
