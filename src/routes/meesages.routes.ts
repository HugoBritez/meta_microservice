import { Router, Request, Response } from 'express';
import { MessageService } from '../services/messages.service';

const router = Router();

// Obtener mensajes (con filtros opcionales)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { chatId, limit = '50', offset = '0', type } = req.query;
    
    const messages = await MessageService.getMessages({
      chatId: chatId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string
    });
    
    res.json({
      success: true,
      data: messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener mensajes por chat específico
router.get('/chat/:chatId', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    
    const messages = await MessageService.getMessagesByChat(
      chatId as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({
      success: true,
      chatId,
      data: messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Error obteniendo mensajes del chat:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export const messagesRoutes = router;