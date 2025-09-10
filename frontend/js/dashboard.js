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
            
            // Atualizar avatar do usuário
            updateUserAvatar(user.avatar);
        }
    }

    // Atualizar avatar do usuário
    function updateUserAvatar(avatarUrl, showNotification = false) {
        // Avatar da sidebar
        const userAvatarImg = document.getElementById('userAvatarImg');
        const userAvatarIcon = document.getElementById('userAvatarIcon');
        
        // Avatar do cabeçalho
        const userAvatarImgSmall = document.getElementById('userAvatarImgSmall');
        const userAvatarIconSmall = document.getElementById('userAvatarIconSmall');
        
        if (avatarUrl && avatarUrl !== '') {
            // Atualizar avatar da sidebar
            userAvatarImg.src = avatarUrl;
            userAvatarImg.style.display = 'block';
            userAvatarIcon.style.display = 'none';
            
            // Atualizar avatar do cabeçalho
            userAvatarImgSmall.src = avatarUrl;
            userAvatarImgSmall.style.display = 'block';
            userAvatarIconSmall.style.display = 'none';
            
            // Mostrar notificação apenas se solicitado
            if (showNotification) {
                showNotification('Foto do usuário carregada com sucesso!', 'success');
            }
        } else {
            // Usar ícone padrão na sidebar
            userAvatarImg.style.display = 'none';
            userAvatarIcon.style.display = 'block';
            
            // Usar ícone padrão no cabeçalho
            userAvatarImgSmall.style.display = 'none';
            userAvatarIconSmall.style.display = 'block';
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

    // Inicializar abas de configurações
    initConfigTabs();

    // Carregar configurações da empresa
    loadCompanySettings();

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

    // Inicializar abas de configurações
    function initConfigTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remover active de todos os botões
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Adicionar active ao botão clicado
                this.classList.add('active');
                
                // Esconder todas as abas
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Mostrar aba correspondente
                const targetPane = document.getElementById(`${targetTab}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });

        // Event listeners para formulários de configurações
        initConfigForms();
    }

    // Inicializar formulários de configurações
    function initConfigForms() {
        // Formulário de dados da empresa
        const empresaForm = document.querySelector('#geral-tab form');
        if (empresaForm) {
            empresaForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    companyName: document.getElementById('empresa-nome').value,
                    cnpj: document.getElementById('empresa-cnpj').value,
                    cep: document.getElementById('empresa-cep').value,
                    street: document.getElementById('empresa-rua').value,
                    number: document.getElementById('empresa-numero').value,
                    neighborhood: document.getElementById('empresa-bairro').value,
                    city: document.getElementById('empresa-cidade').value,
                    state: document.getElementById('empresa-estado').value
                };

                await saveCompanySettings(formData);
            });
        }

        // Integração com ViaCEP
        initCepIntegration();

        // Formulário de horário de funcionamento
        const horarioForm = document.querySelector('#geral-tab .config-section:nth-child(2) form');
        if (horarioForm) {
            horarioForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Validar campos obrigatórios
                const weekdaysOpen = document.getElementById('weekdays-open').value;
                const weekdaysClose = document.getElementById('weekdays-close').value;
                
                if (!weekdaysOpen || !weekdaysClose) {
                    showNotification('Horário de funcionamento de segunda a sexta é obrigatório', 'error');
                    return;
                }

                // Validar horários (abertura deve ser menor que fechamento)
                if (weekdaysOpen >= weekdaysClose) {
                    showNotification('Horário de abertura deve ser menor que o de fechamento', 'error');
                    return;
                }

                const workingHours = {
                    weekdays: {
                        open: weekdaysOpen,
                        close: weekdaysClose
                    },
                    saturday: {
                        enabled: document.getElementById('saturday-enabled').checked,
                        open: document.getElementById('saturday-open').value,
                        close: document.getElementById('saturday-close').value
                    },
                    sunday: {
                        enabled: document.getElementById('sunday-enabled').checked,
                        open: document.getElementById('sunday-open').value,
                        close: document.getElementById('sunday-close').value
                    }
                };

                // Validar horários do sábado se ativado
                if (workingHours.saturday.enabled) {
                    if (!workingHours.saturday.open || !workingHours.saturday.close) {
                        showNotification('Preencha os horários do sábado', 'error');
                        return;
                    }
                    if (workingHours.saturday.open >= workingHours.saturday.close) {
                        showNotification('Horário de abertura do sábado deve ser menor que o de fechamento', 'error');
                        return;
                    }
                }

                // Validar horários do domingo se ativado
                if (workingHours.sunday.enabled) {
                    if (!workingHours.sunday.open || !workingHours.sunday.close) {
                        showNotification('Preencha os horários do domingo', 'error');
                        return;
                    }
                    if (workingHours.sunday.open >= workingHours.sunday.close) {
                        showNotification('Horário de abertura do domingo deve ser menor que o de fechamento', 'error');
                        return;
                    }
                }

                const formData = { workingHours };
                await saveCompanySettings(formData);
            });
        }
    }


    // Função para carregar foto do usuário com notificação
    function loadUserPhoto(avatarUrl) {
        updateUserAvatar(avatarUrl, true);
    }

    // Carregar configurações da empresa
    async function loadCompanySettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/company-settings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const settings = await response.json();
                populateCompanyForm(settings);
            } else {
                console.error('Erro ao carregar configurações:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    // Preencher formulário com dados da empresa
    function populateCompanyForm(settings) {
        // Dados da empresa
        document.getElementById('empresa-nome').value = settings.companyName || '';
        document.getElementById('empresa-cnpj').value = settings.cnpj || '';
        document.getElementById('empresa-cep').value = settings.cep || '';
        document.getElementById('empresa-rua').value = settings.street || '';
        document.getElementById('empresa-numero').value = settings.number || '';
        document.getElementById('empresa-bairro').value = settings.neighborhood || '';
        document.getElementById('empresa-cidade').value = settings.city || '';
        document.getElementById('empresa-estado').value = settings.state || '';

        // Horário de funcionamento
        if (settings.workingHours) {
            const weekdays = settings.workingHours.weekdays;
            if (weekdays) {
                const weekdaysOpen = document.getElementById('weekdays-open');
                const weekdaysClose = document.getElementById('weekdays-close');
                if (weekdaysOpen) weekdaysOpen.value = weekdays.open || '08:00';
                if (weekdaysClose) weekdaysClose.value = weekdays.close || '18:00';
            }

            const saturday = settings.workingHours.saturday;
            if (saturday) {
                const saturdayOpen = document.getElementById('saturday-open');
                const saturdayClose = document.getElementById('saturday-close');
                const saturdayEnabled = document.getElementById('saturday-enabled');
                
                if (saturdayOpen) saturdayOpen.value = saturday.open || '08:00';
                if (saturdayClose) saturdayClose.value = saturday.close || '12:00';
                if (saturdayEnabled) saturdayEnabled.checked = saturday.enabled || false;
            }

            const sunday = settings.workingHours.sunday;
            if (sunday) {
                const sundayOpen = document.getElementById('sunday-open');
                const sundayClose = document.getElementById('sunday-close');
                const sundayEnabled = document.getElementById('sunday-enabled');
                
                if (sundayOpen) sundayOpen.value = sunday.open || '08:00';
                if (sundayClose) sundayClose.value = sunday.close || '12:00';
                if (sundayEnabled) sundayEnabled.checked = sunday.enabled || false;
            }
        }
    }

    // Salvar configurações da empresa
    async function saveCompanySettings(formData) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/company-settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                showNotification('Configurações salvas com sucesso!', 'success');
                return true;
            } else {
                const error = await response.json();
                showNotification(error.message || 'Erro ao salvar configurações', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            showNotification('Erro ao salvar configurações', 'error');
            return false;
        }
    }

    // Inicializar integração com ViaCEP
    function initCepIntegration() {
        const cepInput = document.getElementById('empresa-cep');
        if (!cepInput) return;

        // Máscara para CEP
        cepInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });

        // Buscar CEP quando completar 9 caracteres (00000-000)
        cepInput.addEventListener('blur', function(e) {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8 && !e.target.disabled) {
                buscarCep(cep);
            }
        });

        // Buscar CEP ao pressionar Enter
        cepInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const cep = e.target.value.replace(/\D/g, '');
                if (cep.length === 8 && !e.target.disabled) {
                    e.preventDefault();
                    buscarCep(cep);
                }
            }
        });

        // Validação em tempo real
        cepInput.addEventListener('input', function(e) {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                // Adicionar classe para indicar que está pronto para busca
                e.target.classList.add('cep-ready');
            } else {
                e.target.classList.remove('cep-ready');
            }
        });
    }

    // Buscar dados do CEP na API ViaCEP
    async function buscarCep(cep) {
        const cepInput = document.getElementById('empresa-cep');
        const cepContainer = cepInput.closest('.form-group');
        
        // Salvar o valor original do CEP
        const originalCepValue = cepInput.value;
        
        try {
            // Mostrar loading visual
            cepInput.disabled = true;
            cepInput.value = 'Buscando...';
            cepContainer.classList.add('cep-loading');

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                showNotification('CEP não encontrado. Verifique o número digitado.', 'error');
                cepInput.value = originalCepValue; // Restaurar valor original
                cepInput.focus();
                return;
            }

            // Preencher campos automaticamente
            document.getElementById('empresa-rua').value = data.logradouro || '';
            document.getElementById('empresa-bairro').value = data.bairro || '';
            document.getElementById('empresa-cidade').value = data.localidade || '';
            document.getElementById('empresa-estado').value = data.uf || '';

            // Restaurar o valor original do CEP (formatado)
            cepInput.value = originalCepValue;

            // Focar no campo número
            document.getElementById('empresa-numero').focus();

            showNotification(`Endereço encontrado: ${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`, 'success');

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            showNotification('Erro ao buscar CEP. Verifique sua conexão e tente novamente.', 'error');
            cepInput.value = originalCepValue; // Restaurar valor original
            cepInput.focus();
        } finally {
            // Restaurar campo CEP
            cepInput.disabled = false;
            cepContainer.classList.remove('cep-loading');
        }
    }

    // Expor funções globalmente para uso em outras páginas
    window.showNotification = showNotification;
    window.logout = logout;
    window.updateUserAvatar = updateUserAvatar;
    window.loadUserPhoto = loadUserPhoto;
});
