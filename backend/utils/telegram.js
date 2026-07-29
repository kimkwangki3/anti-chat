const axios = require('axios');

// 회원 메시지 텔레그램 전달 (전체 하나로 받기).
// .env에 TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID 설정 시 동작. 미설정이면 아무것도 안 함(안전).
// 채팅 흐름을 막지 않도록 fire-and-forget로 호출하고, 실패해도 조용히 무시.
const sendTelegram = async (text) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
        await axios.post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            { chat_id: chatId, text, disable_web_page_preview: true },
            { timeout: 8000 }
        );
    } catch (e) {
        console.error('[Telegram] 전송 실패:', e.response?.data?.description || e.message);
    }
};

module.exports = { sendTelegram };
