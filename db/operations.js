import mongoose from 'mongoose';
import { Reservation, Transaction } from './models.js';
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

export async function syncReservationsToMongo(reservations, accountId, cardId) {
    try {
        const reservationIds = reservations.map((res) => res.id);

        for (const res of reservations) {
            await Reservation.findOneAndUpdate(
                { reservationId: res.id },
                {
                    reservationId: res.id,
                    amount: res.reservationAmount,
                    originalAmount: res.originalReservationAmount,
                    creditDebitIndicator: res.creditDebitIndicator,
                    accountId,
                    cardId,
                    startDateTime: res.startDateTime,
                    expirationDate: res.expirationDate,
                    reservationState: res.reservationState,
                    reservationType: res.reservationType,
                    cardholderName: res.cardholderName,
                    maskedPAN: res.maskedPAN,
                    terminalId: res.terminalId,
                    merchantInfo: res.merchantInfo,
                    synced: false,
                },
                { upsert: true }
            );
        }

        const deleteResult = await Reservation.deleteMany({
            cardId,
            reservationId: { $nin: reservationIds },
        });

        console.log(
            `Processed ${reservations.length} reservations for card ${cardId}. Deleted ${deleteResult.deletedCount}.`
        );
    } catch (error) {
        console.error('Error syncing reservations to MongoDB:', error);
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
