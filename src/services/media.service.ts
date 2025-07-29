// import fs from 'fs/promises';
// import path from 'path';
// import crypto from 'crypto';
// import { config } from '../config/config';

// interface MediaMetadata {
//   id: string;
//   mimeType: string;
//   sha256: string;
//   caption?: string;
//   originalUrl?: string;
// }

// interface ProcessedFile {
//   originalPath: string;
//   thumbnailPath?: string;
//   mediumPath?: string;
//   fileSize: number;
//   dimensions?: { width: number; height: number };
// }

// interface MediaDocument {
//   _id?: string;
//   mediaId: string;
//   originalName: string;
//   mimeType: string;
//   fileSize: number;
//   sha256: string;
//   localPaths: {
//     original: string;
//     thumbnail?: string;
//     medium?: string;
//   };
//   publicUrls: {
//     original: string;
//     thumbnail?: string;
//     medium?: string;
//   };
//   metadata?: any;
//   uploadedAt: Date;
//   accessCount: number;
// }

// export class MediaService {
//   private readonly STORAGE_BASE = '/var/media-storage';
//   private readonly PUBLIC_BASE_URL = process.env.MEDIA_BASE_URL || 'http://localhost:3000/media';

//   constructor() {
//     this.ensureStorageDirectories();
//   }

//   /**
//    * 📥 Descarga archivo desde WhatsApp y lo procesa completamente
//    */
//   async downloadAndStoreMedia(
//     mediaId: string, 
//     accessToken: string, 
//     metadata: MediaMetadata
//   ): Promise<MediaDocument> {
//     try {
//       console.log(`📥 Descargando media ${mediaId}...`);

//       // 1. Obtener URL de descarga desde WhatsApp Graph API
//       const downloadUrl = await this.getWhatsAppMediaUrl(mediaId, accessToken);
      
//       // 2. Descargar el archivo
//       const fileBuffer = await this.downloadFile(downloadUrl, accessToken);
      
//       // 3. Validar integridad del archivo
//       await this.validateFileIntegrity(fileBuffer, metadata.sha256);
      
//       // 4. Generar rutas de almacenamiento
//       const storagePaths = this.generateStoragePaths(metadata);
      
//       // 5. Procesar archivo según tipo
//       const processedFile = await this.processFile(fileBuffer, metadata, storagePaths);
      
//       // 6. Generar URLs públicas
//       const publicUrls = this.generatePublicUrls(processedFile);
      
//       // 7. Crear documento de metadatos
//       const mediaDocument: MediaDocument = {
//         mediaId,
//         originalName: `${mediaId}.${this.getFileExtension(metadata.mimeType)}`,
//         mimeType: metadata.mimeType,
//         fileSize: fileBuffer.length,
//         sha256: metadata.sha256,
//         localPaths: {
//           original: processedFile.originalPath,
//           thumbnail: processedFile.thumbnailPath,
//           medium: processedFile.mediumPath
//         },
//         publicUrls,
//         metadata: {
//           caption: metadata.caption,
//           originalWhatsAppUrl: metadata.originalUrl,
//           dimensions: processedFile.dimensions
//         },
//         uploadedAt: new Date(),
//         accessCount: 0
//       };

//       // 8. Guardar metadatos en base de datos
//       await this.saveMetadataToDatabase(mediaDocument);

//       console.log(`✅ Media ${mediaId} procesado y almacenado exitosamente`);
//       return mediaDocument;

//     } catch (error) {
//       console.error(`❌ Error procesando media ${mediaId}:`, error);
//       throw error;
//     }
//   }

//   /**
//    * 🔗 Obtiene URL de descarga desde WhatsApp Graph API
//    */
//   private async getWhatsAppMediaUrl(mediaId: string, accessToken: string): Promise<string> {
//     try {
//       const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
//         headers: {
//           'Authorization': `Bearer ${accessToken}`
//         }
//       });

//       if (!response.ok) {
//         throw new Error(`Error obteniendo URL de media: ${response.status} ${response.statusText}`);
//       }

//       const data = await response.json();
//       return data.url;
//     } catch (error) {
//       console.error('Error obteniendo URL de WhatsApp:', error);
//       throw error;
//     }
//   }

