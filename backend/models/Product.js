const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome do produto é obrigatório'],
        trim: true,
        maxlength: [100, 'Nome do produto não pode ter mais de 100 caracteres']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
    },
    photo: {
        type: String, // URL da foto ou base64
        default: null
    },
    quantity: {
        type: Number,
        required: [true, 'Quantidade é obrigatória'],
        min: [0, 'Quantidade não pode ser negativa'],
        default: 0
    },
    minQuantity: {
        type: Number,
        min: [0, 'Quantidade mínima não pode ser negativa'],
        default: 0
    },
    maxQuantity: {
        type: Number,
        min: [0, 'Quantidade máxima não pode ser negativa'],
        default: 1000
    },
    unit: {
        type: String,
        enum: ['unidade', 'kg', 'g', 'litro', 'ml', 'metro', 'cm', 'caixa', 'pacote'],
        default: 'unidade'
    },
    category: {
        type: String,
        trim: true,
        maxlength: [50, 'Categoria não pode ter mais de 50 caracteres']
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'out_of_stock'],
        default: 'active'
    },
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
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ createdBy: 1 });

// Virtual para status do estoque
productSchema.virtual('stockStatus').get(function() {
    if (this.quantity <= 0) {
        return 'out_of_stock';
    } else if (this.quantity <= this.minQuantity) {
        return 'low_stock';
    } else if (this.quantity >= this.maxQuantity) {
        return 'overstock';
    }
    return 'normal';
});

// Virtual para texto do status do estoque
productSchema.virtual('stockStatusText').get(function() {
    const statusMap = {
        'out_of_stock': 'Sem Estoque',
        'low_stock': 'Estoque Baixo',
        'normal': 'Normal',
        'overstock': 'Estoque Alto'
    };
    return statusMap[this.stockStatus] || 'Desconhecido';
});

// Virtual para cor do status
productSchema.virtual('stockStatusColor').get(function() {
    const colorMap = {
        'out_of_stock': '#e74c3c',
        'low_stock': '#f39c12',
        'normal': '#27ae60',
        'overstock': '#3498db'
    };
    return colorMap[this.stockStatus] || '#95a5a6';
});

// Middleware para atualizar updatedBy antes de salvar
productSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedBy = this.createdBy; // Em um sistema real, seria o usuário atual
    }
    next();
});

// Método estático para buscar produtos com estoque baixo
productSchema.statics.findLowStock = function() {
    return this.find({
        $expr: {
            $lte: ['$quantity', '$minQuantity']
        },
        status: 'active'
    });
};

// Método estático para buscar produtos sem estoque
productSchema.statics.findOutOfStock = function() {
    return this.find({
        quantity: { $lte: 0 },
        status: 'active'
    });
};

// Método de instância para adicionar estoque
productSchema.methods.addStock = function(amount, reason = 'Entrada') {
    this.quantity += amount;
    return this.save();
};

// Método de instância para remover estoque
productSchema.methods.removeStock = function(amount, reason = 'Saída') {
    if (this.quantity < amount) {
        throw new Error('Quantidade insuficiente em estoque');
    }
    this.quantity -= amount;
    return this.save();
};

module.exports = mongoose.model('Product', productSchema);
