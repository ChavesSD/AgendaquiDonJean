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
            startDateInput.addEventListener('change', () => this.loadBackups());
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', () => this.loadBackups());
        }
    }

    // Criar backup
    async createBackup() {
        try {
            this.showNotification('Criando backup...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/backup/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
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
        const backups = this.getBackupsFromStorage();
        if (backups.length === 0) {
            this.showNotification('Nenhum backup disponível para restauração', 'warning');
            return;
        }

        // Criar modal dinâmico
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Restaurar Backup</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Selecione o backup que deseja restaurar:</p>
                    <div class="backup-list">
                        ${backups.map(backup => `
                            <div class="backup-item" data-id="${backup.id}">
                                <div class="backup-info">
                                    <h4>${backup.name}</h4>
                                    <p>${backup.description}</p>
                                    <small>Criado em: ${new Date(backup.createdAt).toLocaleString('pt-BR')}</small>
                                </div>
                                <button class="btn btn-primary restore-btn" data-id="${backup.id}">
                                    Restaurar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners do modal
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => modal.remove());

        const restoreBtns = modal.querySelectorAll('.restore-btn');
        restoreBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const backupId = e.target.dataset.id;
                this.restoreBackup(backupId);
                modal.remove();
            });
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Restaurar backup
    async restoreBackup(backupId) {
        try {
            this.showNotification('Restaurando backup...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/backup/restore/${backupId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Backup restaurado com sucesso!', 'success');
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
        if (!confirm('Tem certeza que deseja executar a manutenção do banco? Esta ação pode demorar alguns minutos.')) {
            return;
        }

        try {
            this.showNotification('Executando manutenção...', 'info');
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/backup/maintenance', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
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
        
        try {
            const token = localStorage.getItem('authToken');
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/backup/list?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.renderBackups(result.backups);
                this.showNotification(`${result.backups.length} backup(s) encontrado(s)`, 'info');
            } else {
                this.showNotification('Erro ao filtrar backups', 'error');
            }
        } catch (error) {
            console.error('Erro ao filtrar backups:', error);
            this.showNotification('Erro ao filtrar backups', 'error');
        }
    }

    // Carregar backups
    async loadBackups() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/backup/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.renderBackups(result.backups);
                this.saveBackupsToStorage(result.backups);
            } else {
                this.showNotification('Erro ao carregar backups', 'error');
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
            backupList.innerHTML = `
                <div class="no-backups">
                    <i class="fas fa-database"></i>
                    <p>Nenhum backup encontrado</p>
                </div>
            `;
            return;
        }

        backupList.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-info">
                    <h4>${backup.name}</h4>
                    <p>${backup.description}</p>
                    <div class="backup-meta">
                        <span><i class="fas fa-calendar"></i> ${new Date(backup.createdAt).toLocaleString('pt-BR')}</span>
                        <span><i class="fas fa-database"></i> ${backup.collections} coleções</span>
                        <span><i class="fas fa-file-archive"></i> ${this.formatFileSize(backup.size)}</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-primary btn-sm" onclick="backupManager.restoreBackup('${backup.id}')">
                        <i class="fas fa-upload"></i> Restaurar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="backupManager.deleteBackup('${backup.id}')">
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

    // Formatar tamanho do arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Salvar backups no localStorage
    saveBackupsToStorage(backups) {
        localStorage.setItem('backups', JSON.stringify(backups));
    }

    // Obter backups do localStorage
    getBackupsFromStorage() {
        const backups = localStorage.getItem('backups');
        return backups ? JSON.parse(backups) : [];
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
