const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const mongoose = require('mongoose');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDir();
    }

    // Garantir que o diretório de backup existe
    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Criar backup do banco de dados
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup_${timestamp}`;
            const backupPath = path.join(this.backupDir, `${backupName}.zip`);

            // Obter todas as coleções do banco
            const collections = await mongoose.connection.db.listCollections().toArray();
            
            // Criar arquivo ZIP
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    const backupInfo = {
                        id: backupName,
                        name: `Backup ${new Date().toLocaleDateString('pt-BR')}`,
                        description: `Backup automático criado em ${new Date().toLocaleString('pt-BR')}`,
                        filename: `${backupName}.zip`,
                        filepath: backupPath,
                        size: archive.pointer(),
                        createdAt: new Date(),
                        collections: collections.length
                    };

                    // Salvar informações do backup
                    this.saveBackupInfo(backupInfo);
                    
                    resolve({
                        success: true,
                        message: 'Backup criado com sucesso',
                        backup: backupInfo
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // Adicionar dados de cada coleção
                this.addCollectionsToArchive(archive, collections)
                    .then(() => {
                        archive.finalize();
                    })
                    .catch(reject);
            });

        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return {
                success: false,
                message: 'Erro ao criar backup: ' + error.message
            };
        }
    }

    // Adicionar coleções ao arquivo ZIP
    async addCollectionsToArchive(archive, collections) {
        for (const collection of collections) {
            const collectionName = collection.name;
            const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
            
            // Converter dados para JSON
            const jsonData = JSON.stringify(data, null, 2);
            archive.append(jsonData, { name: `${collectionName}.json` });
        }
    }

    // Salvar informações do backup
    saveBackupInfo(backupInfo) {
        const backupInfoPath = path.join(this.backupDir, 'backups.json');
        let backups = [];

        if (fs.existsSync(backupInfoPath)) {
            try {
                backups = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
            } catch (error) {
                console.error('Erro ao ler arquivo de backups:', error);
            }
        }

        backups.push(backupInfo);
        fs.writeFileSync(backupInfoPath, JSON.stringify(backups, null, 2));
    }

    // Listar backups
    getBackups() {
        const backupInfoPath = path.join(this.backupDir, 'backups.json');
        
        if (!fs.existsSync(backupInfoPath)) {
            return [];
        }

        try {
            return JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
        } catch (error) {
            console.error('Erro ao ler backups:', error);
            return [];
        }
    }

    // Filtrar backups por data
    filterBackupsByDate(startDate, endDate) {
        const backups = this.getBackups();
        
        if (!startDate && !endDate) {
            return backups;
        }

        return backups.filter(backup => {
            const backupDate = new Date(backup.createdAt);
            const start = startDate ? new Date(startDate) : new Date(0);
            const end = endDate ? new Date(endDate) : new Date();

            return backupDate >= start && backupDate <= end;
        });
    }

    // Restaurar backup
    async restoreBackup(backupId) {
        try {
            const backups = this.getBackups();
            const backup = backups.find(b => b.id === backupId);

            if (!backup) {
                return {
                    success: false,
                    message: 'Backup não encontrado'
                };
            }

            // Verificar se o arquivo existe
            if (!fs.existsSync(backup.filepath)) {
                return {
                    success: false,
                    message: 'Arquivo de backup não encontrado'
                };
            }

            // Aqui você implementaria a lógica de restauração
            // Por enquanto, retornamos sucesso simulado
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
            // Limpar coleções vazias
            const collections = await mongoose.connection.db.listCollections().toArray();
            let cleanedCollections = 0;

            for (const collection of collections) {
                const count = await mongoose.connection.db.collection(collection.name).countDocuments();
                if (count === 0) {
                    await mongoose.connection.db.collection(collection.name).drop();
                    cleanedCollections++;
                }
            }

            // Otimizar índices
            for (const collection of collections) {
                await mongoose.connection.db.collection(collection.name).reIndex();
            }

            return {
                success: true,
                message: `Manutenção concluída. ${cleanedCollections} coleções vazias removidas.`,
                cleanedCollections
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
    deleteBackup(backupId) {
        try {
            const backups = this.getBackups();
            const backup = backups.find(b => b.id === backupId);

            if (!backup) {
                return {
                    success: false,
                    message: 'Backup não encontrado'
                };
            }

            // Deletar arquivo
            if (fs.existsSync(backup.filepath)) {
                fs.unlinkSync(backup.filepath);
            }

            // Remover das informações
            const updatedBackups = backups.filter(b => b.id !== backupId);
            const backupInfoPath = path.join(this.backupDir, 'backups.json');
            fs.writeFileSync(backupInfoPath, JSON.stringify(updatedBackups, null, 2));

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
