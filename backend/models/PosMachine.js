const mongoose = require('mongoose');

const posMachineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    photo: {
        type: String,
        trim: true
    },
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
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
    }
}, {
    timestamps: true
});

// Índices para melhor performance
posMachineSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('PosMachine', posMachineSchema);
