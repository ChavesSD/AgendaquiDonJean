class BackupManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Só carregar backups se o usuário tiver permissão
        if (this.hasBackupPermission()) {
            this.loadBackups();
        }
    }

    // Verificar se o usuário tem permissão para acessar backup
    hasBackupPermission() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userRole = userData.role || 'user';
            
            // Permissões baseadas no role
            const permissions = {
                admin: { canAccessBackup: true },
                manager: { canAccessBackup: false },
                user: { canAccessBackup: false }
            };
            
            return permissions[userRole]?.canAccessBackup || false;
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Botão criar backup
        const createBackupBtn = document.getElementById('create-backup');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => this.createBackup());
        }


        // Botão importar backup
        const importBackupBtn = document.getElementById('import-backup');
        if (importBackupBtn) {
            importBackupBtn.addEventListener('click', () => this.showImportDialog());
        }

        // Input de arquivo
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
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
            console.log('Iniciando restauração do backup:', backupId);
            this.showNotification('Restaurando backup...', 'info');
            
            const token = localStorage.getItem('authToken');
            
            if (!token) {
                this.showNotification('Token de autenticação não encontrado', 'error');
                return;
            }

            // Usar URL baseada na localização atual
            const baseUrl = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000' 
                : window.location.origin;
            
            const response = await fetch(`${baseUrl}/api/backup/restore/${backupId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Resposta da restauração:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log('Resultado da restauração:', result);
            
            if (result.success) {
                this.showNotification(result.message || 'Backup restaurado com sucesso!', 'success');
            } else {
                this.showNotification(result.message || 'Erro ao restaurar backup', 'error');
            }
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showNotification(`Erro ao restaurar backup: ${error.message}`, 'error');
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
            
            if (!token) {
                this.showNotification('Token de autenticação não encontrado', 'error');
                return;
            }

            // Usar URL baseada na localização atual
            const baseUrl = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000' 
                : window.location.origin;
            
            const response = await fetch(`${baseUrl}/api/backup/maintenance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Resposta da manutenção:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log('Resultado da manutenção:', result);
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                
                // Mostrar detalhes se disponíveis
                if (result.results) {
                    console.log('Detalhes da manutenção:', result.results);
                }
            } else {
                this.showNotification(result.message || 'Erro na manutenção', 'error');
            }
        } catch (error) {
            console.error('Erro na manutenção:', error);
            this.showNotification(`Erro na manutenção: ${error.message}`, 'error');
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
        // Verificar permissão antes de fazer a requisição
        if (!this.hasBackupPermission()) {
            console.log('Usuário não tem permissão para acessar backups');
            return;
        }

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
                <tr class="no-backups-row">
                    <td colspan="6" class="no-backups">
                        <i class="fas fa-database"></i>
                        <span>Nenhum backup encontrado</span>
                    </td>
                </tr>
            `;
            return;
        }

        backupList.innerHTML = backups.map(backup => `
            <tr class="backup-row" data-id="${backup.id}">
                <td class="backup-name">
                    <div class="backup-name-content">
                        <i class="fas fa-database"></i>
                        <div>
                            <strong>${backup.name}</strong>
                            <small>${backup.description || 'Backup automático'}</small>
                        </div>
                    </div>
                </td>
                <td class="backup-date">
                    <i class="fas fa-calendar"></i>
                    ${new Date(backup.createdAt).toLocaleString('pt-BR')}
                </td>
                <td class="backup-size">
                    <i class="fas fa-file-archive"></i>
                    ${this.formatFileSize(backup.size || 0)}
                </td>
                <td class="backup-collections">
                    <i class="fas fa-layer-group"></i>
                    ${backup.collections || 'N/A'}
                </td>
                <td class="backup-status">
                    <span class="status-badge status-${backup.status || 'completed'}">
                        <i class="fas fa-check-circle"></i>
                        ${this.getStatusText(backup.status || 'completed')}
                    </span>
                </td>
                <td class="backup-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="backupManager.restoreBackup('${backup.id}')" title="Restaurar Backup">
                            <i class="fas fa-upload"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="backupManager.downloadBackup('${backup.id}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="backupManager.deleteBackup('${backup.id}')" title="Deletar Backup">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
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

    // Obter texto do status
    getStatusText(status) {
        const statusMap = {
            'completed': 'Concluído',
            'processing': 'Processando',
            'failed': 'Falhou',
            'pending': 'Pendente',
            'imported': 'Importado'
        };
        return statusMap[status] || 'Desconhecido';
    }

    // Download de backup
    async downloadBackup(backupId) {
        try {
            console.log('Iniciando download do backup:', backupId);
            const token = localStorage.getItem('authToken');
            
            if (!token) {
                this.showNotification('Token de autenticação não encontrado', 'error');
                return;
            }
            
            // Usar URL baseada na localização atual
            const baseUrl = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000' 
                : window.location.origin;
            
            const downloadUrl = `${baseUrl}/api/backup/download/${backupId}`;
            console.log('URL de download:', downloadUrl);
            
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Resposta do servidor:', response.status, response.statusText);

            if (response.ok) {
                const blob = await response.blob();
                console.log('Blob criado, tamanho:', blob.size);
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${backupId}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showNotification('Download iniciado!', 'success');
            } else {
                const errorData = await response.json();
                console.error('Erro na resposta:', errorData);
                this.showNotification(errorData.message || 'Erro ao fazer download do backup', 'error');
            }
        } catch (error) {
            console.error('Erro ao fazer download:', error);
            this.showNotification('Erro ao fazer download do backup', 'error');
        }
    }

    // Mostrar diálogo de importação
    showImportDialog() {
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    // Lidar com seleção de arquivo
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.name.toLowerCase().endsWith('.zip')) {
            this.showNotification('Por favor, selecione um arquivo ZIP válido', 'error');
            return;
        }

        // Validar tamanho (máximo 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            this.showNotification('Arquivo muito grande. Tamanho máximo: 100MB', 'error');
            return;
        }

        try {
            this.showNotification('Importando backup...', 'info');
            
            const formData = new FormData();
            formData.append('backupFile', file);

            const token = localStorage.getItem('authToken');
            const baseUrl = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000' 
                : window.location.origin;

            const response = await fetch(`${baseUrl}/api/backup/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Backup importado com sucesso!', 'success');
                this.loadBackups(); // Recarregar lista de backups
            } else {
                this.showNotification(result.message || 'Erro ao importar backup', 'error');
            }

        } catch (error) {
            console.error('Erro ao importar backup:', error);
            this.showNotification('Erro ao importar backup', 'error');
        }

        // Limpar input
        event.target.value = '';
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
