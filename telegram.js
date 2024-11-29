import axios from 'axios';
import config from './config.js';

export const sendMessage = async (text) => {
    return axios
        .post(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
            chat_id: config.telegram_bot_chat_id,
            text,
        })
        .catch((error) => {
            console.error(`[${new Date().toISOString()}] Failed to send notification`, error);
        });
};
