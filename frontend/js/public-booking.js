// Estado global do agendamento
let bookingState = {
    currentStep: 1,
    selectedProfessional: null,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    clientData: {},
    professionals: [],
    services: [],
    appointments: [],
    companySettings: null,
    currentMonth: new Date(),
    availableTimes: []
};

// Variáveis para controle de atualização automática
let autoRefreshInterval = null;
let lastAppointmentsCount = 0;
let userActive = true;
let lastActivityTime = Date.now();

// Elementos DOM
const progressFill = document.getElementById('progressFill');
const loadingOverlay = document.getElementById('loadingOverlay');
const successModal = document.getElementById('successModal');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadCompanySettings();
    loadProfessionals();
    updateProgress();
    setupPhoneMask();
    
    // Iniciar atualização automática após carregar dados iniciais
    setTimeout(() => {
        startAutoRefresh();
    }, 5000); // Aguardar 5 segundos para carregar dados iniciais
    
    // Detectar atividade do usuário
    setupUserActivityDetection();
});

// Parar atualização automática quando a página for fechada
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// Configurar detecção de atividade do usuário
function setupUserActivityDetection() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            const wasInactive = !userActive;
            userActive = true;
            lastActivityTime = Date.now();
            
            // Se o usuário estava inativo e voltou a ficar ativo, verificar mudanças imediatamente
            if (wasInactive) {
                console.log('👤 Usuário voltou a ficar ativo - verificando mudanças...');
                checkForAppointmentChanges();
            }
        }, true);
    });
    
    // Verificar se usuário está inativo a cada 30 segundos
    setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTime;
        
        if (timeSinceLastActivity > 60000) { // 1 minuto de inatividade
            userActive = false;
        } else {
            userActive = true;
        }
    }, 30000);
}

// Carregar configurações da empresa
async function loadCompanySettings() {
    try {
        const response = await fetch('/api/public/company-settings');
        const data = await response.json();
        
        if (data) {
            bookingState.companySettings = data;
            updateCompanyInfo(data);
        }
    } catch (error) {
        console.error('Erro ao carregar configurações da empresa:', error);
        // Manter valores padrão em caso de erro
    }
}

function updateCompanyInfo(settings) {
    // Atualizar nome da empresa
    const companyNameElement = document.getElementById('companyName');
    if (companyNameElement && settings.companyName) {
        companyNameElement.textContent = settings.companyName;
    }
    
    // Atualizar horário de funcionamento
    const workingHoursElement = document.getElementById('workingHours');
    if (workingHoursElement && settings.workingHours) {
        const workingHours = formatWorkingHours(settings.workingHours);
        workingHoursElement.textContent = `Horário de Funcionamento: ${workingHours}`;
    } else if (workingHoursElement) {
        workingHoursElement.textContent = 'Horário de Funcionamento: Seg-Sex 8h às 18h';
    }
    
    // Atualizar WhatsApp
    const whatsappElement = document.getElementById('whatsappContact');
    if (whatsappElement) {
        if (settings.whatsapp && settings.whatsapp.trim()) {
            whatsappElement.textContent = `WhatsApp: ${settings.whatsapp}`;
        } else {
            whatsappElement.textContent = 'WhatsApp: (11) 99999-9999';
        }
    }
    
    // Atualizar endereço
    const addressElement = document.getElementById('companyAddress');
    if (addressElement && settings.street && settings.number && settings.neighborhood && settings.city && settings.state) {
        const address = `${settings.street}, ${settings.number} - ${settings.neighborhood}, ${settings.city}/${settings.state}`;
        addressElement.textContent = `Localização: ${address}`;
    } else if (addressElement) {
        addressElement.textContent = 'Localização: Rua das Flores, 123 - Centro';
    }
}

