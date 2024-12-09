import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
    {
        entryReference: { type: String, unique: true },
        reservationId: String,
        amount: {
            value: Number,
            currency: String,
        },
        creditDebitIndicator: String,
        status: String,
        bookingDate: {
            date: String,
        },
        valueDate: {
            date: String,
        },
        bankTransactionCode: {
            proprietary: {
                code: Number,
                issuer: String,
            },
        },
        entryDetails: mongoose.Schema.Types.Mixed,
        synced: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const reservationSchema = new mongoose.Schema(
    {
        reservationId: { type: String, unique: true },
        amount: {
            value: Number,
            currency: String,
        },
        originalAmount: {
            value: Number,
            currency: String,
        },
        creditDebitIndicator: String,
        accountId: String,
        cardId: String,
        startDateTime: String,
        expirationDate: String,
        reservationState: String,
        reservationType: String,
        cardholderName: String,
        maskedPAN: String,
        terminalId: String,
        merchantInfo: mongoose.Schema.Types.Mixed,
        synced: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Reservation = mongoose.model('Reservation', reservationSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
