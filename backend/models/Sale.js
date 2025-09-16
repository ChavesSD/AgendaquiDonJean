const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    posMachine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PosMachine',
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    professional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Professional',
        required: true
    },
    professionalCommission: {
        type: Number,
        required: true,
        min: 0
    },
    posRate: {
        type: Number,
        required: true,
        min: 0
    },
    posFee: {
        type: Number,
        required: true,
        min: 0
    },
    netProfit: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware para calcular valores automaticamente
saleSchema.pre('save', function(next) {
    if (this.isNew) {
        // Calcular taxa da maquininha
        this.posFee = (this.value * this.posRate) / 100;
        
        // Calcular lucro líquido
        this.netProfit = this.value - this.posFee - this.professionalCommission;
    }
    next();
});

// Índices para melhor performance
saleSchema.index({ user: 1, date: -1 });
saleSchema.index({ posMachine: 1, date: -1 });
saleSchema.index({ professional: 1, date: -1 });

module.exports = mongoose.model('Sale', saleSchema);
