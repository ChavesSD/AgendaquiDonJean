class ServiceManager {
    constructor() {
        this.services = [];
        this.professionals = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadServices();
        this.loadProfessionals();
    }

    setupEventListeners() {
        // Botão adicionar serviço
        const addBtn = document.getElementById('add-service-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openModal());
        }

        // Modal de serviço
        const modal = document.getElementById('serviceModal');
        const closeBtn = document.getElementById('closeServiceModal');
        const cancelBtn = document.getElementById('cancelService');
        const form = document.getElementById('serviceForm');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => this.saveService(e));
        }

        // Busca de serviços
        const searchInput = document.getElementById('service-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchServices(e.target.value));
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
    openModal(service = null) {
        const modal = document.getElementById('serviceModal');
        const title = document.getElementById('serviceModalTitle');
        const form = document.getElementById('serviceForm');

        if (service) {
            // Modo edição
            title.textContent = 'Editar Serviço';
            this.fillForm(service);
        } else {
            // Modo criação
            title.textContent = 'Novo Serviço';
            form.reset();
            this.loadProfessionalsCheckboxes();
        }

        modal.classList.add('show');
    }

    // Fechar modal
    closeModal() {
        const modal = document.getElementById('serviceModal');
        modal.classList.remove('show');
    }

    // Preencher formulário para edição
    fillForm(service) {
        document.getElementById('serviceId').value = service._id || '';
        document.getElementById('serviceName').value = service.name || '';
        document.getElementById('serviceStatus').value = service.status || 'active';
        document.getElementById('serviceDuration').value = service.duration || '';
        document.getElementById('serviceDurationUnit').value = service.durationUnit || 'minutes';
        document.getElementById('servicePrice').value = service.price || '';
        document.getElementById('serviceCommission').value = service.commission || '';
        document.getElementById('serviceDescription').value = service.description || '';

        // Carregar profissionais e marcar os selecionados
        this.loadProfessionalsCheckboxes(service.professionals || []);
    }

    // Carregar lista de profissionais para checkbox
    loadProfessionalsCheckboxes(selectedProfessionals = []) {
        const container = document.getElementById('professionals-checkbox-list');
        if (!container) return;

        if (this.professionals.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Nenhum profissional cadastrado</p>';
            return;
        }

        container.innerHTML = this.professionals.map(professional => {
            const isSelected = selectedProfessionals.some(p => p._id === professional._id);
            return `
                <div class="professional-checkbox-item">
                    <input type="checkbox" id="professional-${professional._id}" name="professionals" value="${professional._id}" ${isSelected ? 'checked' : ''}>
                    <label for="professional-${professional._id}">
                        <div class="professional-avatar">
                            ${professional.photo ? 
                                `<img src="${professional.photo}" alt="${professional.firstName}">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="professional-info">
                            <div class="professional-name">${professional.firstName} ${professional.lastName}</div>
                            <div class="professional-function">${professional.function || 'Função não definida'}</div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');
    }

    // Salvar serviço
    async saveService(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const serviceId = formData.get('id');
        const isEdit = serviceId !== '';

        // Coletar apenas os IDs dos profissionais selecionados
        const selectedProfessionalIds = Array.from(document.querySelectorAll('input[name="professionals"]:checked'))
            .map(checkbox => checkbox.value)
            .filter(Boolean);

        const serviceData = {
            name: formData.get('name'),
            status: formData.get('status'),
            duration: parseInt(formData.get('duration')),
            durationUnit: formData.get('durationUnit'),
            price: parseFloat(formData.get('price')),
            commission: parseFloat(formData.get('commission')),
            description: formData.get('description'),
            professionals: selectedProfessionalIds
        };

        try {
            const token = localStorage.getItem('authToken');
            const url = isEdit ? `/api/services/${serviceId}` : '/api/services';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(serviceData)
            });

            // Verificar se a resposta é JSON válida
            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                console.error('Resposta não é JSON:', text);
                throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
            }

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.closeModal();
                this.loadServices();
            } else {
                this.showNotification(result.message || 'Erro ao salvar serviço', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            if (error.message.includes('413')) {
                this.showNotification('Dados muito grandes. Tente novamente com menos informações.', 'error');
            } else if (error.message.includes('JSON')) {
                this.showNotification('Erro de comunicação com o servidor. Tente novamente.', 'error');
            } else {
                this.showNotification('Erro ao salvar serviço: ' + error.message, 'error');
            }
        }
    }

    // Carregar serviços
    async loadServices() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/services', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.services = data.services || [];
                this.renderServices();
                this.updateStats();
            } else {
                console.error('Erro ao carregar serviços');
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
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
            } else {
                console.error('Erro ao carregar profissionais');
            }
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
        }
    }

    // Renderizar lista de serviços
    renderServices(services = this.services) {
        const container = document.getElementById('services-list');
        if (!container) return;

        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cogs"></i>
                    <h3>Nenhum serviço encontrado</h3>
                    <p>Adicione o primeiro serviço para começar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = services.map(service => `
            <div class="service-card" data-id="${service._id}">
                <div class="service-header">
                    <div class="service-info">
                        <h4>${service.name}</h4>
                        <p class="service-description">${service.description || 'Sem descrição'}</p>
                    </div>
                    <div class="service-status">
                        <span class="status-badge status-${service.status}">
                            ${this.getStatusText(service.status)}
                        </span>
                    </div>
                </div>

                <div class="service-details">
                    <div class="service-detail">
                        <div class="service-detail-label">Tempo</div>
                        <div class="service-detail-value">
                            <i class="fas fa-clock"></i>
                            ${service.duration} ${service.durationUnit === 'minutes' ? 'min' : 'h'}
                        </div>
                    </div>
                    <div class="service-detail">
                        <div class="service-detail-label">Valor</div>
                        <div class="service-detail-value">
                            <i class="fas fa-dollar-sign"></i>
                            R$ ${service.price.toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                    <div class="service-detail">
                        <div class="service-detail-label">Comissão</div>
                        <div class="service-detail-value">
                            <i class="fas fa-percentage"></i>
                            ${service.commission}%
                        </div>
                    </div>
                    <div class="service-detail">
                        <div class="service-detail-label">Valor Comissão</div>
                        <div class="service-detail-value">
                            <i class="fas fa-hand-holding-usd"></i>
                            R$ ${(service.price * service.commission / 100).toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                </div>

                ${service.professionals && service.professionals.length > 0 ? `
                    <div class="service-professionals">
                        <h5>Profissionais Aptos</h5>
                        <div class="professionals-tags">
                            ${service.professionals.map(professional => `
                                <span class="professional-tag">
                                    <i class="fas fa-user"></i>
                                    ${professional.firstName} ${professional.lastName}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="service-actions">
                    <button class="btn btn-primary" onclick="serviceManager.editService('${service._id}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="serviceManager.deleteService('${service._id}')">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Buscar serviços
    searchServices(query) {
        const filtered = this.services.filter(service => {
            const name = service.name.toLowerCase();
            const description = (service.description || '').toLowerCase();
            const searchQuery = query.toLowerCase();
            
            return name.includes(searchQuery) || description.includes(searchQuery);
        });
        
        this.renderServices(filtered);
    }

    // Editar serviço
    editService(id) {
        const service = this.services.find(s => s._id === id);
        if (service) {
            this.openModal(service);
        }
    }

    // Excluir serviço
    async deleteService(id) {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/services/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.loadServices();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir serviço:', error);
            this.showNotification('Erro ao excluir serviço', 'error');
        }
    }

    // Atualizar estatísticas
    updateStats() {
        const total = this.services.length;
        const active = this.services.filter(s => s.status === 'active').length;
        const inactive = this.services.filter(s => s.status === 'inactive').length;

        document.getElementById('total-services').textContent = total;
        document.getElementById('active-services').textContent = active;
        document.getElementById('inactive-services').textContent = inactive;
    }

    // Obter texto do status
    getStatusText(status) {
        const statusMap = {
            'active': 'Ativo',
            'inactive': 'Inativo'
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
    window.serviceManager = new ServiceManager();
});
