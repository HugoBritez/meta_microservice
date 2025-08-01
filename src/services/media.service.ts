import crypto from 'crypto';

interface MediaMetadata {
  id: string;
  mimeType: string;
  sha256: string;
  caption?: string;
}

interface FileServerResponse {
  success: boolean;
  data: {
    fileId: string;
    originalName: string;
    fileName: string;
    client: string;
    folder: string;
    size: number;
    mimeType: string;
    extension: string;
    uploadedAt: string;
    url: string;
    hash: string;
  };
  message: string;
}

interface ProcessedMediaFile {
  whatsappMediaId: string;
  fileServerId: string;
  originalName: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  sha256: string;
  caption?: string | undefined;
  uploadedAt: Date;
}

export class MediaService {
  private readonly FILE_SERVER_URL = process.env.FILE_SERVER_URL || 'https://node.sofmar.com.py:4040';
  private readonly FILE_SERVER_CLIENT = 'shared'; // Cliente para archivos de WhatsApp
  private readonly WHATSAPP_FOLDER = 'whatsapp'; // Subcarpeta para archivos de WhatsApp

  /**
   * 🚀 Procesa archivo multimedia desde WhatsApp
   * Descarga → Sube al servidor de archivos → Devuelve URLs
   */
  async processWhatsAppMedia(
    mediaId: string,
    accessToken: string,
    metadata: MediaMetadata
  ): Promise<ProcessedMediaFile> {
    try {
      console.log(`📥 Procesando media de WhatsApp: ${mediaId}`);

      // 1. Obtener URL de descarga desde WhatsApp
      const downloadUrl = await this.getWhatsAppMediaUrl(mediaId, accessToken);
      
      // 2. Descargar archivo desde WhatsApp
      const fileBuffer = await this.downloadFile(downloadUrl, accessToken);
      
      // 3. Validar integridad
      this.validateFileIntegrity(fileBuffer, metadata.sha256);
      
      // 4. Subir al servidor de archivos
      const uploadResult = await this.uploadToFileServer(fileBuffer, metadata);
      
      // 5. Crear resultado procesado
      const processedFile: ProcessedMediaFile = {
        whatsappMediaId: mediaId,
        fileServerId: uploadResult.data.fileId,
        originalName: uploadResult.data.originalName,
        mimeType: uploadResult.data.mimeType,
        size: uploadResult.data.size,
        publicUrl: `${this.FILE_SERVER_URL}${uploadResult.data.url}`,
        sha256: metadata.sha256,
        caption: metadata.caption,
        uploadedAt: new Date(uploadResult.data.uploadedAt)
      };

      console.log(`✅ Media procesado exitosamente: ${processedFile.publicUrl}`);
      return processedFile;

    } catch (error) {
      console.error(`❌ Error procesando media ${mediaId}:`, error);
      throw error;
    }
  }

  /**
   * 🔗 Obtiene URL de descarga desde WhatsApp Graph API
   */
  private async getWhatsAppMediaUrl(mediaId: string, accessToken: string): Promise<string> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'WhatsApp-Microservice/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo URL de media: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (!data.url) {
        throw new Error('URL de descarga no encontrada en respuesta de WhatsApp');
      }

      return data.url;
    } catch (error) {
      console.error('Error obteniendo URL de WhatsApp:', error);
      throw error;
    }
  }

  /**
   * ⬇️ Descarga archivo desde URL de WhatsApp
   */
  private async downloadFile(url: string, accessToken: string): Promise<Buffer> {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'WhatsApp-Microservice/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length === 0) {
        throw new Error('Archivo descargado está vacío');
      }

      return buffer;
    } catch (error) {
      console.error('Error descargando archivo:', error);
      throw error;
    }
  }

  /**
   * 🔍 Valida integridad del archivo usando SHA256
   */
  private validateFileIntegrity(fileBuffer: Buffer, expectedSha256: string): void {
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('base64');
    
    if (hash !== expectedSha256) {
      throw new Error(`Integridad comprometida. Esperado: ${expectedSha256}, Obtenido: ${hash}`);
    }
  }

  /**
   * 📤 Sube archivo al servidor de archivos
   */
  private async uploadToFileServer(fileBuffer: Buffer, metadata: MediaMetadata): Promise<FileServerResponse> {
    try {
      // Crear FormData para el upload
      const formData = new FormData();

      // Crear blob del archivo
      const blob = new Blob([fileBuffer], { type: metadata.mimeType });
      const filename = `${metadata.id}.${this.getFileExtension(metadata.mimeType)}`;
      
      formData.append('file', blob, filename);
      formData.append('folder', this.WHATSAPP_FOLDER);

      // Upload al servidor de archivos
      const response = await fetch(`${this.FILE_SERVER_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'X-Client-Id': this.FILE_SERVER_CLIENT
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error subiendo archivo: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as FileServerResponse;
      
      if (!result.success) {
        throw new Error(`Upload falló: ${result.message || 'Error desconocido'}`);
      }

      return result;
    } catch (error) {
      console.error('Error subiendo archivo al servidor:', error);
      throw error;
    }
  }

  /**
   * 📄 Obtiene extensión basada en MIME type
   */
  private getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt'
    };
    
    return extensions[mimeType] || 'bin';
  }

  /**
   * 🔍 Obtiene información de archivo desde el servidor
   */
  async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${this.FILE_SERVER_URL}/api/files/metadata/${fileId}`, {
        headers: {
          'X-Client-Id': this.FILE_SERVER_CLIENT
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo info de archivo:', error);
      return null;
    }
  }

  /**
   * 🗑️ Elimina archivo del servidor
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.FILE_SERVER_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'X-Client-Id': this.FILE_SERVER_CLIENT
        }
      });

      if (response.ok) {
        const result: any = await response.json();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      return false;
    }
  }

  /**
   * 📋 Lista archivos de WhatsApp desde el servidor
   */
  async listWhatsAppFiles(limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const params = new URLSearchParams({
        folder: this.WHATSAPP_FOLDER,
        limit: limit.toString(),
        offset: offset.toString(),
        sort: 'uploadedAt',
        order: 'desc'
      });

      const response = await fetch(
        `${this.FILE_SERVER_URL}/api/files/list/${this.FILE_SERVER_CLIENT}?${params}`,
        {
          headers: {
            'X-Client-Id': this.FILE_SERVER_CLIENT
          }
        }
      );

      if (response.ok) {
        return await response.json();
      }

      return { success: false, data: [], count: 0 };
    } catch (error) {
      console.error('Error listando archivos:', error);
      return { success: false, data: [], count: 0 };
    }
  }

  /**
   * 🌐 Genera URL pública completa para acceso directo
   */
  generatePublicUrl(relativePath: string): string {
    // El servidor de archivos devuelve URLs como: /static/shared/whatsapp/filename.jpg
    return `${this.FILE_SERVER_URL}${relativePath}`;
  }
}

// Exportar instancia singleton
export const mediaService = new MediaService();