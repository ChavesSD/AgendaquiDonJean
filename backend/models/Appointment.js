const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    professional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Professional',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    clientLastName: {
        type: String,
        trim: true
    },
    clientPhone: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    source: {
        type: String,
        enum: ['dashboard', 'public_booking'],
        default: 'dashboard'
    },
    notes: {
        type: String,
        trim: true
    },
    // Campos para controle de comissão
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Professional'
    },
    // Campos de auditoria
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Índices para melhor performance
appointmentSchema.index({ professional: 1, date: 1 });
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ clientPhone: 1 });
appointmentSchema.index({ source: 1 });

// Middleware removido temporariamente para debug

// Método para confirmar agendamento
appointmentSchema.methods.confirm = function() {
    this.status = 'confirmed';
    this.updatedAt = new Date();
    return this.save();
};

// Método para cancelar agendamento
appointmentSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.updatedAt = new Date();
    return this.save();
};

// Método para finalizar agendamento
appointmentSchema.methods.complete = function(completedBy) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completedBy = completedBy;
    this.updatedAt = new Date();
    return this.save();
};

// Método estático para buscar agendamentos por período
appointmentSchema.statics.findByDateRange = function(startDate, endDate) {
    return this.find({
        date: {
            $gte: startDate,
            $lte: endDate
        }
    }).populate('professional', 'firstName lastName')
      .populate('service', 'name price duration')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ date: 1, time: 1 });
};

// Método estático para buscar agendamentos por profissional
appointmentSchema.statics.findByProfessional = function(professionalId, startDate, endDate) {
    const query = { professional: professionalId };
    
    if (startDate && endDate) {
        query.date = {
            $gte: startDate,
            $lte: endDate
        };
    }
    
    return this.find(query)
        .populate('professional', 'firstName lastName')
        .populate('service', 'name price duration')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ date: 1, time: 1 });
};

// Método estático para buscar agendamentos do dia
appointmentSchema.statics.findByDay = function(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.find({
        date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    }).populate('professional', 'firstName lastName')
      .populate('service', 'name price duration')
      .sort({ time: 1 });
};

// Método estático para estatísticas
appointmentSchema.statics.getStats = function(startDate, endDate) {
    const matchStage = {};
    
    if (startDate && endDate) {
        matchStage.date = {
            $gte: startDate,
            $lte: endDate
        };
    }
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('Appointment', appointmentSchema);
