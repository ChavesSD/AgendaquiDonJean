// ==================== AGENDA.JS ====================

class AgendaManager {
    constructor() {
        this.currentTab = 'agendamentos';
        this.appointments = [];
        this.professionals = [];
        this.services = [];
        this.currentDate = new Date();
        
        // Definir filtros padrão para o mês atual
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        this.filters = {
            startDate: this.formatDateForInput(firstDayOfMonth),
            endDate: this.formatDateForInput(lastDayOfMonth),
            professionalId: '',
            search: ''
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadProfessionals();
        await this.loadServices();
        await this.loadAppointments();
        await this.loadStatistics();
        this.setupDateFilters();
        this.populateDateInputs();
    }

    setupEventListeners() {
        // Filtros de data
        document.getElementById('filter-agenda-dates').addEventListener('click', () => this.applyDateFilters());
        document.getElementById('clear-agenda-filters').addEventListener('click', () => this.clearDateFilters());
        
        // Abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn').dataset.tab));
        });
        
        // Botão novo agendamento
        document.getElementById('new-appointment-btn').addEventListener('click', () => this.openAppointmentModal());
        
        // Modal de agendamento
        document.getElementById('closeAppointmentModal').addEventListener('click', () => this.closeAppointmentModal());
        document.getElementById('cancelAppointment').addEventListener('click', () => this.closeAppointmentModal());
        document.getElementById('saveAppointment').addEventListener('click', () => this.saveAppointment());
        
        // Filtro de profissional
        document.getElementById('professional-filter').addEventListener('change', (e) => this.filterByProfessional(e.target.value));
        
        // Busca
        document.getElementById('appointment-search').addEventListener('input', (e) => this.searchAppointments(e.target.value));
        