function formatWorkingHours(workingHours) {
    if (!workingHours) return 'Seg-Sex 8h às 18h';
    
    let hoursText = '';
    
    // Dias úteis
    if (workingHours.weekdays) {
        hoursText += `Seg-Sex ${workingHours.weekdays.open} às ${workingHours.weekdays.close}`;
    }
    
    // Sábado
    if (workingHours.saturday && workingHours.saturday.enabled) {
        if (hoursText) hoursText += ', ';
        hoursText += `Sáb ${workingHours.saturday.open} às ${workingHours.saturday.close}`;
    }
    
    // Domingo
    if (workingHours.sunday && workingHours.sunday.enabled) {
        if (hoursText) hoursText += ', ';
        hoursText += `Dom ${workingHours.sunday.open} às ${workingHours.sunday.close}`;
    }
    
    return hoursText || 'Seg-Sex 8h às 18h';
}

// ==================== VALIDAÇÕES DE NEGÓCIO ====================

// Verificar se a empresa está aberta em um determinado dia e horário
function isBusinessOpen(date, time) {
    if (!bookingState.companySettings || !bookingState.companySettings.workingHours) {
        return true; // Se não há configuração, permitir
    }
    
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, etc.
    const workingHours = bookingState.companySettings.workingHours;
    
    // Verificar se é dia útil (segunda a sexta)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return isTimeInRange(time, workingHours.weekdays.open, workingHours.weekdays.close);
    }
    
    // Verificar se é sábado
    if (dayOfWeek === 6) {
        if (!workingHours.saturday.enabled) return false;
        return isTimeInRange(time, workingHours.saturday.open, workingHours.saturday.close);
    }
    
    // Verificar se é domingo
    if (dayOfWeek === 0) {
        if (!workingHours.sunday.enabled) return false;
        return isTimeInRange(time, workingHours.sunday.open, workingHours.sunday.close);
    }
    
    return false;
}

// Verificar se um horário está dentro de um intervalo
function isTimeInRange(time, startTime, endTime) {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

// Verificar se um horário já passou no dia atual
function isTimeInPast(date, time) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const appointmentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Se não é hoje, não está no passado
    if (appointmentDate.getTime() !== today.getTime()) {
        return false;
    }
    
    // Se é hoje, verificar se o horário já passou
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDateTime = new Date(today);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    return appointmentDateTime <= now;
}

// Verificar capacidade diária do profissional
function isProfessionalCapacityAvailable(professional, date) {
    if (!professional.dailyCapacity || professional.dailyCapacity <= 0) {
        return true; // Se não há limite, permitir
    }
    
    const dateStr = date.toISOString().split('T')[0];
    const appointmentsCount = bookingState.appointments.filter(apt => {
        const aptDate = new Date(apt.date).toISOString().split('T')[0];
        return aptDate === dateStr && 
               apt.professional._id === professional._id &&
               ['pending', 'confirmed'].includes(apt.status);
    }).length;
    
    return appointmentsCount < professional.dailyCapacity;
}

// Verificar conflitos de horário considerando duração do serviço
function hasTimeConflict(date, time, serviceDuration, professionalId) {
    const dateStr = date.toISOString().split('T')[0];
    const newStartMinutes = timeToMinutes(time);
    const newEndMinutes = newStartMinutes + serviceDuration;
    
    console.log(`🔍 Verificando conflito para ${time} (${serviceDuration}min) no dia ${dateStr} para profissional ${professionalId}`);
    
    const hasConflict = bookingState.appointments.some(apt => {
        const aptDate = new Date(apt.date).toISOString().split('T')[0];
        
        // Verificar se é o mesmo dia e profissional
        if (aptDate !== dateStr || apt.professional._id !== professionalId) {
            return false;
        }
        
        // Verificar se o agendamento está ativo (pending ou confirmed)
        if (!['pending', 'confirmed'].includes(apt.status)) {
            console.log(`⏭️  Agendamento ${apt.time} ignorado - status: ${apt.status}`);
            return false;
        }
        
        const aptStartMinutes = timeToMinutes(apt.time);
        const aptServiceDuration = getServiceDurationInMinutes(apt.service);
        const aptEndMinutes = aptStartMinutes + aptServiceDuration;
        
        console.log(`📅 Agendamento existente: ${apt.time} (${aptServiceDuration}min) - status: ${apt.status}`);
        console.log(`⏰ Período existente: ${aptStartMinutes}min até ${aptEndMinutes}min`);
        console.log(`⏰ Novo período: ${newStartMinutes}min até ${newEndMinutes}min`);
        
        // Verificar sobreposição: novo agendamento não pode começar antes do anterior terminar
        // e não pode terminar depois do próximo começar
        // Condição: (novoInicio < existenteFim) E (novoFim > existenteInicio)
        // IMPORTANTE: Se o agendamento existente termina exatamente quando o novo começa, não há conflito
        // Mas se o novo agendamento começa exatamente quando o existente termina, também não há conflito
        const isOverlapping = (newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes);
        
        if (isOverlapping) {
            console.log(`❌ CONFLITO DETECTADO com agendamento ${apt.time} (status: ${apt.status})`);
        }
        
        return isOverlapping;
    });
    
    if (!hasConflict) {
        console.log(`✅ Horário ${time} disponível`);
    }
    
    return hasConflict;
}