//   /**
//    * ⬇️ Descarga archivo desde URL
//    */
//   private async downloadFile(url: string, accessToken: string): Promise<Buffer> {
//     try {
//       const response = await fetch(url, {
//         headers: {
//           'Authorization': `Bearer ${accessToken}`
//         }
//       });

//       if (!response.ok) {
//         throw new Error(`Error descargando archivo: ${response.status} ${response.statusText}`);
//       }

//       const arrayBuffer = await response.arrayBuffer();
//       return Buffer.from(arrayBuffer);
//     } catch (error) {
//       console.error('Error descargando archivo:', error);
//       throw error;
//     }
//   }

//   /**
//    * 🔍 Valida integridad del archivo usando SHA256
//    */
//   private async validateFileIntegrity(fileBuffer: Buffer, expectedSha256: string): Promise<void> {
//     const hash = crypto.createHash('sha256').update(fileBuffer).digest('base64');
    
//     if (hash !== expectedSha256) {
//       throw new Error('Integridad del archivo comprometida: SHA256 no coincide');
//     }
//   }

//   /**
//    * 📁 Genera rutas de almacenamiento organizadas por fecha
//    */
//   private generateStoragePaths(metadata: MediaMetadata): any {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
    
//     const fileType = this.getFileType(metadata.mimeType);
//     const extension = this.getFileExtension(metadata.mimeType);
//     const filename = `${metadata.id}.${extension}`;
    
//     const basePath = path.join(this.STORAGE_BASE, fileType, year.toString(), month, day);
    
//     return {
//       basePath,
//       original: path.join(basePath, 'original', filename),
//       thumbnail: path.join(basePath, 'thumbnails', filename),
//       medium: path.join(basePath, 'medium', filename)
//     };
//   }

//   /**
//    * 🖼️ Procesa archivo según tipo (imagen, documento, etc.)
//    */
//   private async processFile(
//     fileBuffer: Buffer, 
//     metadata: MediaMetadata, 
//     storagePaths: any
//   ): Promise<ProcessedFile> {
//     // Crear directorios necesarios
//     await this.ensureDirectoryExists(path.dirname(storagePaths.original));
    
//     // Guardar archivo original
//     await fs.writeFile(storagePaths.original, fileBuffer);
    
//     const result: ProcessedFile = {
//       originalPath: storagePaths.original,
//       fileSize: fileBuffer.length
//     };

//     // Procesamiento específico por tipo
//     if (metadata.mimeType.startsWith('image/')) {
//       await this.processImage(fileBuffer, storagePaths, result);
//     }
//     // Aquí se pueden agregar más tipos: audio, video, documento
    
//     return result;
//   }

//   /**
//    * 🖼️ Procesamiento específico de imágenes
//    */
//   private async processImage(
//     imageBuffer: Buffer, 
//     storagePaths: any, 
//     result: ProcessedFile
//   ): Promise<void> {
//     try {
//       // NOTA: Necesitarás instalar 'sharp' para procesamiento de imágenes
//       // npm install sharp @types/sharp
      
//       // Por ahora, copio el archivo sin procesar
//       // En el futuro aquí irían los thumbnails y redimensionamiento
      
//       await this.ensureDirectoryExists(path.dirname(storagePaths.thumbnail));
//       await this.ensureDirectoryExists(path.dirname(storagePaths.medium));
      
//       // Copiar como thumbnail y medium por ahora
//       await fs.writeFile(storagePaths.thumbnail, imageBuffer);
//       await fs.writeFile(storagePaths.medium, imageBuffer);
      
//       result.thumbnailPath = storagePaths.thumbnail;
//       result.mediumPath = storagePaths.medium;
      
//       // TODO: Implementar redimensionamiento real con Sharp
//       result.dimensions = { width: 0, height: 0 }; // Placeholder
      
//     } catch (error) {
//       console.error('Error procesando imagen:', error);
//       // No fallar por errores de procesamiento
//     }
//   }

//   /**
//    * 🌐 Genera URLs públicas para acceder a los archivos
//    */
//   private generatePublicUrls(processedFile: ProcessedFile): any {
//     const baseUrl = this.PUBLIC_BASE_URL;
    
