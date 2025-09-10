const mongoose = require('mongoose');

const whatsappMessagesSchema = new mongoose.Schema({
    welcomeMessage: {
        type: String,
        default: ''
    },
    outOfHoursMessage: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para atualizar updatedAt antes de salvar
whatsappMessagesSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('WhatsAppMessages', whatsappMessagesSchema);
