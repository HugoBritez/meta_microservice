#!/bin/bash
# Backup simple de MongoDB

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="whatsapp_backup_$DATE"

echo "🔄 Creando backup: $BACKUP_NAME"

# Crear backup dentro del contenedor
docker exec whatsapp-mongodb mongodump \
  --username admin \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --db whatsapp_db \
  --out /backups/$BACKUP_NAME

echo "✅ Backup creado en: ./backups/$BACKUP_NAME"