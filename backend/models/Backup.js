const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['full', 'incremental', 'differential'],
        default: 'full'
    },
    status: {
        type: String,
        enum: ['created', 'in_progress', 'completed', 'failed'],
        default: 'created'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        collections: [String],
        recordCount: Number,
        version: String
    }
});

backupSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Backup', backupSchema);
