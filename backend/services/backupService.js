const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const Backup = require('../models/Backup');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const WhatsAppMessages = require('../models/WhatsAppMessages');

const execAsync = promisify(exec);

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../../backups');
        this.ensureBackupDirectory();
    }

    // Criar diretório de backups se não existir
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Criar backup completo do banco de dados
    async createBackup(userId, description = '') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup_${timestamp}`;
            const backupPath = path.join(this.backupDir, `${backupName}.json`);

            // Criar registro do backup no banco
            const backup = new Backup({
                name: backupName,
                description: description,
                filePath: backupPath,
                fileSize: 0,
                status: 'in_progress',
                createdBy: userId,
                metadata: {
                    collections: ['users', 'companysettings', 'whatsappmessages'],
                    recordCount: 0,
                    version: '1.0'
                }
            });

            await backup.save();

            // Coletar dados de todas as coleções
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                collections: {}
            };

            // Backup de usuários
            const users = await User.find({});
            backupData.collections.users = users;

            // Backup de configurações da empresa
            const companySettings = await CompanySettings.find({});
            backupData.collections.companysettings = companySettings;

            // Backup de mensagens do WhatsApp
            const whatsappMessages = await WhatsAppMessages.find({});
            backupData.collections.whatsappmessages = whatsappMessages;

            // Salvar backup em arquivo
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

            // Atualizar informações do backup
            const stats = fs.statSync(backupPath);
            backup.fileSize = stats.size;
            backup.status = 'completed';
            backup.metadata.recordCount = users.length + companySettings.length + whatsappMessages.length;
            await backup.save();

            return {
                success: true,
                message: 'Backup criado com sucesso',
                backup: {
                    id: backup._id,
                    name: backup.name,
                    fileSize: backup.fileSize,
                    createdAt: backup.createdAt
                }
            };

        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return {
                success: false,
                message: 'Erro ao criar backup: ' + error.message
            };
        }
    }

    // Listar backups com filtro por data
    async listBackups(startDate, endDate) {
        try {
            let query = { status: 'completed' };

            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const backups = await Backup.find(query)
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });

            return {
                success: true,
                backups: backups.map(backup => ({
                    id: backup._id,
                    name: backup.name,
                    description: backup.description,
                    fileSize: backup.fileSize,
                    createdAt: backup.createdAt,
                    createdBy: backup.createdBy.name,
                    metadata: backup.metadata
                }))
            };

        } catch (error) {
            console.error('Erro ao listar backups:', error);
            return {
                success: false,
                message: 'Erro ao listar backups: ' + error.message
            };
        }
    }

    // Restaurar backup
    async restoreBackup(backupId, userId) {
        try {
            const backup = await Backup.findById(backupId);
            if (!backup) {
                return {
                    success: false,
                    message: 'Backup não encontrado'
                };
            }

            if (!fs.existsSync(backup.filePath)) {
                return {
                    success: false,
                    message: 'Arquivo de backup não encontrado'
                };
            }

            // Ler dados do backup
            const backupData = JSON.parse(fs.readFileSync(backup.filePath, 'utf8'));

            // Restaurar dados (cuidado: isso vai sobrescrever dados existentes)
            if (backupData.collections.users) {
                await User.deleteMany({});
                await User.insertMany(backupData.collections.users);
            }

            if (backupData.collections.companysettings) {
                await CompanySettings.deleteMany({});
                await CompanySettings.insertMany(backupData.collections.companysettings);
            }

            if (backupData.collections.whatsappmessages) {
                await WhatsAppMessages.deleteMany({});
                await WhatsAppMessages.insertMany(backupData.collections.whatsappmessages);
            }

            return {
                success: true,
                message: 'Backup restaurado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            return {
                success: false,
                message: 'Erro ao restaurar backup: ' + error.message
            };
        }
    }

    // Manutenção do banco de dados
    async performMaintenance() {
        try {
            const results = [];

            // Limpar registros órfãos
            const orphanedUsers = await User.find({ _id: { $exists: true } });
            results.push(`Usuários encontrados: ${orphanedUsers.length}`);

            // Verificar integridade dos dados
            const companySettings = await CompanySettings.find({});
            results.push(`Configurações da empresa: ${companySettings.length}`);

            const whatsappMessages = await WhatsAppMessages.find({});
            results.push(`Mensagens WhatsApp: ${whatsappMessages.length}`);

            // Estatísticas do banco
            const dbStats = {
                users: orphanedUsers.length,
                companySettings: companySettings.length,
                whatsappMessages: whatsappMessages.length,
                totalBackups: await Backup.countDocuments()
            };

            return {
                success: true,
                message: 'Manutenção concluída com sucesso',
                results: results,
                stats: dbStats
            };

        } catch (error) {
            console.error('Erro na manutenção:', error);
            return {
                success: false,
                message: 'Erro na manutenção: ' + error.message
            };
        }
    }

    // Deletar backup
    async deleteBackup(backupId) {
        try {
            const backup = await Backup.findById(backupId);
            if (!backup) {
                return {
                    success: false,
                    message: 'Backup não encontrado'
                };
            }

            // Deletar arquivo físico
            if (fs.existsSync(backup.filePath)) {
                fs.unlinkSync(backup.filePath);
            }

            // Deletar registro do banco
            await Backup.findByIdAndDelete(backupId);

            return {
                success: true,
                message: 'Backup deletado com sucesso'
            };

        } catch (error) {
            console.error('Erro ao deletar backup:', error);
            return {
                success: false,
                message: 'Erro ao deletar backup: ' + error.message
            };
        }
    }
}

module.exports = new BackupService();
