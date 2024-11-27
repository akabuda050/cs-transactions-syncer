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

export const Transaction = mongoose.model('Transaction', transactionSchema);
