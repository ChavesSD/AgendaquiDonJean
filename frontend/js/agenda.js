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
            console.log('🔑 Token encontrado:', token ? 'Sim' : 'Não');
            console.log('🔑 Token (primeiros 20 chars):', token ? token.substring(0, 20) + '...' : 'N/A');
            
            let url = '/api/appointments?';
            const params = new URLSearchParams();
            
            if (this.filters.startDate) params.append('startDate', this.filters.startDate);
            if (this.filters.endDate) params.append('endDate', this.filters.endDate);
            if (this.filters.professionalId) params.append('professionalId', this.filters.professionalId);
            
            url += params.toString();
            console.log('🌐 URL da requisição:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 Status da resposta:', response.status);
            console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const data = await response.json();
                console.log('📋 Resposta completa:', data);
                console.log('📋 Agendamentos carregados:', data.appointments ? data.appointments.length : 'N/A');
                this.appointments = data.appointments || [];
                this.renderAppointments();
            } else {
                const errorData = await response.json();
                console.error('❌ Erro na API:', errorData);
                console.error('❌ Status:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('💥 Erro ao carregar agendamentos:', error);
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
        } else if (tabName === 'contatos') {
            this.loadContacts();
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

    async loadCalendar() {
        console.log('📅 Carregando calendário...');
        
        // Inicializar variáveis do calendário - sempre o mês atual
        this.currentCalendarDate = new Date();
        this.calendarAppointments = [];
        
        // Configurar event listeners dos botões de navegação
        this.setupCalendarNavigation();
        
        // Atualizar exibição do mês atual
        this.updateCalendarMonth();
        
        // Carregar agendamentos para o mês atual
        await this.loadCalendarAppointments();
        
        // Renderizar calendário
        this.renderCalendar();
    }
    
    setupCalendarNavigation() {
        // Botão mês anterior
        const prevBtn = document.getElementById('prev-month');
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
                this.updateCalendarMonth();
                this.loadCalendarAppointments();
                this.renderCalendar();
            };
        }
        
        // Botão próximo mês
        const nextBtn = document.getElementById('next-month');
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
                this.updateCalendarMonth();
                this.loadCalendarAppointments();
                this.renderCalendar();
            };
        }
    }
    
    updateCalendarMonth() {
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        const monthElement = document.getElementById('current-month');
        if (monthElement) {
            monthElement.textContent = `${monthNames[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
        }
    }
    
    async loadCalendarAppointments() {
        try {
            const startDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), 1);
            const endDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() + 1, 0);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/appointments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.calendarAppointments = data.appointments || [];
                console.log(`📋 Agendamentos carregados para o calendário: ${this.calendarAppointments.length}`);
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos para o calendário:', error);
            this.calendarAppointments = [];
        }
    }
    
    renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        
        // Primeiro dia do mês
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Nomes dos dias da semana
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        // Criar HTML do calendário
        let calendarHTML = `
            <div class="calendar-grid">
                ${dayNames.map(day => `<div class="calendar-header">${day}</div>`).join('')}
        `;
        
        // Gerar dias do calendário (6 semanas)
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const dayNumber = currentDate.getDate();
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                const appointments = this.getAppointmentsForDate(currentDate);
                
                let dayClasses = 'calendar-day';
                if (!isCurrentMonth) dayClasses += ' other-month';
                if (isToday) dayClasses += ' today';
                if (appointments.length > 0) dayClasses += ' has-appointments';
                
                const appointmentCount = appointments.length;
                const appointmentDetails = this.getAppointmentDetailsByProfessional(appointments);
                
                calendarHTML += `
                    <div class="${dayClasses}" 
                         data-date="${currentDate.toISOString().split('T')[0]}"
                         data-appointments="${appointmentCount}"
                         data-appointment-details="${appointmentDetails}">
                        <div class="calendar-day-number">${dayNumber}</div>
                        ${appointmentCount > 0 ? `<div class="calendar-appointments">${appointmentCount} agendamento${appointmentCount > 1 ? 's' : ''}</div>` : ''}
                    </div>
                `;
            }
        }
        
        calendarHTML += '</div>';
        
        container.innerHTML = calendarHTML;
        
        // Adicionar tooltip personalizado
        this.setupCalendarTooltips();
        
        // Adicionar funcionalidade de clique nos dias
        this.setupCalendarDayClicks();
    }
    
    getAppointmentsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.calendarAppointments.filter(apt => {
            const aptDate = new Date(apt.date).toISOString().split('T')[0];
            return aptDate === dateStr;
        });
    }
    
    getAppointmentDetailsByProfessional(appointments) {
        if (appointments.length === 0) return '';
        
        const professionalCounts = {};
        appointments.forEach(apt => {
            const professionalName = apt.professional ? 
                `${apt.professional.firstName} ${apt.professional.lastName}` : 
                'Profissional não encontrado';
            
            professionalCounts[professionalName] = (professionalCounts[professionalName] || 0) + 1;
        });
        
        return Object.entries(professionalCounts)
            .map(([name, count]) => `${name}: ${count} agendamento${count > 1 ? 's' : ''}`)
            .join('\n');
    }
    
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    setupCalendarTooltips() {
        const calendarDays = document.querySelectorAll('.calendar-day[data-appointments]');
        
        calendarDays.forEach(day => {
            const appointmentCount = parseInt(day.dataset.appointments);
            
            if (appointmentCount > 0) {
                day.addEventListener('mouseenter', (e) => {
                    const appointmentDetails = day.dataset.appointmentDetails;
                    this.showCalendarTooltip(e, appointmentDetails, appointmentCount);
                });
                
                day.addEventListener('mousemove', (e) => {
                    if (this.currentTooltip) {
                        this.updateTooltipPosition(e);
                    }
                });
                
                day.addEventListener('mouseleave', () => {
                    this.hideCalendarTooltip();
                });
            }
        });
    }
    
    showCalendarTooltip(event, content, appointmentCount) {
        // Remover tooltip anterior se existir
        this.hideCalendarTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'calendar-tooltip';
        
        // Criar HTML com o layout correto: total no topo, depois detalhes por profissional
        const totalText = `${appointmentCount} agendamento${appointmentCount > 1 ? 's' : ''}`;
        const detailsText = content.replace(/\n/g, '<br>');
        
        tooltip.innerHTML = `
            <div class="tooltip-total">${totalText}</div>
            <div class="tooltip-details">${detailsText}</div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Posicionar tooltip onde o mouse está
        this.updateTooltipPosition(event);
        
        this.currentTooltip = tooltip;
    }
    
    updateTooltipPosition(event) {
        if (!this.currentTooltip) return;
        
        // Posicionar tooltip seguindo o mouse
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // Offset para que o tooltip não fique exatamente sobre o cursor
        const offsetX = 10;
        const offsetY = -10;
        
        this.currentTooltip.style.left = `${mouseX + offsetX}px`;
        this.currentTooltip.style.top = `${mouseY + offsetY}px`;
        this.currentTooltip.style.transform = 'translateY(-100%)';
    }
    
    hideCalendarTooltip() {
        if (this.currentTooltip) {
            document.body.removeChild(this.currentTooltip);
            this.currentTooltip = null;
        }
    }
    
    setupCalendarDayClicks() {
        const calendarDays = document.querySelectorAll('.calendar-day[data-date]');
        
        calendarDays.forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.target.closest('.calendar-day').dataset.date;
                const appointments = this.getAppointmentsForDate(new Date(date));
                
                if (appointments.length > 0) {
                    this.showAppointmentsModal(date, appointments);
                }
            });
        });
    }
    
    showAppointmentsModal(date, appointments) {
        // Criar modal para mostrar detalhes dos agendamentos
        const modal = document.createElement('div');
        modal.className = 'appointments-modal-overlay';
        modal.innerHTML = `
            <div class="appointments-modal">
                <div class="modal-header">
                    <h3>Agendamentos do dia ${new Date(date).toLocaleDateString('pt-BR')}</h3>
                    <button class="modal-close" onclick="this.closest('.appointments-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${appointments.map(apt => `
                        <div class="appointment-item">
                            <div class="appointment-time">${apt.time}</div>
                            <div class="appointment-details">
                                <div class="appointment-client">${apt.clientName} ${apt.clientLastName}</div>
                                <div class="appointment-service">${apt.service?.name || 'Serviço não encontrado'}</div>
                                <div class="appointment-professional">${apt.professional?.firstName} ${apt.professional?.lastName}</div>
                                <div class="appointment-status status-${apt.status}">${this.getStatusText(apt.status)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Concluído'
        };
        return statusMap[status] || status;
    }

    async loadContacts() {
        console.log('📞 Carregando contatos...');
        
        // Inicializar variáveis dos contatos
        this.contacts = [];
        this.currentPage = 1;
        this.contactsPerPage = 10;
        this.contactsFilter = '';
        this.contactsSourceFilter = '';
        
        // Configurar event listeners
        this.setupContactsEventListeners();
        
        // Carregar contatos
        await this.loadContactsData();
        
        // Renderizar contatos
        this.renderContacts();
    }
    
    setupContactsEventListeners() {
        // Botão sincronizar WhatsApp
        const syncBtn = document.getElementById('sync-contacts-btn');
        if (syncBtn) {
            syncBtn.onclick = () => this.syncWhatsAppContacts();
        }
        
        // Botão adicionar contato
        const addBtn = document.getElementById('add-contact-btn');
        if (addBtn) {
            addBtn.onclick = () => this.showAddContactModal();
        }
        
        // Busca de contatos
        const searchInput = document.getElementById('contact-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.contactsFilter = e.target.value;
                this.currentPage = 1;
                this.renderContacts();
            });
        }
        
        // Filtro por origem
        const sourceFilter = document.getElementById('contact-source-filter');
        if (sourceFilter) {
            sourceFilter.addEventListener('change', (e) => {
                this.contactsSourceFilter = e.target.value;
                this.currentPage = 1;
                this.renderContacts();
            });
        }
    }
    
    async loadContactsData() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/contacts', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.contacts = data.contacts || [];
                console.log(`📞 Contatos carregados: ${this.contacts.length}`);
            }
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            this.contacts = [];
        }
    }
    
    async syncWhatsAppContacts() {
        try {
            const syncBtn = document.getElementById('sync-contacts-btn');
            const originalText = syncBtn.innerHTML;
            
            // Mostrar loading
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
            syncBtn.disabled = true;
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/contacts/sync-whatsapp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Contatos sincronizados:', data.message);
                
                // Recarregar contatos
                await this.loadContactsData();
                this.renderContacts();
                
                // Mostrar sucesso
                this.showNotification('Contatos sincronizados com sucesso!', 'success');
            } else {
                const errorData = await response.json();
                this.showNotification(errorData.message || 'Erro ao sincronizar contatos', 'error');
            }
        } catch (error) {
            console.error('Erro ao sincronizar contatos:', error);
            this.showNotification('Erro ao sincronizar contatos', 'error');
        } finally {
            // Restaurar botão
            const syncBtn = document.getElementById('sync-contacts-btn');
            syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar WhatsApp';
            syncBtn.disabled = false;
        }
    }
    
    renderContacts() {
        const container = document.getElementById('contacts-list');
        const paginationContainer = document.getElementById('contacts-pagination');
        
        if (!container) return;
        
        // Filtrar contatos
        let filteredContacts = this.contacts.filter(contact => {
            const matchesSearch = !this.contactsFilter || 
                contact.name.toLowerCase().includes(this.contactsFilter.toLowerCase()) ||
                contact.phone.includes(this.contactsFilter);
            
            const matchesSource = !this.contactsSourceFilter || 
                contact.source === this.contactsSourceFilter;
            
            return matchesSearch && matchesSource;
        });
        
        // Ordenar alfabeticamente
        filteredContacts.sort((a, b) => a.name.localeCompare(b.name));
        
        // Calcular paginação
        const totalPages = Math.ceil(filteredContacts.length / this.contactsPerPage);
        const startIndex = (this.currentPage - 1) * this.contactsPerPage;
        const endIndex = startIndex + this.contactsPerPage;
        const pageContacts = filteredContacts.slice(startIndex, endIndex);
        
        // Renderizar contatos
        if (pageContacts.length === 0) {
            container.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-address-book"></i>
                    <h3>Nenhum contato encontrado</h3>
                    <p>${this.contactsFilter ? 'Tente ajustar os filtros de busca.' : 'Adicione contatos manualmente ou sincronize com o WhatsApp.'}</p>
                </div>
            `;
        } else {
            container.innerHTML = pageContacts.map(contact => this.renderContactItem(contact)).join('');
        }
        
        // Renderizar paginação
        this.renderPagination(paginationContainer, totalPages);
    }
    
    renderContactItem(contact) {
        const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const sourceClass = contact.source === 'whatsapp' ? 'whatsapp' : 'manual';
        const sourceText = contact.source === 'whatsapp' ? 'WhatsApp' : 'Manual';
        
        return `
            <div class="contact-item">
                <div class="contact-avatar">${initials}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-phone">${contact.phone}</div>
                    <span class="contact-source ${sourceClass}">${sourceText}</span>
                </div>
                <div class="contact-actions">
                    <button class="btn btn-sm btn-outline" onclick="agendaManager.editContact('${contact._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="agendaManager.sendWhatsAppMessage('${contact.phone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="agendaManager.deleteContact('${contact._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderPagination(container, totalPages) {
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Botão anterior
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="agendaManager.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="${i === this.currentPage ? 'active' : ''}" onclick="agendaManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span>...</span>';
            }
        }
        
        // Botão próximo
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="agendaManager.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        container.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderContacts();
    }
    
    showAddContactModal() {
        // Implementar modal para adicionar contato
        console.log('Mostrar modal para adicionar contato');
    }
    
    editContact(contactId) {
        // Implementar edição de contato
        console.log('Editar contato:', contactId);
    }
    
    deleteContact(contactId) {
        if (confirm('Tem certeza que deseja excluir este contato?')) {
            // Implementar exclusão de contato
            console.log('Excluir contato:', contactId);
        }
    }
    
    sendWhatsAppMessage(phone) {
        // Abrir WhatsApp Web com o número
        const cleanPhone = phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${cleanPhone}`;
        window.open(whatsappUrl, '_blank');
    }
    
    showNotification(message, type = 'info') {
        // Implementar sistema de notificações
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}


// Event listeners para o modal
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando componentes...');
    
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
document.addEventListener('DOMContentLoaded', () => {
    agendaManager = new AgendaManager();
    
    // Se a aba de calendário estiver ativa, carregar o calendário
    const calendarTab = document.getElementById('calendario-tab');
    if (calendarTab && calendarTab.classList.contains('active')) {
        agendaManager.loadCalendar();
    }
});