// Máscara para telefone
function setupPhoneMask() {
    const phoneInput = document.getElementById('clientPhone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 11) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 7) {
            value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        }
        e.target.value = value;
    });
}

// Navegação entre etapas
function nextStep() {
    if (validateCurrentStep()) {
        if (bookingState.currentStep < 6) {
            bookingState.currentStep++;
            showStep(bookingState.currentStep);
            updateProgress();
            
            // Carregar dados específicos da etapa
            if (bookingState.currentStep === 3) {
                loadServices();
            } else if (bookingState.currentStep === 4) {
                loadAppointments();
                generateCalendar();
            } else if (bookingState.currentStep === 6) {
                updateSummary();
            }
        }
    }
}

function prevStep() {
    if (bookingState.currentStep > 1) {
        bookingState.currentStep--;
        showStep(bookingState.currentStep);
        updateProgress();
    }
}

function showStep(step) {
    // Esconder todas as etapas
    document.querySelectorAll('.booking-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Mostrar etapa atual
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Atualizar indicadores de progresso
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
    
    // Desabilitar botões próximo ao mudar de etapa
    const nextProfessionalBtn = document.getElementById('nextProfessionalBtn');
    const nextServiceBtn = document.getElementById('nextServiceBtn');
    const nextTimeBtn = document.getElementById('nextTimeBtn');
    
    if (nextProfessionalBtn) {
        nextProfessionalBtn.disabled = !bookingState.selectedProfessional;
    }
    if (nextServiceBtn) {
        nextServiceBtn.disabled = !bookingState.selectedService;
    }
    if (nextTimeBtn) {
        nextTimeBtn.disabled = !bookingState.selectedDate || !bookingState.selectedTime;
    }
}

function updateProgress() {
    const progress = (bookingState.currentStep / 6) * 100;
    progressFill.style.width = `${progress}%`;
}

// Validação das etapas
function validateCurrentStep() {
    switch (bookingState.currentStep) {
        case 2:
            if (!bookingState.selectedProfessional) {
                showNotification('Por favor, selecione um profissional.', 'warning');
                return false;
            }
            break;
        case 3:
            if (!bookingState.selectedService) {
                showNotification('Por favor, selecione um serviço.', 'warning');
                return false;
            }
            break;
        case 4:
            if (!bookingState.selectedDate || !bookingState.selectedTime) {
                showNotification('Por favor, selecione uma data e horário.', 'warning');
                return false;
            }
            break;
        case 5:
            const form = document.getElementById('clientForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            // Salvar dados do cliente
            bookingState.clientData = {
                name: document.getElementById('clientName').value,
                lastName: document.getElementById('clientLastName').value,
                phone: document.getElementById('clientPhone').value,
                notes: document.getElementById('clientNotes').value
            };
            break;
    }
    return true;
}

// Carregar profissionais
async function loadProfessionals() {
    try {
        showLoading(true);
        const response = await fetch('/api/public/professionals');
        const data = await response.json();
        
        if (data.success) {
            bookingState.professionals = data.professionals.filter(p => p.status === 'active');
            renderProfessionals();
        }
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
            showNotification('Erro ao carregar profissionais. Tente novamente.', 'error');
        } finally {
            showLoading(false);
        }
}

function renderProfessionals() {
    const grid = document.getElementById('professionalsGrid');
    grid.innerHTML = '';
    
    bookingState.professionals.forEach(professional => {
        const card = document.createElement('div');
        card.className = 'professional-card';
        card.onclick = () => selectProfessional(professional);
        
        card.innerHTML = `
            <img src="${professional.photo || '/assets/default-avatar.png'}" 
                 alt="${professional.firstName}" 
                 class="professional-photo">
            <h3 class="professional-name">${professional.firstName} ${professional.lastName}</h3>
            <p class="professional-function">${professional.function || 'Profissional'}</p>
        `;
        
        grid.appendChild(card);
    });
}

function selectProfessional(professional) {
    // Remover seleção anterior
    document.querySelectorAll('.professional-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Selecionar novo profissional
    event.currentTarget.classList.add('selected');
    bookingState.selectedProfessional = professional;
    
    // Habilitar botão próximo
    const nextBtn = document.getElementById('nextProfessionalBtn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

// Carregar serviços
async function loadServices() {
    try {
        showLoading(true);
        const response = await fetch('/api/public/services');
        const data = await response.json();
        
        if (data.success) {
            // Filtrar serviços que o profissional selecionado pode realizar
            bookingState.services = data.services.filter(service => {
                const isActive = service.status === 'active';
                
                // Verificar se o profissional pode realizar este serviço
                const canPerform = service.professionals && service.professionals.some(profId => 
                    profId.toString() === bookingState.selectedProfessional._id.toString()
                );
                
                return isActive && canPerform;
            });
            
            renderServices();
        }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            showNotification('Erro ao carregar serviços. Tente novamente.', 'error');
        } finally {
            showLoading(false);
        }
}

function renderServices() {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = '';
    
    if (bookingState.services.length === 0) {
        grid.innerHTML = '<p>Nenhum serviço disponível para este profissional.</p>';
        return;
    }
    
    bookingState.services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.onclick = () => selectService(service);
        
        const durationText = service.durationUnit === 'hours' ? 
            `${service.duration}h` : `${service.duration}min`;
        
        card.innerHTML = `
            <h3 class="service-name">${service.name}</h3>
            <p class="service-description">${service.description || 'Descrição não disponível'}</p>
            <div class="service-price">R$ ${(service.price || 0).toFixed(2)}</div>
            <div class="service-duration">${durationText}</div>
        `;
        
        grid.appendChild(card);
    });
}

function selectService(service) {
    // Remover seleção anterior
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Selecionar novo serviço
    event.currentTarget.classList.add('selected');
    bookingState.selectedService = service;
    
    // Habilitar botão próximo
    const nextBtn = document.getElementById('nextServiceBtn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

// Carregar agendamentos
async function loadAppointments() {
    try {
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/public/appointments?t=${timestamp}`);
        const data = await response.json();
        
        if (data.success) {
            bookingState.appointments = data.appointments;
            lastAppointmentsCount = data.appointments.length; // Atualizar contador
            console.log('📋 Agendamentos carregados para verificação de conflitos:', data.appointments.length);
            console.log('📋 Agendamentos ativos:', data.appointments.map(apt => ({
                date: apt.date,
                time: apt.time,
                status: apt.status,
                professional: apt.professional?.firstName,
                service: apt.service?.name
            })));
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

// Gerar calendário
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthYear = document.getElementById('currentMonth');
    
    const year = bookingState.currentMonth.getFullYear();
    const month = bookingState.currentMonth.getMonth();
    
    monthYear.textContent = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).format(bookingState.currentMonth);
    
    // Cabeçalho do calendário
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    calendar.innerHTML = '';
    
    // Adicionar cabeçalho
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        dayHeader.style.padding = '10px';
        calendar.appendChild(dayHeader);
    });
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Gerar dias do calendário
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDate.getDate();
        
        // Verificar se é do mês atual
        if (currentDate.getMonth() !== month) {
            dayElement.classList.add('other-month');
        } else {
            // Verificar se a data está disponível
            if (isDateAvailable(currentDate)) {
                dayElement.classList.add('available');
                dayElement.onclick = () => selectDate(currentDate);
            } else {
                dayElement.classList.add('unavailable');
            }
        }
        
        calendar.appendChild(dayElement);
    }
}

function isDateAvailable(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Não permitir datas passadas
    if (date < today) return false;
    
    // Verificar se a empresa está aberta neste dia
    if (!bookingState.companySettings || !bookingState.companySettings.workingHours) {
        return true; // Se não há configuração, permitir
    }
    
    const dayOfWeek = date.getDay();
    const workingHours = bookingState.companySettings.workingHours;
    
    // Verificar se é um dia de funcionamento
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Dia útil - sempre aberto se configurado
        return true;
    } else if (dayOfWeek === 6) {
        // Sábado - verificar se está habilitado
        return workingHours.saturday.enabled;
    } else if (dayOfWeek === 0) {
        // Domingo - verificar se está habilitado
        return workingHours.sunday.enabled;
    }
    
    return false;
}

async function selectDate(date) {
    // Remover seleção anterior
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Selecionar nova data
    event.currentTarget.classList.add('selected');
    bookingState.selectedDate = date;
    
    // Verificar mudanças nos agendamentos antes de carregar horários
    await checkForAppointmentChanges();
    
    // Carregar horários disponíveis
    loadAvailableTimes(date).catch(error => {
        console.error('Erro ao carregar horários disponíveis:', error);
    });
}

async function loadAvailableTimes(date) {
    const timeSlots = document.getElementById('timeSlots');
    timeSlots.innerHTML = '<div class="loading-times">Carregando horários disponíveis...</div>';
    
    // Recarregar agendamentos para ter dados atualizados
    await loadAppointments();
    
    // Verificar se os agendamentos foram carregados
    console.log('📋 Agendamentos carregados para verificação:', bookingState.appointments.length);
    if (bookingState.appointments.length > 0) {
        console.log('📋 Primeiro agendamento:', bookingState.appointments[0]);
    }
    
    // Obter horários de funcionamento da empresa
    const workingHours = getWorkingHoursForDate(date);
    if (!workingHours) {
        timeSlots.innerHTML = '<div class="no-times">Não há horários disponíveis para este dia.</div>';
        return;
    }
    
    const serviceDuration = getServiceDurationInMinutes(bookingState.selectedService);
    const availableTimes = [];
    
    // Gerar horários baseados no horário de funcionamento
    const startTime = workingHours.open;
    const endTime = workingHours.close;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Gerar slots de 30 em 30 minutos
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Verificar se o horário está disponível
        if (isTimeAvailable(date, timeString, serviceDuration)) {
            availableTimes.push(timeString);
        }
    }
    
    // Renderizar horários disponíveis
    timeSlots.innerHTML = '';
    
    if (availableTimes.length === 0) {
        const durationText = bookingState.selectedService.durationUnit === 'hours' ? 
            `${bookingState.selectedService.duration}h` : `${bookingState.selectedService.duration}min`;
        timeSlots.innerHTML = `
            <div class="no-times">
                <p>Não há horários disponíveis para este dia.</p>
                <p><small>O serviço "${bookingState.selectedService.name}" tem duração de ${durationText}.</small></p>
            </div>
        `;
        return;
    }
    
    // Adicionar informação sobre a duração do serviço na seção específica
    const serviceInfoSection = document.getElementById('serviceInfoSection');
    const durationText = bookingState.selectedService.durationUnit === 'hours' ? 
        `${bookingState.selectedService.duration}h` : `${bookingState.selectedService.duration}min`;
    const durationMinutesText = `${serviceDuration} minutos`;
    
    serviceInfoSection.innerHTML = `
        <div class="service-info-content">
            <div class="service-info-left">
                <div class="service-info-item">
                    <strong>Serviço</strong>
                    <span>${bookingState.selectedService.name}</span>
                </div>
                <div class="service-info-item">
                    <strong>Duração</strong>
                    <span>${durationText} (${durationMinutesText})</span>
                </div>
            </div>
            <div class="service-info-right">
                <div class="service-info-description">
                    Os horários mostrados são o início do serviço. O serviço terminará ${serviceDuration} minutos depois.
                </div>
                <button onclick="refreshAvailableTimes()" class="refresh-btn">
                    <i class="fas fa-sync-alt"></i>
                    Atualizar
                </button>
            </div>
        </div>
    `;
    
    availableTimes.forEach(time => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.innerHTML = `
            <div class="time-start">${time}</div>
            <div class="time-end">${formatEndTime(time, serviceDuration)}</div>
        `;
        timeSlot.onclick = () => selectTime(time);
        timeSlots.appendChild(timeSlot);
    });
}

// Obter horários de funcionamento para uma data específica
function getWorkingHoursForDate(date) {
    if (!bookingState.companySettings || !bookingState.companySettings.workingHours) {
        return { open: '08:00', close: '18:00' }; // Horário padrão
    }
    
    const dayOfWeek = date.getDay();
    const workingHours = bookingState.companySettings.workingHours;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Dia útil
        return workingHours.weekdays;
    } else if (dayOfWeek === 6) {
        // Sábado
        return workingHours.saturday.enabled ? workingHours.saturday : null;
    } else if (dayOfWeek === 0) {
        // Domingo
        return workingHours.sunday.enabled ? workingHours.sunday : null;
    }
    
    return null;
}

function isTimeAvailable(date, time, duration) {
    // 1. Verificar se a empresa está aberta neste horário
    if (!isBusinessOpen(date, time)) {
        return false;
    }
    
    // 2. Verificar se o horário já passou (se for hoje)
    if (isTimeInPast(date, time)) {
        return false;
    }
    
    // 3. Verificar se o profissional tem capacidade disponível
    if (!isProfessionalCapacityAvailable(bookingState.selectedProfessional, date)) {
        return false;
    }
    
    // 4. Verificar se o horário + duração não ultrapassa o horário de fechamento
    const workingHours = getWorkingHoursForDate(date);
    if (workingHours) {
        const timeMinutes = timeToMinutes(time);
        const endTimeMinutes = timeToMinutes(workingHours.close);
        const serviceEndMinutes = timeMinutes + duration;
        
        if (serviceEndMinutes > endTimeMinutes) {
            return false;
        }
    }
    
    // 5. Verificar conflitos de horário considerando duração do serviço
    if (hasTimeConflict(date, time, duration, bookingState.selectedProfessional._id)) {
        return false;
    }
    
    return true;
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Função auxiliar para converter duração do serviço para minutos
function getServiceDurationInMinutes(service) {
    if (!service || !service.duration) return 0;
    
    if (service.durationUnit === 'hours') {
        return service.duration * 60; // Converter horas para minutos
    }
    
    return service.duration; // Já está em minutos
}

function formatEndTime(startTime, durationMinutes) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}

// Função para atualizar horários disponíveis manualmente
async function refreshAvailableTimes() {
    if (bookingState.selectedDate) {
        console.log('🔄 Atualizando horários disponíveis manualmente...');
        await loadAvailableTimes(bookingState.selectedDate);
    }
}

// Função para iniciar atualização automática
function startAutoRefresh() {
    // Parar intervalo anterior se existir
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Verificar mudanças a cada 15 segundos (mais frequente)
    autoRefreshInterval = setInterval(async () => {
        await checkForAppointmentChanges();
    }, 15000); // 15 segundos
    
    console.log('🔄 Atualização automática iniciada (verificação a cada 15s)');
}

// Função para parar atualização automática
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Atualização automática parada');
    }
}

// Função para verificar mudanças nos agendamentos
async function checkForAppointmentChanges() {
    // Só verificar se o usuário estiver ativo ou se for uma verificação manual
    if (!userActive) {
        return;
    }
    
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/public/appointments?t=${timestamp}`);
        const data = await response.json();
        
        if (data.success) {
            const currentCount = data.appointments.length;
            
            // Verificar se houve mudança no número de agendamentos
            if (currentCount !== lastAppointmentsCount) {
                console.log(`📊 Mudança detectada: ${lastAppointmentsCount} → ${currentCount} agendamentos`);
                lastAppointmentsCount = currentCount;
                
                // Atualizar dados
                bookingState.appointments = data.appointments;
                
                // Recarregar horários se uma data estiver selecionada
                if (bookingState.selectedDate) {
                    console.log('🔄 Recarregando horários devido a mudança nos agendamentos...');
                    await loadAvailableTimes(bookingState.selectedDate);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao verificar mudanças nos agendamentos:', error);
    }
}

function selectTime(time) {
    // Remover seleção anterior
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Selecionar novo horário
    event.currentTarget.classList.add('selected');
    bookingState.selectedTime = time;
    
    // Habilitar botão próximo
    const nextBtn = document.getElementById('nextTimeBtn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

// Navegação do calendário
function previousMonth() {
    bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() - 1);
    generateCalendar();
}

function nextMonth() {
    bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() + 1);
    generateCalendar();
}

// Atualizar resumo
function updateSummary() {
    document.getElementById('summaryProfessional').textContent = 
        `${bookingState.selectedProfessional.firstName} ${bookingState.selectedProfessional.lastName}`;
    
    document.getElementById('summaryService').textContent = 
        `${bookingState.selectedService.name} - R$ ${(bookingState.selectedService.price || 0).toFixed(2)}`;
    
    document.getElementById('summaryDate').textContent = 
        bookingState.selectedDate.toLocaleDateString('pt-BR');
    
    const serviceDuration = getServiceDurationInMinutes(bookingState.selectedService);
    const endTime = formatEndTime(bookingState.selectedTime, serviceDuration);
    const durationText = bookingState.selectedService.durationUnit === 'hours' ? 
        `${bookingState.selectedService.duration}h` : `${bookingState.selectedService.duration}min`;
    
    document.getElementById('summaryTime').textContent = 
        `${bookingState.selectedTime} - ${endTime} (${durationText})`;
    
    document.getElementById('summaryClient').textContent = 
        `${bookingState.clientData.name} ${bookingState.clientData.lastName}`;
    
    document.getElementById('summaryPhone').textContent = bookingState.clientData.phone;
}

// Confirmar agendamento
async function confirmBooking() {
    try {
        showLoading(true);
        
        // Validações finais antes de confirmar
        const serviceDuration = getServiceDurationInMinutes(bookingState.selectedService);
        
        // Verificar se o horário ainda está disponível (pode ter sido ocupado por outro usuário)
        if (!isTimeAvailable(bookingState.selectedDate, bookingState.selectedTime, serviceDuration)) {
            showNotification('Este horário não está mais disponível. Por favor, selecione outro horário.', 'warning');
            showLoading(false);
            return;
        }
        
        const appointmentData = {
            professionalId: bookingState.selectedProfessional._id,
            serviceId: bookingState.selectedService._id,
            date: bookingState.selectedDate.toISOString(),
            time: bookingState.selectedTime,
            clientName: bookingState.clientData.name,
            clientLastName: bookingState.clientData.lastName,
            clientPhone: bookingState.clientData.phone,
            notes: bookingState.clientData.notes || '',
            source: 'public_booking'
        };
        
        const response = await fetch('/api/public/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessModal();
        } else {
            showNotification('Erro ao criar agendamento: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        showNotification('Erro ao confirmar agendamento. Tente novamente.', 'error');
    } finally {
        showLoading(false);
    }
}

// Mostrar/ocultar loading
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Mostrar modal de sucesso
function showSuccessModal() {
    successModal.classList.add('active');
}

function closeSuccessModal() {
    successModal.classList.remove('active');
    // Resetar formulário
    resetBooking();
}

// Resetar agendamento
function resetBooking() {
    const companySettings = bookingState.companySettings; // Preservar configurações da empresa
    
    bookingState = {
        currentStep: 1,
        selectedProfessional: null,
        selectedService: null,
        selectedDate: null,
        selectedTime: null,
        clientData: {},
        professionals: [],
        services: [],
        appointments: [],
        companySettings: companySettings,
        currentMonth: new Date(),
        availableTimes: []
    };
    
    showStep(1);
    updateProgress();
    document.getElementById('clientForm').reset();
}
