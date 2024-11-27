import mongoose from 'mongoose';
import { Transaction } from './db/models.js';
import { google } from 'googleapis';
import dayjs from 'dayjs';
import 'dotenv/config';
import path from 'path';

mongoose.connect(process.env['MONGOBD_URL']);

export const authorizeGoogleSheets = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.resolve('./service-account-key-gs.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
};

export const getUnsyncedTransactions = async () => {
    return Transaction.find({ synced: false }).limit(1000).lean();
};

export const markTransactionsAsSynced = async (transactions) => {
    const ids = transactions.map((tx) => tx._id);
    await Transaction.updateMany({ _id: { $in: ids } }, { $set: { synced: true } });
};

export const appendToGoogleSheet = async (auth, sheetName, rows) => {
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
        spreadsheetId: process.env['G_SPREADSHEET_ID'],
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: rows,
        },
    });
};

export const formatTransactionsForSheet = (transactions) => {
    return transactions.map((tx) => [
        tx.entryReference || '',
        tx.reservationId || '',
        dayjs(tx.bookingDate?.date).isValid() ? dayjs(tx.bookingDate.date).format('YYYY-MM-DD') : '',
        dayjs(tx.valueDate?.date).isValid() ? dayjs(tx.valueDate.date).format('YYYY-MM-DD') : '',
        tx.status || '',
        tx.creditDebitIndicator || '',
        tx.amount?.value || 0,
        tx.amount?.currency || '',

        tx.entryDetails?.transactionDetails?.relatedParties?.debtor?.name || '',
        tx.entryDetails?.transactionDetails?.relatedParties?.debtorAccount?.identification?.iban || '',
        tx.entryDetails?.transactionDetails?.relatedParties?.creditor?.name || '',
        tx.entryDetails?.transactionDetails?.relatedParties?.creditorAccount?.identification?.iban || '',

        tx.entryDetails?.transactionDetails?.remittanceInformation?.unstructured || '',
        tx.entryDetails?.transactionDetails?.additionalRemittanceInformation || '',
        tx.entryDetails?.transactionDetails?.additionalTransactionDescription || '',
        tx.entryDetails?.transactionDetails?.additionalTransactionInformation || '',
    ]);
};

let isGoogleSheetSyncRunning = false;
export const syncGoogleSheet = async () => {
    if (isGoogleSheetSyncRunning) {
        console.log(`[${new Date().toISOString()}] Running another Google Sheets sync...`);
        return;
    }
    isGoogleSheetSyncRunning = true;

    try {
        console.log(`[${new Date().toISOString()}] Starting Google Sheets sync...`);

        const unsyncedTransactions = await getUnsyncedTransactions();
        if (unsyncedTransactions.length === 0) {
            console.log('No unsynced transactions found.');
            return;
        }

        const auth = await authorizeGoogleSheets();
        const sheetName = process.env['G_SPREADSHEET_SHEET'];

        const rows = formatTransactionsForSheet(unsyncedTransactions);

        await appendToGoogleSheet(auth, sheetName, rows);
        await markTransactionsAsSynced(unsyncedTransactions);

        console.log(`[${new Date().toISOString()}] Google Sheets sync completed: ${rows.length} transactions added.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Google Sheets sync failed:`, error);
    } finally {
        isGoogleSheetSyncRunning = false;
    }
};

const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
export const startSyncScheduler = () => {
    console.log('Starting sync scheduler...');
    setInterval(syncGoogleSheet, SYNC_INTERVAL);
    syncGoogleSheet();
};
