import { Router, Request, Response } from "express";
import { config } from '../config/config';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service';

const router = Router();
const webhookService = new WhatsAppWebhookService();

// Verificación del webhook de WhatsApp/Meta
router.get('/', (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  // ⭐ NUEVO: Usar verify token del tenant
  const verifyToken = req.tenant?.verifyToken || config.verifyToken;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log(`✅ WEBHOOK VERIFICADO para tenant: ${req.tenant?.id || 'unknown'}`);
    res.status(200).send(challenge);
  } else {
    console.log(`❌ WEBHOOK RECHAZADO - Token inválido para tenant: ${req.tenant?.id || 'unknown'}`);
    res.status(403).end();
  }
});

// Recepción de mensajes del webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`\n📥 Webhook received ${timestamp} para tenant: ${req.tenant?.id || 'unknown'}\n`);

    // ⭐ NUEVO: Pasar información del tenant al servicio
    await webhookService.processWebhook(req.body);
    
    // Siempre responder 200 para confirmar recepción
    res.status(200).end();
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    // Aún así responder 200 para evitar reintentos de Meta
    res.status(200).end();
  }
});

export const metaApiRoutes = router;

