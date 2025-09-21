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
    currentMonth: new Date(),
    availableTimes: []
};

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
});

// Carregar configurações da empresa
async function loadCompanySettings() {
    try {
        const response = await fetch('/api/public/company-settings');
        const data = await response.json();
        
        if (data) {
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
                alert('Por favor, selecione um profissional.');
                return false;
            }
            break;
        case 3:
            if (!bookingState.selectedService) {
                alert('Por favor, selecione um serviço.');
                return false;
            }
            break;
        case 4:
            if (!bookingState.selectedDate || !bookingState.selectedTime) {
                alert('Por favor, selecione uma data e horário.');
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
        alert('Erro ao carregar profissionais. Tente novamente.');
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
        alert('Erro ao carregar serviços. Tente novamente.');
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
        
        card.innerHTML = `
            <h3 class="service-name">${service.name}</h3>
            <p class="service-description">${service.description || 'Descrição não disponível'}</p>
            <div class="service-price">R$ ${(service.price || 0).toFixed(2)}</div>
            <div class="service-duration">${service.duration || 0} ${service.durationUnit || 'min'}</div>
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
        const response = await fetch('/api/public/appointments');
        const data = await response.json();
        
        if (data.success) {
            bookingState.appointments = data.appointments;
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
    
    // Verificar se há agendamentos para esta data
    const dateStr = date.toISOString().split('T')[0];
    const hasAppointments = bookingState.appointments.some(apt => {
        const aptDate = new Date(apt.date).toISOString().split('T')[0];
        return aptDate === dateStr && 
               apt.professional._id === bookingState.selectedProfessional._id &&
               ['pending', 'confirmed'].includes(apt.status);
    });
    
    return !hasAppointments;
}

function selectDate(date) {
    // Remover seleção anterior
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Selecionar nova data
    event.currentTarget.classList.add('selected');
    bookingState.selectedDate = date;
    
    // Carregar horários disponíveis
    loadAvailableTimes(date);
}

function loadAvailableTimes(date) {
    const timeSlots = document.getElementById('timeSlots');
    timeSlots.innerHTML = '';
    
    // Horários de funcionamento (8h às 18h)
    const startHour = 8;
    const endHour = 18;
    const serviceDuration = bookingState.selectedService.duration;
    
    // Gerar horários disponíveis
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Verificar se o horário está disponível
            if (isTimeAvailable(date, timeString, serviceDuration)) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = timeString;
                timeSlot.onclick = () => selectTime(timeString);
                timeSlots.appendChild(timeSlot);
            }
        }
    }
}

function isTimeAvailable(date, time, duration) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Verificar se há conflitos com agendamentos existentes
    return !bookingState.appointments.some(apt => {
        const aptDate = new Date(apt.date).toISOString().split('T')[0];
        if (aptDate !== dateStr || apt.professional._id !== bookingState.selectedProfessional._id) {
            return false;
        }
        
        if (!['pending', 'confirmed'].includes(apt.status)) {
            return false;
        }
        
        // Verificar sobreposição de horários
        const aptTime = apt.time;
        const aptStart = timeToMinutes(aptTime);
        const aptEnd = aptStart + apt.service.duration;
        const newStart = timeToMinutes(time);
        const newEnd = newStart + duration;
        
        return (newStart < aptEnd && newEnd > aptStart);
    });
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
    
    document.getElementById('summaryTime').textContent = bookingState.selectedTime;
    
    document.getElementById('summaryClient').textContent = 
        `${bookingState.clientData.name} ${bookingState.clientData.lastName}`;
    
    document.getElementById('summaryPhone').textContent = bookingState.clientData.phone;
}

// Confirmar agendamento
async function confirmBooking() {
    try {
        showLoading(true);
        
        const appointmentData = {
            professionalId: bookingState.selectedProfessional._id,
            serviceId: bookingState.selectedService._id,
            date: bookingState.selectedDate.toISOString(),
            time: bookingState.selectedTime,
            clientName: bookingState.clientData.name,
            clientLastName: bookingState.clientData.lastName,
            clientPhone: bookingState.clientData.phone
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
            alert('Erro ao criar agendamento: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        alert('Erro ao confirmar agendamento. Tente novamente.');
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
        currentMonth: new Date(),
        availableTimes: []
    };
    
    showStep(1);
    updateProgress();
    document.getElementById('clientForm').reset();
}
