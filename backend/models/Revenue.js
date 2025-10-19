const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['unique', 'fixed', 'agendamento', 'comissao'],
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    professionalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Professional'
    }
}, {
    timestamps: true
});

// Índices para melhor performance
revenueSchema.index({ user: 1, date: -1 });
revenueSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model('Revenue', revenueSchema);
