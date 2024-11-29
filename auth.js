import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer';
import config from './config.js';

/**
 *
 * @param {{
 *  account_number: string,
 *  account_day: string,
 *  account_month: string,
 * }} credentials
 *
 * @return {Promise<{
 *  request: Promise<HTTPRequest>,
 *  page: Page,
 *  browser: Browser,
 * }>}
 */
export const authenticate = async (credentials) => {
    const browser = await puppeteer.launch({
        headless: config.headless,
        acceptInsecureCerts: config.acceptInsecureCerts,
    });
    const page = await browser.newPage();

    // Go to login page
    await page.goto(config.cs_auth_url);

    // Close cookies
    await page.waitForSelector('#tc_privacy_close');
    await page.click('#tc_privacy_close');

    // First login step: accoint number
    await page.waitForSelector('[placeholder="Klientské číslo / Uživatelské jméno"]');

    await page.type('[placeholder="Klientské číslo / Uživatelské jméno"]', credentials.account_number);
    await page.click('[type="submit"]');

    // Second login step: birthday day and month
    await page.waitForSelector('[placeholder="Den"]');

    await page.type('[placeholder="Den"]', credentials.account_day);
    await page.select('[aria-label="Vyberte měsíc svého narození"]', credentials.account_month);

    // Submit and wait for request that will share api key and authorization bearer
    await page.click('[type="submit"]');

    // Get date and auth info for client verification on device
    await page.waitForSelector('.wysiwys-value');
    const elements = await page.$$('.wysiwys-value');

    const dateAndCode = await Promise.all(
        elements.map(async (element) => {
            return await page.evaluate((el) => el.textContent, element);
        })
    );

    // Do not await for this, since we need to send auth info for client verification first.
    const response = page.waitForResponse(
        (res) => {
            return res.url() === config.cs_auth_success_request_url;
        },
        {
            timeout: config.cs_auth_timeout,
        }
    );

    return {
        response,
        auth_info: dateAndCode,
        page,
        browser,
    };
};

/**
 * @param {{
 *  account_number: string,
 *  account_day: string,
 *  account_month: string,
 * }} credentials
 *
 * @returns {Promise<{
 *  authorizationBearer: string,
 *  webApiKey: string
 * }>}
 */
export const login = async (credentials, authVerificationCb = (authInfo) => {}) => {
    const {
        response,
        auth_info: authInfo,
        browser,
        page,
    } = await authenticate({
        account_number: credentials.account_number,
        account_day: credentials.account_day,
        account_month: credentials.account_month,
    });

    // Send `auth_info` somewhere to verify if app is trying to auth and nobody else.
    if (typeof authVerificationCb === 'function') {
        authVerificationCb(authInfo);
    }

    const res = await response;
    const cookies = await page.cookies();
    const sessionCookie = cookies.find((c) => c.name === config.cs_auth_session_cookie_name);
    console.log(sessionCookie)
    // Do not forget to close browser if nothing to do after login.
    await browser.close();

    if (!sessionCookie?.value || res.status() !== 200) {
        throw new Error('OAUTH');
    }

    return sessionCookie?.value;
};
