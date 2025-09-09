document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-btn');

    // Verificar se há credenciais salvas
    if (localStorage.getItem('rememberedEmail')) {
        emailInput.value = localStorage.getItem('rememberedEmail');
    }

    // Validação em tempo real
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);

    function validateEmail() {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            emailInput.style.borderColor = '#e74c3c';
        } else {
            emailInput.style.borderColor = '#e1e5e9';
        }
    }

    function validatePassword() {
        const password = passwordInput.value;
        
        if (password && password.length < 6) {
            passwordInput.style.borderColor = '#e74c3c';
        } else {
            passwordInput.style.borderColor = '#e1e5e9';
        }
    }

    // Submissão do formulário
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validação básica
        if (!email || !password) {
            showNotification('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        // Mostrar loading
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Salvar token
                localStorage.setItem('authToken', data.token);
                
                // Salvar email
                localStorage.setItem('rememberedEmail', email);

                showNotification('Login realizado com sucesso!', 'success');
                
                // Redirecionar para o dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } else {
                showNotification(data.message || 'Erro ao fazer login', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro de conexão. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        if (loading) {
            loginForm.classList.add('loading');
            loginBtn.innerHTML = '<div class="spinner"></div> <span>Entrando...</span>';
        } else {
            loginForm.classList.remove('loading');
            loginBtn.innerHTML = '<span>Entrar</span> <i class="fas fa-arrow-right"></i>';
        }
    }

    function showNotification(message, type) {
        // Remover notificação existente
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        // Estilos da notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remover após 4 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    // Adicionar estilos de animação para notificações
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
