const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    origin: {
        type: String,
        enum: ['whatsapp', 'manual', 'imported'],
        default: 'manual'
    },
    whatsappId: {
        type: String,
        unique: true,
        sparse: true // Permite múltiplos documentos sem este campo
    },
    profilePicture: {
        type: String
    },
    tags: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastInteraction: {
        type: Date,
        default: Date.now
    },
    totalAppointments: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    // Dados específicos do WhatsApp
    whatsappData: {
        isGroup: {
            type: Boolean,
            default: false
        },
        isBusiness: {
            type: Boolean,
            default: false
        },
        lastSeen: Date,
        status: String,
        isOnline: {
            type: Boolean,
            default: false
        }
    },
    // Metadados
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastSyncAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para melhor performance
contactSchema.index({ phone: 1 });
contactSchema.index({ whatsappId: 1 });
contactSchema.index({ origin: 1 });
contactSchema.index({ isActive: 1 });
contactSchema.index({ createdBy: 1 });

// Middleware para atualizar lastInteraction
contactSchema.pre('save', function(next) {
    if (this.isModified('lastInteraction')) {
        this.lastInteraction = new Date();
    }
    next();
});

// Método para formatar telefone
contactSchema.methods.formatPhone = function() {
    // Remove caracteres não numéricos
    const phone = this.phone.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona +55 (Brasil)
    if (phone.length === 11 && phone.startsWith('11')) {
        return `+55${phone}`;
    } else if (phone.length === 10) {
        return `+5511${phone}`;
    } else if (phone.length === 13 && phone.startsWith('55')) {
        return `+${phone}`;
    }
    
    return this.phone;
};

// Método para obter nome de exibição
contactSchema.methods.getDisplayName = function() {
    return this.name || this.phone;
};

// Método estático para buscar por telefone
contactSchema.statics.findByPhone = function(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return this.findOne({
        $or: [
            { phone: phone },
            { phone: cleanPhone },
            { phone: `+55${cleanPhone}` },
            { phone: `+5511${cleanPhone}` }
        ]
    });
};

module.exports = mongoose.model('Contact', contactSchema);
