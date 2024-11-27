import axios from 'axios';
import 'dotenv/config';
import { getLastDate, saveTransactions } from './db/operations.js';
import dayjs from 'dayjs';

export const getToken = () =>
    axios.post(
        `${process.env['CS_IDP_BASE_URI']}/token`,
        new URLSearchParams({
            client_id: process.env['CS_CLIENT_ID'],
            client_secret: process.env['CS_CLIENT_SECRET'],
            redirect_uri: process.env['CS_OAUTH_REDIRECT_URI'],
            grant_type: 'refresh_token',
            refresh_token: process.env['CS_REFRESH_TOKEN'],
        }),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
    );

/**
 *
 * @param {*} token
 * @param {*} params
 * @returns {Promise<{
 *      accounts: Array
 * }>}
 */
export const getAccouts = async (token, params = {}) => {
    const accountsResponse = await axios.get(`${process.env['CS_API_BASE_URL']}/v3/accounts/my/accounts`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Web-Api-Key': `${process.env['CS_WEB_API_KEY']}`,
        },
        params: params,
    });

    return accountsResponse.data;
};

/**
 *
 * @param {*} token
 * @param {*} params
 * @returns {Promise<{
 *      transactions: Array
 * }>}
 */
export const getTransactons = async (token, params = {}) => {
    const { account, fromDate, toDate, size, page, sort, order } = params;

    // Exchange the authorization code for tokens
    const transactionResponse = await axios.get(
        `${process.env['CS_API_BASE_URL']}/v3/accounts/my/accounts/${account}/transactions`,
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'Web-Api-Key': `${process.env['CS_WEB_API_KEY']}`,
            },
            params: {
                fromDate,
                toDate,
                size,
                page,
                sort,
                order,
            },
        }
    );

    return transactionResponse.data;
};

export const fetchAndProcessTransactions = async (token, accountId, lastDate) => {
    let page = 0;
    let transactionsTotal = 0;
    let transactionsTotalCreated = 0;

    const fetchPage = async (page) => {
        const response = await getTransactons(token, {
            account: accountId,
            fromDate: lastDate,
            size: 200,
            sort: 'bookingDate',
            order: 'asc',
            page,
        });

        transactionsTotal += response.transactions.length;
        transactionsTotalCreated += await saveTransactions(response.transactions);
        return response.pageCount;
    };

    const pageCount = await fetchPage(page);

    for (let p = 1; p < pageCount; p++) {
        await fetchPage(p);
    }

    return {
        transactionsTotal,
        transactionsTotalCreated,
    };
};

let interval = undefined;
let isRunning = false;

export const syncTransactions = async () => {
    if (isRunning) {
        console.log(`[${new Date().toISOString()}] Running another transactions sync...`);
        return;
    }
    isRunning = true;

    console.log(`[${new Date().toISOString()}] Starting Transactions sync...`);

    try {
        const tokenResponse = await getToken();
        const token = tokenResponse.data.access_token;

        if (!token) {
            throw new Error('Token is not refreshed');
        }

        const accounts = await getAccouts(token);
        const account = accounts.accounts.find((acc) => acc.currency === 'CZK');

        if (!account) {
            throw new Error('Account is not found');
        }

        const lastDate = dayjs(await getLastDate()).format('YYYY-MM-DD');
        const { transactionsTotal, transactionsTotalCreated } = await fetchAndProcessTransactions(
            token,
            account.id,
            lastDate
        );

        console.log(
            `[${new Date().toISOString()}] Transactions sync completed: ${transactionsTotalCreated}/${transactionsTotal} transactions added.`
        );
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Transactions sync failed:`, error);
        clearInterval(interval);
    } finally {
        isRunning = false;
    }
};

const SYNC_INTERVAL = 60 * 60 * 1000; // 5 hours in ms
export const startSyncScheduler = () => {
    console.log('Starting sync scheduler...');
    interval = setInterval(syncTransactions, SYNC_INTERVAL);
    syncTransactions();
};
