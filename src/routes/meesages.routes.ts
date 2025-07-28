import { Router, Response } from 'express';
import { MessageService } from '../services/messages.service';

const router = Router();

router.get('/', ( res: Response) => {
    MessageService.getMessages();
    res.json({
        message: 'Mensajes obtenidos correctamente'
    });
});

router.post('/', ( res: Response) => {
    MessageService.postMessages();
    res.json({
        message: 'Mensaje enviado correctamente'
    });
});

export const messagesRoutes = router;