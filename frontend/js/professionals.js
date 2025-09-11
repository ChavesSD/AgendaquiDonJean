class ProfessionalManager {
    constructor() {
        this.professionals = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProfessionals();
    }

    setupEventListeners() {
        // Botão adicionar profissional
        const addBtn = document.getElementById('add-professional-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openModal());
        }

        // Modal de profissional
        const modal = document.getElementById('professionalModal');
        const closeBtn = document.getElementById('closeProfessionalModal');
        const cancelBtn = document.getElementById('cancelProfessional');
        const form = document.getElementById('professionalForm');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.saveProfessional(e));
        }

        // Checkbox para criar usuário
        const createUserCheckbox = document.getElementById('createUserAccount');
        if (createUserCheckbox) {
            createUserCheckbox.addEventListener('change', (e) => {
                const credentialsSection = document.getElementById('userCredentialsSection');
                if (credentialsSection) {
                    credentialsSection.style.display = e.target.checked ? 'block' : 'none';
                }
                
                // Debug
                console.log('Checkbox createUserAccount:', e.target.checked);
            });
        }

        // Upload de foto
        const photoInput = document.getElementById('professionalPhoto');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // Busca de profissionais
        const searchInput = document.getElementById('professional-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchProfessionals(e.target.value));
        }

        // Fechar modal clicando fora
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    // Abrir modal
    openModal(professional = null) {
        const modal = document.getElementById('professionalModal');
        const title = document.getElementById('professionalModalTitle');
        const form = document.getElementById('professionalForm');
        const photoPreview = document.getElementById('photoPreview');

        if (professional) {
            // Modo edição
            title.textContent = 'Editar Profissional';
            this.fillForm(professional);
        } else {
            // Modo criação
            title.textContent = 'Novo Profissional';
            form.reset();
            photoPreview.innerHTML = '<i class="fas fa-user"></i><span>Clique para adicionar foto</span>';
            document.getElementById('userCredentialsSection').style.display = 'none';
        }

        modal.classList.add('show');
    }

    // Fechar modal
    closeModal() {
        const modal = document.getElementById('professionalModal');
        modal.classList.remove('show');
    }

    // Preencher formulário para edição
    fillForm(professional) {
        document.getElementById('professionalId').value = professional._id || '';
        document.getElementById('professionalFirstName').value = professional.firstName || '';
        document.getElementById('professionalLastName').value = professional.lastName || '';
        document.getElementById('professionalContact').value = professional.contact || '';
        document.getElementById('professionalEmail').value = professional.email || '';
        document.getElementById('professionalAddress').value = professional.address || '';
        document.getElementById('professionalFunction').value = professional.function || '';
        document.getElementById('professionalDailyCapacity').value = professional.dailyCapacity || '';
        document.getElementById('professionalStatus').value = professional.status || 'active';

        // Foto
        const photoPreview = document.getElementById('photoPreview');
        if (professional.photo) {
            photoPreview.innerHTML = `<img src="${professional.photo}" alt="Foto do profissional">`;
        } else {
            photoPreview.innerHTML = '<i class="fas fa-user"></i><span>Clique para adicionar foto</span>';
        }

        // Credenciais de usuário
        const createUserCheckbox = document.getElementById('createUserAccount');
        const credentialsSection = document.getElementById('userCredentialsSection');
        
        if (professional.userAccount) {
            createUserCheckbox.checked = true;
            credentialsSection.style.display = 'block';
            document.getElementById('userEmail').value = professional.userEmail || '';
        } else {
            createUserCheckbox.checked = false;
            credentialsSection.style.display = 'none';
        }
    }

    // Upload de foto
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('photoPreview');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Foto do profissional">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // Salvar profissional
    async saveProfessional(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const professionalId = formData.get('id');
        const isEdit = professionalId !== '';

        // Validar se deve criar usuário
        const createUserAccount = formData.get('createUserAccount');
        if (createUserAccount === 'on') {
            const userEmail = formData.get('userEmail');
            const userPassword = formData.get('userPassword');
            
            if (!userEmail || !userPassword) {
                this.showNotification('Email e senha são obrigatórios para criar conta de usuário', 'error');
                return;
            }
        }

        // Debug: verificar dados do formulário
        console.log('Dados do formulário:');
        for (let [key, value] of formData.entries()) {
            if (key === 'userPassword') {
                console.log(key, '***');
            } else {
                console.log(key, value);
            }
        }

        try {
            const token = localStorage.getItem('authToken');
            const url = isEdit ? `/api/professionals/${professionalId}` : '/api/professionals';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.closeModal();
                this.loadProfessionals();
                // Recarregar usuários se foi criado um usuário
                if (window.loadUsers) {
                    window.loadUsers();
                }
            } else {
                console.error('Erro na resposta:', result);
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar profissional:', error);
            this.showNotification('Erro ao salvar profissional', 'error');
        }
    }

    // Carregar profissionais
    async loadProfessionals() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/professionals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.professionals = data.professionals || [];
                this.renderProfessionals();
                this.updateStats();
            } else {
                console.error('Erro ao carregar profissionais');
            }
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
        }
    }

    // Renderizar lista de profissionais
    renderProfessionals(professionals = this.professionals) {
        const container = document.getElementById('professionals-list');
        if (!container) return;

        if (professionals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum profissional encontrado</h3>
                    <p>Adicione o primeiro profissional para começar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = professionals.map(professional => `
            <div class="professional-card" data-id="${professional._id}">
                <div class="professional-photo">
                    ${professional.photo ? 
                        `<img src="${professional.photo}" alt="${professional.firstName}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="professional-info">
                    <h4>${professional.firstName} ${professional.lastName}</h4>
                    <p class="professional-function">${professional.function || 'Função não definida'}</p>
                    <div class="professional-details">
                        <span class="contact">
                            <i class="fas fa-phone"></i>
                            ${professional.contact || 'Não informado'}
                        </span>
                        <span class="email">
                            <i class="fas fa-envelope"></i>
                            ${professional.email || 'Não informado'}
                        </span>
                        <span class="capacity">
                            <i class="fas fa-calendar-day"></i>
                            ${professional.dailyCapacity || 0} atendimentos/dia
                        </span>
                    </div>
                </div>
                <div class="professional-status">
                    <span class="status-badge status-${professional.status}">
                        ${this.getStatusText(professional.status)}
                    </span>
                    ${professional.userAccount ? '<span class="user-badge">Usuário</span>' : ''}
                </div>
                <div class="professional-actions">
                    <button class="btn btn-sm btn-primary" onclick="professionalManager.editProfessional('${professional._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="professionalManager.deleteProfessional('${professional._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Buscar profissionais
    searchProfessionals(query) {
        const filtered = this.professionals.filter(professional => {
            const fullName = `${professional.firstName} ${professional.lastName}`.toLowerCase();
            const functionName = (professional.function || '').toLowerCase();
            const searchQuery = query.toLowerCase();
            
            return fullName.includes(searchQuery) || functionName.includes(searchQuery);
        });
        
        this.renderProfessionals(filtered);
    }

    // Editar profissional
    editProfessional(id) {
        const professional = this.professionals.find(p => p._id === id);
        if (professional) {
            this.openModal(professional);
        }
    }

    // Excluir profissional
    async deleteProfessional(id) {
        if (!confirm('Tem certeza que deseja excluir este profissional?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/professionals/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.loadProfessionals();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir profissional:', error);
            this.showNotification('Erro ao excluir profissional', 'error');
        }
    }

    // Atualizar estatísticas
    updateStats() {
        const total = this.professionals.length;
        const active = this.professionals.filter(p => p.status === 'active').length;
        const inactive = this.professionals.filter(p => p.status === 'inactive').length;
        const vacation = this.professionals.filter(p => p.status === 'vacation').length;
        const leave = this.professionals.filter(p => p.status === 'leave').length;

        document.getElementById('total-professionals').textContent = total;
        document.getElementById('active-professionals').textContent = active;
        document.getElementById('inactive-professionals').textContent = inactive;
        document.getElementById('vacation-professionals').textContent = vacation;
        document.getElementById('leave-professionals').textContent = leave;
    }

    // Obter texto do status
    getStatusText(status) {
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo',
            'vacation': 'Férias',
            'leave': 'Licença'
        };
        return statusMap[status] || 'Desconhecido';
    }

    // Mostrar notificação
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.professionalManager = new ProfessionalManager();
});
