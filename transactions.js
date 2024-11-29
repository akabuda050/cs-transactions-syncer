import https from 'https';
import axios from 'axios';
import { getLastDate, saveTransactions } from './db/operations.js';
import dayjs from 'dayjs';
import config from './config.js';
import { login } from './auth.js';
import { sendMessage } from './telegram.js';

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
});

let sessionCookie = '';

/**
 *
 * @param {*} params
 * @returns {Promise<{
 *      accounts: Array
 * }>}
 */
export const getAccouts = async (params = {}) => {
    const accountsResponse = await axiosInstance.get(`${process.env['CS_API_BASE_URL']}/accounts`, {
        headers: {
            'Content-Type': 'application/json',
            Cookie: `${config.cs_auth_session_cookie_name}=${sessionCookie}`,
        },
        params: params,
    });

    return accountsResponse.data;
};

/**
 *
 * @param {*} params
 * @returns {Promise<{
 *      transactions: Array
 * }>}
 */
export const getTransactons = async (params = {}) => {
    const { account, fromDate, toDate, size, page, sort, order } = params;

    const transactionResponse = await axiosInstance.get(
        `${process.env['CS_API_BASE_URL']}/accounts/${account}/transactions`,
        {
            headers: {
                'Content-Type': 'application/json',
                Cookie: `${config.cs_auth_session_cookie_name}=${sessionCookie}`,
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

export const fetchAndProcessTransactions = async (accountId, lastDate) => {
    let page = 0;
    let transactionsTotal = 0;
    let transactionsTotalCreated = 0;

    const fetchPage = async (page) => {
        const response = await getTransactons({
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

export const sendVerificationCode = async (authInfo) => {
    await sendMessage(`Date: [${authInfo[0]}]\nCode: [${authInfo[1]}]`);
};

let interval = undefined;
let isRunning = false;

export const auth = async () =>
    login(
        {
            account_number: config.cs_account_number,
            account_day: config.cs_account_day,
            account_month: config.cs_account_month,
        },
        sendVerificationCode
    );

export const syncTransactions = async () => {
    if (isRunning) {
        console.log(`[${new Date().toISOString()}] Running another transactions sync...`);
        await sendMessage(`[${new Date().toISOString()}]\nRunning another transactions sync...`);
        return;
    }

    isRunning = true;

    console.log(`[${new Date().toISOString()}] Starting Transactions sync...`);
    await sendMessage(`[${new Date().toISOString()}]\nStarting Transactions sync...`);

    try {
        if (!sessionCookie) {
            sessionCookie = await auth();
        }

        const accounts = await getAccouts();
        const account = accounts.accounts.find((acc) => acc.currency === 'CZK');

        if (!account) {
            throw new Error('Account is not found', {
                cause: 'account_not_found',
            });
        }

        const lastDate = dayjs(await getLastDate()).format('YYYY-MM-DD');
        const { transactionsTotal, transactionsTotalCreated } = await fetchAndProcessTransactions(account.id, lastDate);

        console.log(
            `[${new Date().toISOString()}] Transactions sync completed: ${transactionsTotalCreated}/${transactionsTotal} transactions added.`
        );
        await sendMessage(
            `[${new Date().toISOString()}]\nTransactions sync completed: ${transactionsTotalCreated}/${transactionsTotal} transactions added.`
        );
    } catch (error) {
        sessionCookie = '';
        clearInterval(interval);

        if (error?.cause === 'account_not_found') {
            console.error(`[${new Date().toISOString()}] Exiting transactions sync because accounts not found:`, error);
            await sendMessage(`[${new Date().toISOString()}]\nExiting transactions sync because accounts not found.`);

            process.exit(1);
        }

        console.error(`[${new Date().toISOString()}] Restarting do to transactions sync failed:`, error);
        await sendMessage(`[${new Date().toISOString()}]\nTransactions sync failed because auth failed. Restarting...`);

        isRunning = false;

        setTimeout(() => {
            startSyncScheduler();
        }, process.env['RESTART_DELAY']); // restart in 3 minutes

        return;
    } finally {
        isRunning = false;
    }
};

const SYNC_INTERVAL = process.env['SYNC_INTERVAL'];
export const startSyncScheduler = async () => {
    console.log('Starting sync scheduler...');

    interval = setInterval(syncTransactions, SYNC_INTERVAL);
    syncTransactions();
};
