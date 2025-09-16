const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['unique', 'installment', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    },
    // Para gastos parcelados
    totalInstallments: {
        type: Number,
        min: 1,
        default: 1
    },
    currentInstallment: {
        type: Number,
        min: 1,
        default: 1
    },
    installmentValue: {
        type: Number,
        min: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Middleware para calcular valor da parcela
expenseSchema.pre('save', function(next) {
    if (this.type === 'installment' && this.totalInstallments > 1) {
        this.installmentValue = this.value / this.totalInstallments;
    }
    next();
});

// Índices para melhor performance
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ type: 1, isActive: 1 });
expenseSchema.index({ type: 1, currentInstallment: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
