const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    minQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    price: {
        type: Number,
        min: 0,
        default: 0
    },
    supplier: {
        type: String,
        trim: true
    },
    photo: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // Histórico de movimentações
    movements: [{
        type: {
            type: String,
            enum: ['entrada', 'saida'],
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        reason: {
            type: String,
            trim: true
        },
        notes: {
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
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Índices para melhor performance
productSchema.index({ name: 'text', category: 'text', supplier: 'text' });
productSchema.index({ status: 1 });
productSchema.index({ quantity: 1 });

// Middleware para atualizar quantidade automaticamente
productSchema.pre('save', function(next) {
    // Calcular quantidade atual baseada nas movimentações
    if (this.movements && this.movements.length > 0) {
        let currentQuantity = 0;
        this.movements.forEach(movement => {
            if (movement.type === 'entrada') {
                currentQuantity += movement.quantity;
            } else if (movement.type === 'saida') {
                currentQuantity -= movement.quantity;
            }
        });
        this.quantity = Math.max(0, currentQuantity);
    }
    next();
});

// Método para adicionar movimentação
productSchema.methods.addMovement = function(movementData) {
    this.movements.push(movementData);
    return this.save();
};

// Método para calcular quantidade atual
productSchema.methods.calculateCurrentQuantity = function() {
    let currentQuantity = 0;
    this.movements.forEach(movement => {
        if (movement.type === 'entrada') {
            currentQuantity += movement.quantity;
        } else if (movement.type === 'saida') {
            currentQuantity -= movement.quantity;
        }
    });
    return Math.max(0, currentQuantity);
};

// Método para verificar se está em estoque baixo
productSchema.methods.isLowStock = function() {
    return this.quantity <= this.minQuantity && this.quantity > 0;
};

// Método para verificar se está sem estoque
productSchema.methods.isOutOfStock = function() {
    return this.quantity === 0;
};

// Método para verificar se está em estoque normal
productSchema.methods.isInStock = function() {
    return this.quantity > this.minQuantity;
};

// Virtual para status do estoque
productSchema.virtual('stockStatus').get(function() {
    if (this.isOutOfStock()) return 'out-of-stock';
    if (this.isLowStock()) return 'low-stock';
    return 'in-stock';
});

// Virtual para status do estoque em português
productSchema.virtual('stockStatusText').get(function() {
    if (this.isOutOfStock()) return 'Sem Estoque';
    if (this.isLowStock()) return 'Estoque Baixo';
    return 'Em Estoque';
});

// Método estático para buscar produtos com estoque baixo
productSchema.statics.findLowStock = function() {
    return this.find({
        $expr: {
            $and: [
                { $lte: ['$quantity', '$minQuantity'] },
                { $gt: ['$quantity', 0] }
            ]
        },
        status: 'active'
    });
};

// Método estático para buscar produtos sem estoque
productSchema.statics.findOutOfStock = function() {
    return this.find({
        quantity: 0,
        status: 'active'
    });
};

// Método estático para buscar produtos em estoque
productSchema.statics.findInStock = function() {
    return this.find({
        $expr: {
            $gt: ['$quantity', '$minQuantity']
        },
        status: 'active'
    });
};

// Método estático para estatísticas do estoque
productSchema.statics.getStockStatistics = async function() {
    const total = await this.countDocuments();
    const inStock = await this.findInStock().countDocuments();
    const lowStock = await this.findLowStock().countDocuments();
    const outOfStock = await this.findOutOfStock().countDocuments();
    
    return {
        total,
        inStock,
        lowStock,
        outOfStock
    };
};

module.exports = mongoose.model('Product', productSchema);
