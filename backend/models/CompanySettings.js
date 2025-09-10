const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
    // Dados da Empresa
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    cnpj: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    cep: {
        type: String,
        required: true,
        trim: true
    },
    street: {
        type: String,
        required: true,
        trim: true
    },
    number: {
        type: String,
        required: true,
        trim: true
    },
    neighborhood: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    
    // Horário de Funcionamento
    workingHours: {
        weekdays: {
            open: {
                type: String,
                required: true,
                default: '08:00'
            },
            close: {
                type: String,
                required: true,
                default: '18:00'
            }
        },
        saturday: {
            enabled: {
                type: Boolean,
                default: true
            },
            open: {
                type: String,
                default: '08:00'
            },
            close: {
                type: String,
                default: '12:00'
            }
        },
        sunday: {
            enabled: {
                type: Boolean,
                default: false
            },
            open: {
                type: String,
                default: '08:00'
            },
            close: {
                type: String,
                default: '12:00'
            }
        }
    },
    
    // Metadados
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
companySettingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
