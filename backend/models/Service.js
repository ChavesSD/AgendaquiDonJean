const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome do serviço é obrigatório'],
        trim: true,
        maxlength: [100, 'Nome do serviço não pode ter mais de 100 caracteres']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        required: true
    },
    duration: {
        type: Number,
        required: [true, 'Duração do serviço é obrigatória'],
        min: [1, 'Duração deve ser pelo menos 1']
    },
    durationUnit: {
        type: String,
        enum: ['minutes', 'hours'],
        required: [true, 'Unidade de duração é obrigatória'],
        default: 'minutes'
    },
    price: {
        type: Number,
        required: [true, 'Preço do serviço é obrigatório'],
        min: [0, 'Preço não pode ser negativo']
    },
    commission: {
        type: Number,
        required: [true, 'Percentual de comissão é obrigatório'],
        min: [0, 'Comissão não pode ser negativa'],
        max: [100, 'Comissão não pode ser maior que 100%']
    },
    professionals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Professional'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices para melhor performance
serviceSchema.index({ name: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ createdBy: 1 });

// Virtual para calcular valor da comissão
serviceSchema.virtual('commissionValue').get(function() {
    if (!this.price || !this.commission) return 0;
    return (this.price * this.commission) / 100;
});

// Virtual para duração formatada
serviceSchema.virtual('formattedDuration').get(function() {
    if (!this.duration) return '0min';
    if (this.durationUnit === 'hours') {
        return `${this.duration}h`;
    }
    return `${this.duration}min`;
});

// Virtual para preço formatado
serviceSchema.virtual('formattedPrice').get(function() {
    if (!this.price) return 'R$ 0,00';
    return `R$ ${this.price.toFixed(2).replace('.', ',')}`;
});

// Middleware removido para evitar problemas de população

// Middleware para atualizar updatedBy antes de salvar
serviceSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedBy = this.createdBy; // Em um sistema real, seria o usuário atual
    }
    next();
});

// Método estático para buscar serviços ativos
serviceSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Método estático para buscar serviços por profissional
serviceSchema.statics.findByProfessional = function(professionalId) {
    return this.find({ 
        professionals: professionalId,
        status: 'active'
    });
};

// Método de instância para verificar se profissional pode realizar o serviço
serviceSchema.methods.canBePerformedBy = function(professionalId) {
    return this.professionals.some(prof => 
        prof._id.toString() === professionalId.toString()
    );
};

module.exports = mongoose.model('Service', serviceSchema);
