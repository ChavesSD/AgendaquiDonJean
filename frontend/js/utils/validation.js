// ==================== SISTEMA DE VALIDAÇÃO ====================

class ValidationUtils {
    constructor() {
        this.rules = {
            // Validação de nome
            name: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
                message: 'Nome deve conter apenas letras e ter entre 2 e 50 caracteres'
            },
            
            // Validação de telefone
            phone: {
                required: true,
                pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/,
                message: 'Telefone deve ter 10 ou 11 dígitos'
            },
            
            // Validação de email
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email deve ter formato válido'
            },
            
            // Validação de preço
            price: {
                required: true,
                min: 0.01,
                max: 99999.99,
                message: 'Preço deve ser entre R$ 0,01 e R$ 99.999,99'
            },
            
            // Validação de data
            date: {
                required: true,
                message: 'Data é obrigatória'
            },
            
            // Validação de horário
            time: {
                required: true,
                pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                message: 'Horário deve estar no formato HH:MM'
            },
            
            // Validação de quantidade
            quantity: {
                required: true,
                min: 1,
                max: 9999,
                message: 'Quantidade deve ser entre 1 e 9999'
            }
        };
    }

    // Validar um campo específico
    validateField(fieldName, value, customRules = {}) {
        const rule = { ...this.rules[fieldName], ...customRules };
        const errors = [];

        // Verificar se é obrigatório
        if (rule.required && (!value || value.toString().trim() === '')) {
            errors.push(`${this.getFieldLabel(fieldName)} é obrigatório`);
            return errors;
        }

        // Se não é obrigatório e está vazio, não validar mais
        if (!rule.required && (!value || value.toString().trim() === '')) {
            return errors;
        }

        // Validar comprimento mínimo
        if (rule.minLength && value.toString().length < rule.minLength) {
            errors.push(`${this.getFieldLabel(fieldName)} deve ter pelo menos ${rule.minLength} caracteres`);
        }

        // Validar comprimento máximo
        if (rule.maxLength && value.toString().length > rule.maxLength) {
            errors.push(`${this.getFieldLabel(fieldName)} deve ter no máximo ${rule.maxLength} caracteres`);
        }

        // Validar valor mínimo
        if (rule.min !== undefined && parseFloat(value) < rule.min) {
            errors.push(`${this.getFieldLabel(fieldName)} deve ser maior que ${rule.min}`);
        }

        // Validar valor máximo
        if (rule.max !== undefined && parseFloat(value) > rule.max) {
            errors.push(`${this.getFieldLabel(fieldName)} deve ser menor que ${rule.max}`);
        }

        // Validar padrão regex
        if (rule.pattern && !rule.pattern.test(value.toString())) {
            errors.push(rule.message || `${this.getFieldLabel(fieldName)} tem formato inválido`);
        }

        return errors;
    }

    // Validar formulário completo
    validateForm(formData, rules = {}) {
        const errors = {};
        let isValid = true;

        for (const [fieldName, value] of Object.entries(formData)) {
            const fieldRules = rules[fieldName] || {};
            const fieldErrors = this.validateField(fieldName, value, fieldRules);
            
            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    // Validar dados de agendamento
    validateAppointment(data) {
        const rules = {
            clientName: this.rules.name,
            clientLastName: this.rules.name,
            clientPhone: this.rules.phone,
            date: this.rules.date,
            time: this.rules.time,
            professional: { required: true, message: 'Profissional é obrigatório' },
            service: { required: true, message: 'Serviço é obrigatório' }
        };

        return this.validateForm(data, rules);
    }

    // Validar dados de serviço
    validateService(data) {
        const rules = {
            name: this.rules.name,
            price: this.rules.price,
            duration: { 
                required: true, 
                min: 15, 
                max: 480, 
                message: 'Duração deve ser entre 15 e 480 minutos' 
            },
            commission: { 
                required: true, 
                min: 0, 
                max: 100, 
                message: 'Comissão deve ser entre 0% e 100%' 
            }
        };

        return this.validateForm(data, rules);
    }

    // Validar dados de profissional
    validateProfessional(data) {
        const rules = {
            firstName: this.rules.name,
            lastName: this.rules.name,
            email: this.rules.email,
            phone: this.rules.phone,
            dailyCapacity: { 
                required: true, 
                min: 1, 
                max: 20, 
                message: 'Capacidade diária deve ser entre 1 e 20 atendimentos' 
            }
        };

        return this.validateForm(data, rules);
    }

    // Validar dados de produto
    validateProduct(data) {
        const rules = {
            name: this.rules.name,
            price: this.rules.price,
            quantity: this.rules.quantity,
            category: { required: true, message: 'Categoria é obrigatória' }
        };

        return this.validateForm(data, rules);
    }

    // Validar dados financeiros
    validateFinancial(data) {
        const rules = {
            name: this.rules.name,
            value: this.rules.price,
            date: this.rules.date
        };

        return this.validateForm(data, rules);
    }

    // Obter label do campo
    getFieldLabel(fieldName) {
        const labels = {
            clientName: 'Nome do cliente',
            clientLastName: 'Sobrenome do cliente',
            clientPhone: 'Telefone do cliente',
            firstName: 'Nome',
            lastName: 'Sobrenome',
            email: 'Email',
            phone: 'Telefone',
            name: 'Nome',
            price: 'Preço',
            value: 'Valor',
            date: 'Data',
            time: 'Horário',
            duration: 'Duração',
            commission: 'Comissão',
            quantity: 'Quantidade',
            category: 'Categoria',
            professional: 'Profissional',
            service: 'Serviço',
            dailyCapacity: 'Capacidade diária'
        };

        return labels[fieldName] || fieldName;
    }

    // Formatar telefone
    formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        return phone;
    }

    // Formatar preço
    formatPrice(price) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) return '0,00';
        
        return numPrice.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Validar data futura
    validateFutureDate(date) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return ['Data deve ser futura'];
        }
        
        return [];
    }

    // Validar horário de funcionamento
    validateBusinessHours(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        
        // Horário de funcionamento: 8:00 às 18:00
        const openTime = 8 * 60; // 8:00
        const closeTime = 18 * 60; // 18:00
        
        if (timeInMinutes < openTime || timeInMinutes > closeTime) {
            return ['Horário deve estar entre 08:00 e 18:00'];
        }
        
        return [];
    }
}

// Instância global
window.validationUtils = new ValidationUtils();

// Função helper para mostrar erros
window.showValidationErrors = function(errors, containerId = 'validation-errors') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (Object.keys(errors).length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    let html = '<div class="validation-errors">';
    html += '<h4>Corrija os seguintes erros:</h4>';
    html += '<ul>';
    
    for (const [field, fieldErrors] of Object.entries(errors)) {
        fieldErrors.forEach(error => {
            html += `<li>${error}</li>`;
        });
    }
    
    html += '</ul></div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
};

// Função helper para limpar erros
window.clearValidationErrors = function(containerId = 'validation-errors') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
};
