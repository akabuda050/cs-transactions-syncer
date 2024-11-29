import 'dotenv/config';

export default {
    cs_account_number: process.env['CS_AUTH_ACCOUNT_NUMBER'] || undefined,
    cs_account_day: process.env['CS_AUTH_ACCOUNT_DAY'] || undefined,
    cs_account_month: process.env['CS_AUTH_ACCOUNT_MONTH'] || undefined,
    cs_auth_url: process.env['CS_AUTH_URL'] || undefined,
    cs_auth_session_cookie_name: process.env['CS_AUTH_SESSION_COOKIE_NAME'] || undefined,
    cs_auth_success_request_url: process.env['CS_AUTH_SUCCESS_REQUEST_URL'] || undefined,
    cs_auth_timeout: process.env['CS_AUTH_TIMEOUT'] || 30 * 1000, // 30 sec
    cs_api_base_url: process.env['CS_API_BASE_URL'] || undefined,

    headless: true, // set `false` to open browser on server,
    acceptInsecureCerts: true,

    telegram_bot_token: process.env['TELEGRAM_BOT_TOKEN'] || undefined,
    telegram_bot_chat_id: process.env['TELEGRAM_CHAT_ID'] || undefined,
};
