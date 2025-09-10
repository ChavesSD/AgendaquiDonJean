class BackupManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBackups();
    }

    setupEventListeners() {
        // Botão criar backup
        const createBackupBtn = document.getElementById('create-backup');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => this.createBackup());
        }

        // Botão restaurar backup
        const restoreBackupBtn = document.getElementById('restore-backup');
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', () => this.showRestoreModal());
        }

        // Botão manutenção
        const maintenanceBtn = document.getElementById('maintenance-db');
        if (maintenanceBtn) {
            maintenanceBtn.addEventListener('click', () => this.performMaintenance());
        }

        // Botão filtrar
        const filterBtn = document.getElementById('filter-backups');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.filterBackups());
        }

        // Inputs de data
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => this.validateDates());
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', () => this.validateDates());
        }
    }

    // Criar backup
    async createBackup() {
        try {
            const description = prompt('Digite uma descrição para o backup (opcional):') || '';
            
            this.showNotification('Criando backup...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/backup/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Backup criado com sucesso!', 'success');
                this.loadBackups();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            this.showNotification('Erro ao criar backup', 'error');
        }
    }

    // Mostrar modal de restauração
    showRestoreModal() {
        const backupList = document.getElementById('backup-list');
        if (!backupList || backupList.children.length === 0) {
            this.showNotification('Nenhum backup disponível para restauração', 'warning');
            return;
        }

        const backupId = prompt('Digite o ID do backup que deseja restaurar:');
        if (backupId) {
            this.restoreBackup(backupId);
        }
    }

    // Restaurar backup
    async restoreBackup(backupId) {
        if (!confirm('ATENÇÃO: Esta ação irá sobrescrever todos os dados atuais. Deseja continuar?')) {
            return;
        }

        try {
            this.showNotification('Restaurando backup...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/backup/restore/${backupId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Backup restaurado com sucesso!', 'success');
                this.loadBackups();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showNotification('Erro ao restaurar backup', 'error');
        }
    }

    // Executar manutenção
    async performMaintenance() {
        try {
            this.showNotification('Executando manutenção...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/backup/maintenance', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Manutenção concluída com sucesso!', 'success');
                this.showMaintenanceResults(result.stats);
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro na manutenção:', error);
            this.showNotification('Erro na manutenção', 'error');
        }
    }

    // Filtrar backups
    async filterBackups() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            this.showNotification('Data de início deve ser anterior à data de fim', 'error');
            return;
        }

        await this.loadBackups(startDate, endDate);
    }

    // Carregar lista de backups
    async loadBackups(startDate = '', endDate = '') {
        try {
            const token = localStorage.getItem('authToken');
            let url = '/api/backup/list';
            
            if (startDate || endDate) {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.renderBackups(result.backups);
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar backups:', error);
            this.showNotification('Erro ao carregar backups', 'error');
        }
    }

    // Renderizar lista de backups
    renderBackups(backups) {
        const backupList = document.getElementById('backup-list');
        if (!backupList) return;

        if (backups.length === 0) {
            backupList.innerHTML = '<p class="no-backups">Nenhum backup encontrado</p>';
            return;
        }

        backupList.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <h4>${backup.name}</h4>
                    <p class="backup-description">${backup.description || 'Sem descrição'}</p>
                    <div class="backup-meta">
                        <span class="backup-size">${this.formatFileSize(backup.fileSize)}</span>
                        <span class="backup-date">${this.formatDate(backup.createdAt)}</span>
                        <span class="backup-user">Criado por: ${backup.createdBy}</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-sm btn-primary" onclick="backupManager.restoreBackup('${backup.id}')">
                        <i class="fas fa-upload"></i> Restaurar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="backupManager.deleteBackup('${backup.id}')">
                        <i class="fas fa-trash"></i> Deletar
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Deletar backup
    async deleteBackup(backupId) {
        if (!confirm('Tem certeza que deseja deletar este backup?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/backup/${backupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Backup deletado com sucesso!', 'success');
                this.loadBackups();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar backup:', error);
            this.showNotification('Erro ao deletar backup', 'error');
        }
    }

    // Validar datas
    validateDates() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            this.showNotification('Data de início deve ser anterior à data de fim', 'error');
        }
    }

    // Mostrar resultados da manutenção
    showMaintenanceResults(stats) {
        const message = `
            Manutenção concluída!
            
            Estatísticas:
            • Usuários: ${stats.users}
            • Configurações: ${stats.companySettings}
            • Mensagens WhatsApp: ${stats.whatsappMessages}
            • Total de Backups: ${stats.totalBackups}
        `;
        
        alert(message);
    }

    // Formatar tamanho do arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Formatar data
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        // Usar a função de notificação existente do dashboard
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.backupManager = new BackupManager();
});
