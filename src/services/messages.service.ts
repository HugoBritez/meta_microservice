import { MessageRepository } from '../repositories/messages.repositories';

export const MessageService = {
    getMessages: () => {
        return MessageRepository.getMessages();
    },

    postMessages: () => {
        return MessageRepository.postMessages();
    }
}