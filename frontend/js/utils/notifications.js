/**
 * Sistema de Notificações e Confirmações do Agendaqui
 * 
 * Este arquivo centraliza todas as funções de notificação e confirmação
 * para garantir consistência em todo o sistema.
 */

// ==================== SISTEMA DE NOTIFICAÇÕES ====================

// Criar container de notificações se não existir
function ensureNotificationsContainer() {
    let container = document.querySelector('.notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    return container;
}

// Sistema de notificações melhorado
function showNotification(message, type = 'success', options = {}) {
    const container = ensureNotificationsContainer();
    
    // Configurações padrão
    const config = {
        title: options.title || getDefaultTitle(type),
        duration: options.duration || 4000,
        closable: options.closable !== false,
        persistent: options.persistent || false,
        ...options
    };

    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    const closeBtn = config.closable ? 
        `<button class="notification-close" onclick="this.closest('.notification').remove()">
            <i class="fas fa-times"></i>
        </button>` : '';

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${config.title}</div>
            <div class="notification-message">${message}</div>
        </div>
        ${closeBtn}
        ${!config.persistent ? '<div class="notification-progress"></div>' : ''}
    `;

    // Adicionar ao container
    container.appendChild(notification);

    // Auto-remover se não for persistente
    if (!config.persistent) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, config.duration);
    }

    return notification;
}

// Obter título padrão baseado no tipo
function getDefaultTitle(type) {
    const titles = {
        success: 'Sucesso',
        error: 'Erro',
        warning: 'Atenção',
        info: 'Informação'
    };
    return titles[type] || 'Notificação';
}

// Obter ícone baseado no tipo
function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check',
        error: 'fa-times',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-bell';
}

// ==================== SISTEMA DE CONFIRMAÇÃO ====================

// Modal de confirmação personalizado
function showConfirmation(options) {
    return new Promise((resolve) => {
        const config = {
            title: options.title || 'Confirmar ação',
            message: options.message || 'Tem certeza que deseja continuar?',
            details: options.details || '',
            type: options.type || 'warning',
            confirmText: options.confirmText || 'Confirmar',
            cancelText: options.cancelText || 'Cancelar',
            confirmButtonType: options.confirmButtonType || 'danger',
            ...options
        };

        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';
        
        const icon = getConfirmationIcon(config.type);
        const confirmBtnClass = `confirmation-btn-${config.confirmButtonType}`;
        
        overlay.innerHTML = `
            <div class="confirmation-modal">
                <div class="confirmation-header">
                    <div class="confirmation-icon ${config.type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <h3 class="confirmation-title">${config.title}</h3>
                </div>
                <div class="confirmation-body">
                    <p class="confirmation-message">${config.message}</p>
                    ${config.details ? `<div class="confirmation-details">${config.details}</div>` : ''}
                    ${config.showInput ? `
                        <div class="confirmation-input">
                            <input type="text" id="confirmation-input" placeholder="${config.inputPlaceholder || ''}" class="form-control">
                        </div>
                    ` : ''}
                </div>
                <div class="confirmation-footer">
                    <button class="confirmation-btn confirmation-btn-secondary" data-action="cancel">
                        <i class="fas fa-times"></i>
                        ${config.cancelText}
                    </button>
                    <button class="confirmation-btn ${confirmBtnClass}" data-action="confirm">
                        <i class="fas fa-check"></i>
                        ${config.confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        const handleAction = (action) => {
            let inputValue = null;
            if (action === 'confirm' && config.showInput) {
                const input = overlay.querySelector('#confirmation-input');
                inputValue = input ? input.value : null;
            }
            overlay.remove();
            resolve(action === 'confirm' ? (config.showInput ? inputValue : true) : false);
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleAction('cancel');
            } else if (e.target.closest('[data-action]')) {
                const action = e.target.closest('[data-action]').dataset.action;
                handleAction(action);
            }
        });

        // Fechar com ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleAction('cancel');
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

// Obter ícone de confirmação baseado no tipo
function getConfirmationIcon(type) {
    const icons = {
        danger: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        success: 'fa-check-circle'
    };
    return icons[type] || 'fa-question-circle';
}

// ==================== FUNÇÕES DE CONVENIÊNCIA ====================

// Confirmação de exclusão
function confirmDelete(itemName = 'item', details = '') {
    return showConfirmation({
        title: 'Confirmar exclusão',
        message: `Tem certeza que deseja excluir ${itemName}?`,
        details: details || 'Esta ação não pode ser desfeita.',
        type: 'danger',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
}

// Confirmação de ação geral
function confirmAction(title, message, details = '') {
    return showConfirmation({
        title,
        message,
        details,
        type: 'warning',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        confirmButtonType: 'primary'
    });
}

// Confirmação de ação perigosa
function confirmDangerousAction(title, message, details = '') {
    return showConfirmation({
        title,
        message,
        details,
        type: 'danger',
        confirmText: 'Continuar',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
}

// ==================== NOTIFICAÇÕES ESPECÍFICAS ====================

// Notificação de sucesso
function showSuccess(message, title = 'Sucesso') {
    return showNotification(message, 'success', { title });
}

// Notificação de erro
function showError(message, title = 'Erro') {
    return showNotification(message, 'error', { title });
}

// Notificação de aviso
function showWarning(message, title = 'Atenção') {
    return showNotification(message, 'warning', { title });
}

// Notificação de informação
function showInfo(message, title = 'Informação') {
    return showNotification(message, 'info', { title });
}

// ==================== EXPORTAR FUNÇÕES GLOBALMENTE ====================

// Tornar funções disponíveis globalmente
window.showNotification = showNotification;
window.showConfirmation = showConfirmation;
window.confirmDelete = confirmDelete;
window.confirmAction = confirmAction;
window.confirmDangerousAction = confirmDangerousAction;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
