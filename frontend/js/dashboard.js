document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const pageContents = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('pageTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const userNameSmall = document.getElementById('userNameSmall');
    const userRole = document.getElementById('userRole');

    // Verificar autenticação
    checkAuthentication();

    // Toggle sidebar
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Restaurar estado do sidebar
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // Navegação entre páginas
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = this.getAttribute('data-page');
            
            // Remover active de todos os links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Adicionar active ao link clicado
            this.classList.add('active');
            
            // Mostrar página correspondente
            showPage(targetPage);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja sair?')) {
            logout();
        }
    });

    // Função para mostrar página
    function showPage(pageName) {
        // Esconder todas as páginas
        pageContents.forEach(page => {
            page.classList.remove('active');
        });

        // Mostrar página selecionada
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Atualizar título da página
        const pageTitles = {
            'dashboard': 'Dashboard',
            'agenda': 'Agenda',
            'financeiro': 'Financeiro',
            'profissionais': 'Profissionais',
            'servicos': 'Serviços',
            'relatorios': 'Relatórios',
            'configuracoes': 'Configurações'
        };

        pageTitle.textContent = pageTitles[pageName] || 'Dashboard';
    }

    // Verificar autenticação
    async function checkAuthentication() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            window.location.href = '/';
            return;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateUserInfo(data.user);
            } else {
                localStorage.removeItem('authToken');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Erro na verificação:', error);
            localStorage.removeItem('authToken');
            window.location.href = '/';
        }
    }

    // Atualizar informações do usuário
    function updateUserInfo(user) {
        if (user) {
            userName.textContent = user.name || 'Usuário';
            userNameSmall.textContent = user.name || 'Usuário';
            userRole.textContent = user.role === 'admin' ? 'Administrador' : 'Usuário';
        }
    }

    // Logout
    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('rememberedEmail');
        window.location.href = '/';
    }

    // Carregar dados do dashboard
    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Aqui você pode atualizar os dados do dashboard
                console.log('Dados do dashboard:', data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    // Carregar dados iniciais
    loadDashboardData();

    // Adicionar efeitos visuais
    addVisualEffects();

    function addVisualEffects() {
        // Efeito de hover nos cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });

        // Efeito de clique nos botões
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                // Criar efeito de ripple
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Adicionar CSS para animação ripple
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Notificações
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }

    // Adicionar CSS para animação de saída
    const notificationStyle = document.createElement('style');
    notificationStyle.textContent = `
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
    document.head.appendChild(notificationStyle);

    // Expor funções globalmente para uso em outras páginas
    window.showNotification = showNotification;
    window.logout = logout;
});
