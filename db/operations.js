import mongoose from 'mongoose';
import { Transaction } from './models.js';
import dayjs from 'dayjs';
import 'dotenv/config';

mongoose.connect(process.env['MONGOBD_URL']);

export async function saveTransactions(transactions) {
    try {
        let newCreated = 0;
        for (const tx of transactions) {
            const existingTransaction = await Transaction.findOne({ entryReference: tx.entryReference });
            if (!existingTransaction) {
                await Transaction.create({
                    ...tx,
                    synced: false,
                });
                newCreated++;
            }
        }

        return newCreated;
    } catch (error) {
        console.error('Error saving transactions:', error);
        throw error;
    }
}

export const getLastTransactionDate = async () => {
    try {
        const lastTransaction = await Transaction.findOne().sort({ bookingDate: -1 }).select('bookingDate');

        return lastTransaction &&
            lastTransaction?.bookingDate?.date &&
            dayjs(lastTransaction?.bookingDate?.date).isValid()
            ? lastTransaction?.bookingDate?.date
            : null;
    } catch (error) {
        console.error('Error fetching the last transaction date:', error);
        return null;
    }
};

export async function getLastDate() {
    const lastDateRecord = await getLastTransactionDate();
    return lastDateRecord ? lastDateRecord : '2022-12-01';
}
