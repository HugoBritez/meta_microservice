import { Router, Request, Response } from "express";
import { config } from '../config/config';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service';

const router = Router();
const webhookService = new WhatsAppWebhookService();

// Verificación del webhook de WhatsApp/Meta
router.get('/', (req: Request, res: Response) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log("✅ WEBHOOK VERIFICADO");
    res.status(200).send(challenge);
  } else {
    console.log("❌ WEBHOOK RECHAZADO - Token inválido");
    res.status(403).end();
  }
});

// Recepción de mensajes del webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`\n📥 Webhook received ${timestamp}\n`);

    // Procesar el webhook con el servicio
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