        // Fechar modal ao clicar fora
        document.getElementById('appointmentModal').addEventListener('click', (e) => {
            if (e.target.id === 'appointmentModal') {
                this.closeAppointmentModal();
            }
        });
    }

    setupDateFilters() {
        // Os filtros já foram definidos no constructor
        // Apenas preencher os campos de input
        this.populateDateInputs();
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    populateDateInputs() {
        // Preencher os campos de data com os filtros atuais
        document.getElementById('agenda-date-from').value = this.filters.startDate;
        document.getElementById('agenda-date-to').value = this.filters.endDate;
    }

    async loadProfessionals() {
        try {
            const response = await fetch('/api/professionals', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.professionals = data.professionals;
                this.populateProfessionalFilter();
            }
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
        }
    }

    async loadServices() {
        try {
            const response = await fetch('/api/services', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.services = data.services;
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
        }
    }

    populateProfessionalFilter() {
        const select = document.getElementById('professional-filter');
        select.innerHTML = '<option value="">Todos os Profissionais</option>';
        
        this.professionals.forEach(professional => {
            const option = document.createElement('option');
            option.value = professional._id;
            option.textContent = `${professional.firstName} ${professional.lastName}`;
            select.appendChild(option);
        });
    }

    async loadAppointments() {
        try {
            const token = localStorage.getItem('authToken');
            
            let url = '/api/appointments?';
            const params = new URLSearchParams();
            
            if (this.filters.startDate) params.append('startDate', this.filters.startDate);
            if (this.filters.endDate) params.append('endDate', this.filters.endDate);
            if (this.filters.professionalId) params.append('professionalId', this.filters.professionalId);
            
            url += params.toString();
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.appointments = data.appointments || [];
                this.renderAppointments();
            } else {
                const errorData = await response.json();
                console.error('Erro na API:', errorData);
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
        }
    }

    async loadStatistics() {
        try {
            let url = '/api/appointments/statistics?';
            const params = new URLSearchParams();
            
            if (this.filters.startDate) params.append('startDate', this.filters.startDate);
            if (this.filters.endDate) params.append('endDate', this.filters.endDate);
            
            url += params.toString();
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    updateStatistics(stats) {
        document.getElementById('total-appointments').textContent = stats.total;
        document.getElementById('pending-appointments').textContent = stats.pending;
        document.getElementById('confirmed-appointments').textContent = stats.confirmed;
        document.getElementById('cancelled-appointments').textContent = stats.cancelled;
    }

    renderAppointments() {
        const container = document.getElementById('appointments-list');
        
        if (this.appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>Nenhum agendamento encontrado</h3>
                    <p>Não há agendamentos para o período selecionado.</p>
                </div>
            `;
            return;
        }
        
        const filteredAppointments = this.filterAppointments();
        
        container.innerHTML = filteredAppointments.map(appointment => this.createAppointmentCard(appointment)).join('');
    }

    filterAppointments() {
        let filtered = this.appointments;
        
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(appointment => 
                appointment.clientName.toLowerCase().includes(searchTerm) ||
                appointment.clientPhone.includes(searchTerm) ||
                appointment.service.name.toLowerCase().includes(searchTerm) ||
                `${appointment.professional.firstName} ${appointment.professional.lastName}`.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    createAppointmentCard(appointment) {
        const statusClass = this.getStatusClass(appointment.status);
        const statusText = this.getStatusText(appointment.status);
        const date = new Date(appointment.date).toLocaleDateString('pt-BR');
        const time = appointment.time;
        
        return `
            <div class="appointment-card ${statusClass}">
                <div class="appointment-info">
                    <div class="appointment-header">
                        <h4>${appointment.clientName}</h4>
                        <span class="appointment-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="appointment-details">
                        <p><i class="fas fa-user"></i> ${appointment.professional.firstName} ${appointment.professional.lastName}</p>
                        <p><i class="fas fa-cog"></i> ${appointment.service.name}</p>
                        <p><i class="fas fa-calendar"></i> ${date} às ${time}</p>
                        <p><i class="fas fa-phone"></i> ${appointment.clientPhone}</p>
                        ${appointment.notes ? `<p><i class="fas fa-sticky-note"></i> ${appointment.notes}</p>` : ''}
                    </div>
                </div>
                <div class="appointment-actions">
                    ${this.getActionButtons(appointment)}
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'pending',
            'confirmed': 'confirmed',
            'cancelled': 'cancelled',
            'completed': 'completed'
        };
        return classes[status] || 'pending';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Finalizado'
        };
        return texts[status] || 'Pendente';
    }

    getActionButtons(appointment) {
        let buttons = '';
        
        if (appointment.status === 'pending') {
            buttons += `
                <button class="btn btn-success btn-sm" onclick="window.agendaManager.confirmAppointment('${appointment._id}')">
                    <i class="fas fa-check"></i> Confirmar
                </button>
                <button class="btn btn-warning btn-sm" onclick="window.agendaManager.cancelAppointment('${appointment._id}')">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            `;
        }
        
        if (appointment.status === 'confirmed') {
            buttons += `
                <button class="btn btn-primary btn-sm" onclick="window.agendaManager.completeAppointment('${appointment._id}')">
                    <i class="fas fa-check-circle"></i> Finalizar
                </button>
                <button class="btn btn-warning btn-sm" onclick="window.agendaManager.cancelAppointment('${appointment._id}')">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            `;
        }
        
        if (appointment.status !== 'completed') {
            buttons += `
                <button class="btn btn-info btn-sm" onclick="window.agendaManager.editAppointment('${appointment._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.agendaManager.deleteAppointment('${appointment._id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
        }
        
        return buttons;
    }

    switchTab(tabName) {
        // Atualizar botões das abas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Atualizar conteúdo das abas
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Carregar conteúdo específico da aba
        if (tabName === 'calendario') {
            this.loadCalendar();
        } else if (tabName === 'agenda') {
            this.loadDailyAgenda();
        }
    }

    async applyDateFilters() {
        this.filters.startDate = document.getElementById('agenda-date-from').value;
        this.filters.endDate = document.getElementById('agenda-date-to').value;
        
        await this.loadAppointments();
        await this.loadStatistics();
    }

    clearDateFilters() {
        // Resetar para o mês atual
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        this.filters.startDate = this.formatDateForInput(firstDayOfMonth);
        this.filters.endDate = this.formatDateForInput(lastDayOfMonth);
        
        this.populateDateInputs();
        this.loadAppointments();
        this.loadStatistics();
    }

    filterByProfessional(professionalId) {
        this.filters.professionalId = professionalId;
        this.loadAppointments();
    }

    searchAppointments(searchTerm) {
        this.filters.search = searchTerm;
        this.renderAppointments();
    }

    openAppointmentModal(appointment = null) {
        const modal = document.getElementById('appointmentModal');
        const title = document.getElementById('appointmentModalTitle');
        
        if (appointment) {
            title.textContent = 'Editar Agendamento';
            this.populateAppointmentForm(appointment);
        } else {
            title.textContent = 'Novo Agendamento';
            this.clearAppointmentForm();
        }
        
        modal.style.display = 'flex';
        this.populateProfessionalSelect();
    }

    closeAppointmentModal() {
        document.getElementById('appointmentModal').style.display = 'none';
        this.clearAppointmentForm();
    }

    populateProfessionalSelect() {
        const select = document.getElementById('appointmentProfessional');
        select.innerHTML = '<option value="">Selecione o profissional</option>';
        
        this.professionals.forEach(professional => {
            const option = document.createElement('option');
            option.value = professional._id;
            option.textContent = `${professional.firstName} ${professional.lastName}`;
            select.appendChild(option);
        });
    }

    async populateServiceSelect(professionalId) {
        const select = document.getElementById('appointmentService');
        select.innerHTML = '<option value="">Selecione o serviço</option>';
        
        if (!professionalId) return;
        
        // Filtrar serviços do profissional selecionado
        const professionalServices = this.services.filter(service => 
            service.professionals.includes(professionalId)
        );
        
        professionalServices.forEach(service => {
            const option = document.createElement('option');
            option.value = service._id;
            option.textContent = `${service.name} - R$ ${service.price.toFixed(2)}`;
            select.appendChild(option);
        });
    }

    async populateTimeSelect(professionalId, date) {
        const select = document.getElementById('appointmentTime');
        select.innerHTML = '<option value="">Selecione o horário</option>';
        
        if (!professionalId || !date) return;
        
        try {
            const response = await fetch(`/api/appointments/available-times?professionalId=${professionalId}&date=${date}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                data.availableTimes.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar horários disponíveis:', error);
        }
    }

    populateAppointmentForm(appointment) {
        document.getElementById('appointmentId').value = appointment._id;
        document.getElementById('appointmentProfessional').value = appointment.professional._id;
        document.getElementById('appointmentService').value = appointment.service._id;
        document.getElementById('appointmentDate').value = new Date(appointment.date).toISOString().split('T')[0];
        document.getElementById('appointmentTime').value = appointment.time;
        document.getElementById('appointmentClientName').value = appointment.clientName;
        document.getElementById('appointmentClientPhone').value = appointment.clientPhone;
        document.getElementById('appointmentNotes').value = appointment.notes || '';
    }

    clearAppointmentForm() {
        document.getElementById('appointmentForm').reset();
        document.getElementById('appointmentId').value = '';
    }

    async saveAppointment() {
        const form = document.getElementById('appointmentForm');
        const formData = new FormData(form);
        
        const appointmentData = {
            professionalId: formData.get('professionalId'),
            serviceId: formData.get('serviceId'),
            date: formData.get('date'),
            time: formData.get('time'),
            clientName: formData.get('clientName'),
            clientPhone: formData.get('clientPhone'),
            notes: formData.get('notes')
        };
        
        // Validar campos obrigatórios
        if (!appointmentData.professionalId || !appointmentData.serviceId || 
            !appointmentData.date || !appointmentData.time || 
            !appointmentData.clientName || !appointmentData.clientPhone) {
            alert('Todos os campos obrigatórios devem ser preenchidos');
            return;
        }
        
        try {
            const appointmentId = document.getElementById('appointmentId').value;
            const url = appointmentId ? `/api/appointments/${appointmentId}` : '/api/appointments';
            const method = appointmentId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(appointmentData)
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                this.closeAppointmentModal();
                await this.loadAppointments();
                await this.loadStatistics();
            } else {
                const error = await response.json();
                alert(error.message);
            }
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            alert('Erro ao salvar agendamento');
        }
    }

    async confirmAppointment(appointmentId) {
        if (confirm('Deseja confirmar este agendamento?')) {
            try {
                const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    await this.loadAppointments();
                    await this.loadStatistics();
                } else {
                    const error = await response.json();
                    alert(error.message);
                }
            } catch (error) {
                console.error('Erro ao confirmar agendamento:', error);
                alert('Erro ao confirmar agendamento');
            }
        }
    }

    async cancelAppointment(appointmentId) {
        const reason = prompt('Motivo do cancelamento (opcional):');
        
        if (reason !== null) {
            try {
                const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ reason })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    await this.loadAppointments();
                    await this.loadStatistics();
                } else {
                    const error = await response.json();
                    alert(error.message);
                }
            } catch (error) {
                console.error('Erro ao cancelar agendamento:', error);
                alert('Erro ao cancelar agendamento');
            }
        }
    }

    async completeAppointment(appointmentId) {
        if (confirm('Deseja finalizar este agendamento? Isso criará uma receita automaticamente.')) {
            try {
                const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    await this.loadAppointments();
                    await this.loadStatistics();
                } else {
                    const error = await response.json();
                    alert(error.message);
                }
            } catch (error) {
                console.error('Erro ao finalizar agendamento:', error);
                alert('Erro ao finalizar agendamento');
            }
        }
    }

    async editAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt._id === appointmentId);
        if (appointment) {
            this.openAppointmentModal(appointment);
        }
    }

    async deleteAppointment(appointmentId) {
        if (confirm('Deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
            try {
                const response = await fetch(`/api/appointments/${appointmentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(data.message);
                    await this.loadAppointments();
                    await this.loadStatistics();
                } else {
                    const error = await response.json();
                    alert(error.message);
                }
            } catch (error) {
                console.error('Erro ao excluir agendamento:', error);
                alert('Erro ao excluir agendamento');
            }
        }
    }

    loadCalendar() {
        // Implementar visualização em calendário
        console.log('Carregando calendário...');
    }

    loadDailyAgenda() {
        // Implementar agenda do dia
        console.log('Carregando agenda do dia...');
    }
}

// Event listeners para o modal
document.addEventListener('DOMContentLoaded', () => {
    // Mudança de profissional
    document.getElementById('appointmentProfessional').addEventListener('change', (e) => {
        const professionalId = e.target.value;
        if (professionalId) {
            agendaManager.populateServiceSelect(professionalId);
        }
    });
    
    // Mudança de data
    document.getElementById('appointmentDate').addEventListener('change', (e) => {
        const professionalId = document.getElementById('appointmentProfessional').value;
        const date = e.target.value;
        if (professionalId && date) {
            agendaManager.populateTimeSelect(professionalId, date);
        }
    });
    
    // Mudança de profissional para carregar horários
    document.getElementById('appointmentProfessional').addEventListener('change', (e) => {
        const professionalId = e.target.value;
        const date = document.getElementById('appointmentDate').value;
        if (professionalId && date) {
            agendaManager.populateTimeSelect(professionalId, date);
        }
    });
});

// Inicializar quando a página carregar
let agendaManager;
// Comentado para inicializar apenas quando a aba for ativada
// document.addEventListener('DOMContentLoaded', () => {
//     agendaManager = new AgendaManager();
// });