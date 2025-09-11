const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    function: {
        type: String,
        trim: true
    },
    dailyCapacity: {
        type: Number,
        default: 0,
        min: 0,
        max: 50
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'vacation', 'leave'],
        default: 'active'
    },
    photo: {
        type: String, // URL da foto ou base64
        default: null
    },
    userAccount: {
        type: Boolean,
        default: false
    },
    userEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
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

// Middleware para atualizar updatedAt
professionalSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Índices para melhor performance
professionalSchema.index({ firstName: 1, lastName: 1 });
professionalSchema.index({ status: 1 });
professionalSchema.index({ function: 1 });
professionalSchema.index({ email: 1 });

module.exports = mongoose.model('Professional', professionalSchema);