//     return {
//       original: this.pathToPublicUrl(processedFile.originalPath, baseUrl),
//       thumbnail: processedFile.thumbnailPath ? 
//         this.pathToPublicUrl(processedFile.thumbnailPath, baseUrl) : undefined,
//       medium: processedFile.mediumPath ? 
//         this.pathToPublicUrl(processedFile.mediumPath, baseUrl) : undefined
//     };
//   }

//   /**
//    * 🔗 Convierte ruta del sistema a URL pública
//    */
//   private pathToPublicUrl(filePath: string, baseUrl: string): string {
//     const relativePath = path.relative(this.STORAGE_BASE, filePath);
//     return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
//   }

//   /**
//    * 💾 Guarda metadatos en base de datos
//    */
//   private async saveMetadataToDatabase(mediaDocument: MediaDocument): Promise<void> {
//     // TODO: Implementar con tu modelo de MongoDB
//     // const Media = require('../models/Media');
//     // await new Media(mediaDocument).save();
    
//     console.log('📊 Metadatos guardados (placeholder):', {
//       mediaId: mediaDocument.mediaId,
//       paths: mediaDocument.localPaths
//     });
//   }

//   /**
//    * 📂 Asegura que existan los directorios base
//    */
//   private async ensureStorageDirectories(): Promise<void> {
//     const dirs = [
//       path.join(this.STORAGE_BASE, 'images'),
//       path.join(this.STORAGE_BASE, 'documents'),
//       path.join(this.STORAGE_BASE, 'audio'),
//       path.join(this.STORAGE_BASE, 'video'),
//       path.join(this.STORAGE_BASE, 'temp')
//     ];

//     for (const dir of dirs) {
//       await this.ensureDirectoryExists(dir);
//     }
//   }

//   /**
//    * 📁 Crea directorio si no existe
//    */
//   private async ensureDirectoryExists(dirPath: string): Promise<void> {
//     try {
//       await fs.access(dirPath);
//     } catch {
//       await fs.mkdir(dirPath, { recursive: true });
//     }
//   }

//   /**
//    * 🏷️ Obtiene tipo de archivo basado en MIME type
//    */
//   private getFileType(mimeType: string): string {
//     if (mimeType.startsWith('image/')) return 'images';
//     if (mimeType.startsWith('audio/')) return 'audio';
//     if (mimeType.startsWith('video/')) return 'video';
//     return 'documents';
//   }

//   /**
//    * 📄 Obtiene extensión basada en MIME type
//    */
//   private getFileExtension(mimeType: string): string {
//     const extensions: { [key: string]: string } = {
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//       'image/gif': 'gif',
//       'image/webp': 'webp',
//       'audio/mpeg': 'mp3',
//       'audio/ogg': 'ogg',
//       'video/mp4': 'mp4',
//       'application/pdf': 'pdf',
//       'application/msword': 'doc',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
//     };
    
//     return extensions[mimeType] || 'bin';
//   }

//   /**
//    * 🔍 Obtiene información de un archivo por ID
//    */
//   async getMediaInfo(mediaId: string): Promise<MediaDocument | null> {
//     // TODO: Consultar base de datos
//     // return await Media.findOne({ mediaId });
//     return null;
//   }

//   /**
//    * 🗑️ Elimina archivo y sus metadatos
//    */
//   async deleteMedia(mediaId: string): Promise<boolean> {
//     try {
//       const mediaInfo = await this.getMediaInfo(mediaId);
//       if (!mediaInfo) return false;

//       // Eliminar archivos físicos
//       const pathsToDelete = [
//         mediaInfo.localPaths.original,
//         mediaInfo.localPaths.thumbnail,
//         mediaInfo.localPaths.medium
//       ].filter(Boolean);

//       for (const filePath of pathsToDelete) {
//         try {
//           await fs.unlink(filePath as string);
//         } catch (error) {
//           console.warn(`No se pudo eliminar archivo: ${filePath}`);
//         }
//       }

//       // TODO: Eliminar de base de datos
//       // await Media.deleteOne({ mediaId });

//       return true;
//     } catch (error) {
//       console.error(`Error eliminando media ${mediaId}:`, error);
//       return false;
//     }
//   }
// }

// // Exportar instancia singleton
// export const mediaService = new MediaService();
