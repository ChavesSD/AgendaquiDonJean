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

    // Sistema de permissões
    const PERMISSIONS = {
        admin: {
            canCreateUsers: true,
            canCreateAdmin: true,
            canAccessBackup: true,
            canAccessAllPages: true,
            pages: ['dashboard', 'agenda', 'estoque', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
        },
        manager: {
            canCreateUsers: true,
            canCreateAdmin: false,
            canAccessBackup: false,
            canAccessAllPages: true,
            pages: ['dashboard', 'agenda', 'estoque', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
        },
        user: {
            canCreateUsers: false,
            canCreateAdmin: false,
            canAccessBackup: false,
            canAccessAllPages: false,
            pages: ['dashboard', 'agenda', 'comissoes']
        }
    };

    // Função para verificar permissões
    function hasPermission(permission) {
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const userRole = currentUser.role || 'user';
        const userPermissions = PERMISSIONS[userRole] || PERMISSIONS.user;
        
        return userPermissions[permission] || false;
    }

    // Função para verificar acesso a página
    function canAccessPage(pageName) {
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const userRole = currentUser.role || 'user';
        const userPermissions = PERMISSIONS[userRole] || PERMISSIONS.user;
        
        return userPermissions.pages.includes(pageName);
    }

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
        // Verificar se o usuário tem permissão para acessar a página
        if (!canAccessPage(pageName)) {
            showNotification('Você não tem permissão para acessar esta página', 'error');
            return;
        }

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
            'comissoes': 'Minhas Comissões',
            'estoque': 'Estoque',
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
                console.log('Dados do usuário carregados na autenticação:', data.user);
                updateUserInfo(data.user);
                applyUserPermissions(data.user);
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
            userRole.textContent = user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Usuário';
            
            // Salvar dados do usuário no localStorage para uso posterior
            localStorage.setItem('userData', JSON.stringify(user));
            
            // Atualizar avatar do usuário
            updateUserAvatar(user.avatar);
        }
    }

    // Aplicar permissões do usuário na interface
    function applyUserPermissions(user) {
        const userRole = user.role || 'user';
        const permissions = PERMISSIONS[userRole] || PERMISSIONS.user;

        // Adicionar classe CSS baseada no role do usuário
        document.body.className = document.body.className.replace(/user-role-\w+/g, '');
        document.body.classList.add(`user-role-${userRole}`);

        // Ocultar aba de Contatos para usuários comuns
        const contatosTab = document.querySelector('[data-tab="contatos"]');
        if (contatosTab) {
            if (userRole === 'user') {
                contatosTab.style.display = 'none';
                console.log('❌ Aba Contatos oculta para usuário comum');
            } else {
                contatosTab.style.display = 'flex';
                console.log('✅ Aba Contatos visível para admin/manager');
            }
        }

        // Ocultar/mostrar itens do menu baseado nas permissões
        const menuItems = document.querySelectorAll('.nav-item');
        menuItems.forEach(item => {
            const pageName = item.querySelector('.nav-link')?.getAttribute('data-page');
            if (pageName && !permissions.pages.includes(pageName)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });

        // Aplicar permissões específicas
        applySpecificPermissions(permissions);
    }

    // Aplicar permissões específicas
    function applySpecificPermissions(permissions) {
        // Ocultar aba de Backup/Manutenção se não tiver permissão
        const backupTab = document.querySelector('[data-tab="backup-tab"]');
        if (backupTab) {
            backupTab.style.display = permissions.canAccessBackup ? 'block' : 'none';
        }

        // Ocultar botão de criar usuário se não tiver permissão
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.style.display = permissions.canCreateUsers ? 'block' : 'none';
        }
    }

    // Atualizar avatar do usuário
    function updateUserAvatar(avatarUrl, showNotification = false) {
        console.log('updateUserAvatar chamada com:', avatarUrl ? 'URL presente' : 'URL vazia');
        
        // Avatar da sidebar
        const userAvatarImg = document.getElementById('userAvatarImg');
        const userAvatarIcon = document.getElementById('userAvatarIcon');
        
        // Avatar do cabeçalho
        const userAvatarImgSmall = document.getElementById('userAvatarImgSmall');
        const userAvatarIconSmall = document.getElementById('userAvatarIconSmall');
        
        console.log('Elementos encontrados:', {
            userAvatarImg: !!userAvatarImg,
            userAvatarIcon: !!userAvatarIcon,
            userAvatarImgSmall: !!userAvatarImgSmall,
            userAvatarIconSmall: !!userAvatarIconSmall
        });
        
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

    // Inicializar gerenciamento de usuários apenas para admins/managers
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentUserRole = currentUser.role || 'user';
    
    if (currentUserRole === 'admin' || currentUserRole === 'manager') {
        console.log('✅ Usuário tem permissão, inicializando gerenciamento de usuários');
        initUserManagement();
    } else {
        console.log('❌ Usuário comum - não inicializando gerenciamento de usuários');
    }

    // Inicializar AgendaManager se não estiver disponível
    if (typeof AgendaManager !== 'undefined' && !window.agendaManager) {
        console.log('🆕 Inicializando AgendaManager no dashboard...');
        window.agendaManager = new AgendaManager();
    }

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
                
                // Inicializar AgendaManager quando a aba de agenda for ativada
                if (targetTab === 'agendamentos') {
                    console.log('🔄 Inicializando AgendaManager...');
                    if (typeof AgendaManager !== 'undefined') {
                        if (!window.agendaManager) {
                            console.log('🆕 Criando nova instância do AgendaManager');
                            window.agendaManager = new AgendaManager();
                        } else {
                            console.log('🔄 Recarregando dados do AgendaManager existente');
                            // Recarregar dados se já existir
                            window.agendaManager.loadAppointments();
                            window.agendaManager.loadStatistics();
                        }
                    } else {
                        console.error('❌ AgendaManager não está definido');
                    }
                }
                
                // Garantir que o AgendaManager esteja sempre disponível
                if (!window.agendaManager && typeof AgendaManager !== 'undefined') {
                    console.log('🆕 Criando AgendaManager global...');
                    window.agendaManager = new AgendaManager();
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
                    whatsapp: document.getElementById('empresa-whatsapp').value,
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
        document.getElementById('empresa-whatsapp').value = settings.whatsapp || '';
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
        
        // Máscara para WhatsApp
        const whatsappInput = document.getElementById('empresa-whatsapp');
        if (whatsappInput) {
            whatsappInput.addEventListener('input', function(e) {
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

    // Inicializar gerenciamento de usuários
    function initUserManagement() {
        // Event listeners para botões
        const addUserBtn = document.getElementById('add-user-btn');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveUserBtn = document.getElementById('saveUserBtn');
        const userForm = document.getElementById('userForm');
        const avatarInput = document.getElementById('userAvatar');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => openUserModal());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => closeUserModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeUserModal());
        }

        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => saveUser());
        }

        if (avatarInput) {
            avatarInput.addEventListener('change', handleAvatarUpload);
        }

        // Fechar modal ao clicar fora
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeUserModal();
                }
            });
        }

        // Carregar lista de usuários apenas se tiver permissão
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const userRole = currentUser.role || 'user';
        
        if (userRole === 'admin' || userRole === 'manager') {
            console.log('✅ Usuário tem permissão para carregar lista de usuários');
        loadUsers();
        } else {
            console.log('❌ Usuário comum - não carregando lista de usuários');
            // Ocultar seção de usuários para usuários comuns
            const usersSection = document.querySelector('.users-section');
            if (usersSection) {
                usersSection.style.display = 'none';
            }
        }
    }

    // Abrir modal de usuário
    function openUserModal(userId = null) {
        // Verificar se pode criar usuários
        if (!userId && !hasPermission('canCreateUsers')) {
            showNotification('Você não tem permissão para criar usuários', 'error');
            return;
        }

        console.log('Abrindo modal para usuário:', userId);
        const modal = document.getElementById('userModal');
        const modalTitle = document.getElementById('modalTitle');
        const userIdInput = document.getElementById('userId');
        const userNameInput = document.getElementById('modalUserName');
        const userEmailInput = document.getElementById('modalUserEmail');
        const userPasswordInput = document.getElementById('modalUserPassword');
        const userRoleInput = document.getElementById('modalUserRole');
        const avatarPreview = document.getElementById('avatarPreview');

        if (userId) {
            // Modo edição
            console.log('Modo edição - ID:', userId);
            modalTitle.textContent = 'Editar Usuário';
            userIdInput.value = userId;
            userPasswordInput.required = false;
            userPasswordInput.placeholder = 'Deixe em branco para manter a senha atual';
            
            // Carregar dados do usuário
            loadUserData(userId);
        } else {
            // Modo criação
            console.log('Modo criação');
            modalTitle.textContent = 'Novo Usuário';
            userIdInput.value = '';
            userForm.reset();
            userPasswordInput.required = true;
            userPasswordInput.placeholder = 'Digite a senha';
            avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
        }

        // Aplicar restrições de role baseado nas permissões
        if (userRoleInput) {
            const adminOption = userRoleInput.querySelector('option[value="admin"]');
            if (adminOption) {
                adminOption.style.display = hasPermission('canCreateAdmin') ? 'block' : 'none';
                if (!hasPermission('canCreateAdmin')) {
                    userRoleInput.value = 'user'; // Definir como user por padrão
                }
            }
        }

        modal.classList.add('show');
    }

    // Fechar modal de usuário
    function closeUserModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('show');
    }

    // Carregar dados do usuário para edição
    async function loadUserData(userId) {
        try {
            console.log('Carregando dados do usuário:', userId);
            const token = localStorage.getItem('authToken');
            
            if (!token) {
                showNotification('Token de autenticação não encontrado', 'error');
                return;
            }

            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Resposta da API:', response.status, response.statusText);

            if (response.ok) {
                const user = await response.json();
                console.log('Dados do usuário carregados:', user);
                
                document.getElementById('modalUserName').value = user.name || '';
                document.getElementById('modalUserEmail').value = user.email || '';
                document.getElementById('modalUserRole').value = user.role || 'user';
                
                // Atualizar preview do avatar
                const avatarPreview = document.getElementById('avatarPreview');
                if (user.avatar) {
                    avatarPreview.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
                } else {
                    avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
                }
            } else {
                const errorData = await response.json();
                console.error('Erro da API:', errorData);
                showNotification(errorData.message || 'Erro ao carregar dados do usuário', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            showNotification('Erro ao carregar dados do usuário', 'error');
        }
    }

    // Salvar usuário
    async function saveUser() {
        const userId = document.getElementById('userId').value;
        const name = document.getElementById('modalUserName').value;
        const email = document.getElementById('modalUserEmail').value;
        const password = document.getElementById('modalUserPassword').value;
        const role = document.getElementById('modalUserRole').value;
        const avatar = document.getElementById('userAvatar').files[0];

        // Validar campos obrigatórios
        if (!name || !email) {
            showNotification('Nome e email são obrigatórios', 'error');
            return;
        }

        if (!userId && !password) {
            showNotification('Senha é obrigatória para novos usuários', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            
            formData.append('name', name);
            formData.append('email', email);
            formData.append('role', role);
            
            if (password) {
                formData.append('password', password);
            }
            
            if (avatar) {
                console.log('Avatar selecionado:', avatar.name, avatar.size, avatar.type);
                formData.append('avatar', avatar);
            } else {
                console.log('Nenhum avatar selecionado');
            }
            
            // Debug: verificar se FormData contém avatar
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(key, value);
            }

            const url = userId ? `/api/users/${userId}` : '/api/users';
            const method = userId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                closeUserModal();
                // Recarregar lista apenas se tiver permissão
                const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
                if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                    loadUsers();
                }
                
                // Se for edição do usuário atual, atualizar dados do header/sidebar
                if (userId) {
                    const currentUserId = localStorage.getItem('userId');
                    if (currentUserId === userId) {
                        // Recarregar dados do usuário atual
                        checkAuthentication();
                    }
                }
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            showNotification('Erro ao salvar usuário', 'error');
        }
    }

    // Carregar lista de usuários
    async function loadUsers() {
        try {
            // Verificar permissão antes de fazer a chamada
            const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            const userRole = currentUser.role || 'user';
            
            if (userRole !== 'admin' && userRole !== 'manager') {
                console.log('❌ Usuário comum - sem permissão para carregar usuários');
                return;
            }
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                console.log('Usuários carregados da API:', users);
                renderUsers(users);
            } else {
                console.error('Erro ao carregar usuários:', response.statusText);
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    // Renderizar lista de usuários
    function renderUsers(users) {
        const usersList = document.querySelector('.users-list');
        if (!usersList) return;

        console.log('Renderizando usuários:', users);

        usersList.innerHTML = '';

        users.forEach(user => {
            console.log('Usuário:', user.name, 'Avatar:', user.avatar ? 'Sim' : 'Não');
            
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            // Criar avatar dinamicamente
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'user-avatar';
            
            if (user.avatar && user.avatar.trim() !== '') {
                const img = document.createElement('img');
                img.src = user.avatar;
                img.alt = 'Avatar';
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                img.onerror = function() {
                    console.error('Erro ao carregar avatar:', this.src);
                    this.style.display = 'none';
                    const icon = this.nextElementSibling;
                    if (icon) icon.style.display = 'block';
                };
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                icon.style.display = 'none';
                
                avatarDiv.appendChild(img);
                avatarDiv.appendChild(icon);
                
                console.log('Avatar criado com imagem:', user.avatar.substring(0, 50) + '...');
            } else {
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                avatarDiv.appendChild(icon);
                console.log('Avatar criado com ícone padrão');
            }
            
            // Verificar se é o usuário admin original
            const isOriginalAdmin = user.email === 'admin@chstudio.com' && user.name === 'Desenvolvedor';
            
            // Verificar se é o usuário logado atual
            const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            const isCurrentUser = user._id === currentUser._id;
            const isCurrentUserAdmin = currentUser.role === 'admin';
            
            // Debug adicional
            console.log('Comparação de usuários:', {
                userId: user._id,
                currentUserId: currentUser._id,
                isCurrentUser: isCurrentUser,
                userEmail: user.email,
                currentUserEmail: currentUser.email,
                isCurrentUserAdmin: isCurrentUserAdmin
            });
            
            // Debug logs
            console.log('Debug renderUsers:', {
                userId: user._id,
                currentUserId: currentUser._id,
                isCurrentUser: isCurrentUser,
                userEmail: user.email,
                currentUserEmail: currentUser.email
            });
            
            // Admin pode editar qualquer usuário, outros usuários só podem editar a si mesmos
            const canEdit = isCurrentUserAdmin || isCurrentUser;
            
            // Admin pode excluir qualquer usuário, outros usuários não podem excluir o admin original
            const canDelete = isCurrentUserAdmin || !isOriginalAdmin;
            
            userCard.innerHTML = `
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                    <span class="user-role">${user.role.toUpperCase()}</span>
                </div>
                <div class="user-actions">
                    <button class="btn-icon ${!canEdit ? 'disabled' : ''}" 
                            onclick="${!canEdit ? 'showNotification("Apenas o próprio usuário pode editar seu perfil", "error")' : `editUser('${user._id}')`}" 
                            title="${!canEdit ? 'Edição restrita' : 'Editar'}"
                            ${!canEdit ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger ${!canDelete ? 'disabled' : ''}" 
                            onclick="${!canDelete ? 'showNotification("Não é possível excluir o usuário administrador do sistema", "error")' : `deleteUser('${user._id}')`}" 
                            title="${!canDelete ? 'Usuário protegido' : 'Excluir'}"
                            ${!canDelete ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Inserir avatar no início do card
            userCard.insertBefore(avatarDiv, userCard.firstChild);
            usersList.appendChild(userCard);
        });
    }

    // Editar usuário
    function editUser(userId) {
        console.log('Editando usuário com ID:', userId);
        
        // Verificar se é o usuário logado atual
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const isCurrentUser = userId === currentUser._id;
        const isCurrentUserAdmin = currentUser.role === 'admin';
        
        // Admin pode editar qualquer usuário, outros usuários só podem editar a si mesmos
        if (!isCurrentUserAdmin && !isCurrentUser) {
            showNotification('Apenas o próprio usuário pode editar seu perfil', 'error');
            return;
        }
        
        openUserModal(userId);
    }

    // Carregar usuários para verificação de exclusão
    async function loadUsersForDeletion() {
        try {
            // Verificar permissão antes de fazer a chamada
            const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            const userRole = currentUser.role || 'user';
            
            if (userRole !== 'admin' && userRole !== 'manager') {
                console.log('❌ Usuário comum - sem permissão para carregar usuários para exclusão');
                return [];
            }
            
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            return [];
        }
    }

    // Deletar usuário
    async function deleteUser(userId) {
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const isCurrentUserAdmin = currentUser.role === 'admin';
        
        // Buscar o usuário que está sendo excluído para verificar se é o admin original
        const users = await loadUsersForDeletion();
        const userToDelete = users.find(u => u._id === userId);
        
        // Se não for admin, não pode excluir o admin original
        if (!isCurrentUserAdmin && userToDelete && userToDelete.email === 'admin@chstudio.com' && userToDelete.name === 'Desenvolvedor') {
            showNotification('Não é possível excluir o usuário administrador do sistema', 'error');
            return;
        }

        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                // Recarregar lista apenas se tiver permissão
                const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
                if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                    loadUsers();
                }
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            showNotification('Erro ao deletar usuário', 'error');
        }
    }

    // Lidar com upload de avatar
    function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('Arquivo selecionado:', file.name, file.size, file.type);
            const reader = new FileReader();
            reader.onload = function(e) {
                const avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                console.log('Preview atualizado com:', e.target.result.substring(0, 50) + '...');
            };
            reader.readAsDataURL(file);
        }
    }

    // Expor funções globalmente para uso em outras páginas
    window.showNotification = showNotification;
    window.logout = logout;
    window.updateUserAvatar = updateUserAvatar;
    window.loadUserPhoto = loadUserPhoto;
    window.editUser = editUser;
    window.deleteUser = deleteUser;
    window.copyPublicLink = copyPublicLink;
});

// Função para copiar link da página pública
function copyPublicLink() {
    const publicUrl = window.location.origin + '/public-booking.html';
    
    navigator.clipboard.writeText(publicUrl).then(() => {
        // Mostrar notificação de sucesso
        showNotification('Link copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar link:', err);
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = publicUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copiado para a área de transferência!', 'success');
    });
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
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

// ==================== DASHBOARD FUNCTIONALITY ====================

class DashboardManager {
    constructor() {
        this.chart = null;
        this.currentView = 'month'; // 'month' ou 'year'
        this.currentFilters = {
            startDate: null,
            endDate: null
        };
        
        console.log('🎯 DashboardManager criado com currentView:', this.currentView);
        this.init();
    }

    init() {
        console.log('🎯 Inicializando DashboardManager...');
        this.setupEventListeners();
        this.setDefaultDates();
        this.loadDashboardData();
        console.log('✅ DashboardManager inicializado!');
    }

    setupEventListeners() {
        // Filtros de data
        document.getElementById('apply-dashboard-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('reset-dashboard-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Controles do gráfico
        document.getElementById('chart-month-view')?.addEventListener('click', () => {
            this.switchChartView('month');
        });

        document.getElementById('chart-year-view')?.addEventListener('click', () => {
            this.switchChartView('year');
        });
    }

    setDefaultDates() {
        console.log('📅 Configurando datas padrão...');
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        console.log('📅 Datas calculadas:', {
            today: today.toISOString(),
            firstDayOfMonth: firstDayOfMonth.toISOString(),
            lastDayOfMonth: lastDayOfMonth.toISOString()
        });

        document.getElementById('dashboard-start-date').value = this.formatDateForInput(firstDayOfMonth);
        document.getElementById('dashboard-end-date').value = this.formatDateForInput(lastDayOfMonth);

        this.currentFilters.startDate = firstDayOfMonth;
        this.currentFilters.endDate = lastDayOfMonth;
        
        console.log('📅 Filtros configurados:', this.currentFilters);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    async applyFilters() {
        const startDate = document.getElementById('dashboard-start-date').value;
        const endDate = document.getElementById('dashboard-end-date').value;

        if (!startDate || !endDate) {
            this.showNotification('Por favor, selecione as datas de início e fim', 'error');
            return;
        }

        this.currentFilters.startDate = new Date(startDate);
        this.currentFilters.endDate = new Date(endDate);

        await this.loadDashboardData();
        this.showNotification('Filtros aplicados com sucesso!', 'success');
    }

    resetFilters() {
        this.setDefaultDates();
        this.loadDashboardData();
        this.showNotification('Filtros resetados', 'info');
    }

    async loadDashboardData() {
        try {
            console.log('🚀 Iniciando carregamento dos dados do dashboard...');
            await Promise.all([
                this.loadRecentAppointments(),
                this.loadTopServices(),
                this.loadTopProfessionals(),
                this.loadChartData()
            ]);
            console.log('✅ Dados do dashboard carregados com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao carregar dados do dashboard:', error);
            this.showNotification('Erro ao carregar dados do dashboard', 'error');
        }
    }


    async loadRecentAppointments() {
        try {
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            const response = await fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}&limit=5&sort=-createdAt`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const appointments = data.appointments || [];
                this.renderRecentAppointments(appointments);
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos recentes:', error);
            this.showErrorState('recent-appointments', 'Erro ao carregar agendamentos');
        }
    }

    renderRecentAppointments(appointments) {
        const container = document.getElementById('recent-appointments');
        
        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Nenhum agendamento encontrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = appointments.map(appointment => `
            <div class="appointment-item">
                <div class="appointment-info">
                    <div class="appointment-client">
                        <strong>${appointment.clientName}</strong>
                        <span class="appointment-service">${appointment.service?.name || 'Serviço não definido'}</span>
                    </div>
                    <div class="appointment-details">
                        <span class="appointment-date">${this.formatDate(appointment.date)}</span>
                        <span class="appointment-time">${appointment.time}</span>
                    </div>
                </div>
                <div class="appointment-status">
                    <span class="status-badge status-${appointment.status}">
                        ${this.getStatusText(appointment.status)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    async loadTopServices() {
        try {
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            const response = await fetch(`/api/dashboard/services/stats?startDate=${startDate}&endDate=${endDate}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dashboard Services API Response:', data);
                // A nova API retorna { service: {...}, count: number }
                const services = data.services || [];
                console.log('📊 Services to render:', services);
                this.renderTopServices(services);
            } else {
                // Fallback: buscar serviços e contar manualmente
                await this.loadTopServicesFallback();
            }
        } catch (error) {
            console.error('Erro ao carregar top serviços:', error);
            await this.loadTopServicesFallback();
        }
    }

    async loadTopServicesFallback() {
        try {
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            const [servicesResponse, appointmentsResponse] = await Promise.all([
                fetch('/api/services', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (servicesResponse.ok && appointmentsResponse.ok) {
                const servicesData = await servicesResponse.json();
                const appointmentsData = await appointmentsResponse.json();
                
                const services = servicesData.services || [];
                const appointments = appointmentsData.appointments || [];

                // Contar serviços
                const serviceCounts = {};
                appointments.forEach(apt => {
                    if (apt.service && apt.service._id) {
                        serviceCounts[apt.service._id] = (serviceCounts[apt.service._id] || 0) + 1;
                    }
                });

                // Criar ranking - só mostrar serviços que têm agendamentos
                const topServices = services
                    .map(service => ({
                        service,
                        count: serviceCounts[service._id] || 0
                    }))
                    .filter(item => item.count > 0) // Só serviços com agendamentos
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                this.renderTopServices(topServices);
            }
        } catch (error) {
            console.error('Erro no fallback de serviços:', error);
            this.showErrorState('top-services', 'Erro ao carregar serviços');
        }
    }

    renderTopServices(services) {
        const container = document.getElementById('top-services');
        
        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cogs"></i>
                    <p>Nenhum serviço encontrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = services.map((item, index) => {
            const position = index + 1;
            let medalClass = '';
            let medalIcon = '';
            
            if (position === 1) {
                medalClass = 'medal-gold';
                medalIcon = '🥇';
            } else if (position === 2) {
                medalClass = 'medal-silver';
                medalIcon = '🥈';
            } else if (position === 3) {
                medalClass = 'medal-bronze';
                medalIcon = '🥉';
            }
            
            // A nova estrutura retorna { service: {...}, count: number }
            const service = item.service || item;
            const count = item.count || 0;
            
            return `
                <div class="ranking-item">
                    <div class="ranking-position ${medalClass}">
                        ${medalIcon ? `<span class="medal-icon">${medalIcon}</span>` : `<span class="position-number">${position}</span>`}
                    </div>
                    <div class="ranking-info">
                        <div class="ranking-name">${service.name}</div>
                        <div class="ranking-details">
                            <span class="ranking-count">${count} agendamentos</span>
                            <span class="ranking-price">R$ ${service.price?.toFixed(2) || '0,00'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadTopProfessionals() {
        try {
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            console.log('🔍 Carregando top profissionais...');
            console.log('📅 Filtros:', { startDate, endDate });
            console.log('🔑 Token existe:', !!token);

            const response = await fetch(`/api/dashboard/professionals/stats?startDate=${startDate}&endDate=${endDate}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Resposta da API:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dashboard Professionals API Response:', data);
                // A nova API retorna { professional: {...}, count: number }
                const professionals = data.professionals || [];
                console.log('👥 Profissionais encontrados:', professionals.length);
                
                // Filtrar apenas profissionais que têm agendamentos (count > 0)
                const professionalsWithAppointments = professionals.filter(item => item.count > 0);
                console.log('👥 Profissionais com agendamentos:', professionalsWithAppointments.length);
                
                if (professionalsWithAppointments.length > 0) {
                    this.renderTopProfessionals(professionalsWithAppointments);
                } else {
                    console.log('📭 Nenhum profissional com agendamentos encontrado');
                    this.showNoProfessionalsState();
                }
            } else {
                console.log('⚠️ API principal falhou, usando fallback...');
                // Fallback: buscar profissionais e contar manualmente
                await this.loadTopProfessionalsFallback();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar top profissionais:', error);
            await this.loadTopProfessionalsFallback();
        }
    }

    async loadTopProfessionalsFallback() {
        try {
            console.log('🔄 Executando fallback para profissionais...');
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            console.log('📡 Fazendo requisições paralelas...');
            const [professionalsResponse, appointmentsResponse] = await Promise.all([
                fetch('/api/professionals', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            console.log('📊 Respostas:', {
                professionals: professionalsResponse.status,
                appointments: appointmentsResponse.status
            });

            if (professionalsResponse.ok && appointmentsResponse.ok) {
                const professionalsData = await professionalsResponse.json();
                const appointmentsData = await appointmentsResponse.json();
                
                const professionals = professionalsData.professionals || [];
                const appointments = appointmentsData.appointments || [];

                console.log('👥 Profissionais encontrados (fallback):', professionals.length);
                console.log('📅 Agendamentos encontrados:', appointments.length);

                // Contar profissionais
                const professionalCounts = {};
                appointments.forEach(apt => {
                    if (apt.professional && apt.professional._id) {
                        professionalCounts[apt.professional._id] = (professionalCounts[apt.professional._id] || 0) + 1;
                    }
                });

                console.log('📊 Contagem por profissional:', professionalCounts);

                // Criar ranking - só mostrar profissionais que têm agendamentos
                const topProfessionals = professionals
                    .map(professional => ({
                        professional,
                        count: professionalCounts[professional._id] || 0
                    }))
                    .filter(item => item.count > 0) // Só profissionais com agendamentos
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                console.log('🏆 Top profissionais (fallback):', topProfessionals);
                
                if (topProfessionals.length > 0) {
                    this.renderTopProfessionals(topProfessionals);
                } else {
                    console.log('📭 Nenhum profissional com agendamentos encontrado (fallback)');
                    this.showNoProfessionalsState();
                }
            } else {
                console.error('❌ Falha nas requisições de fallback');
                this.showErrorState('top-professionals', 'Erro ao carregar profissionais');
            }
        } catch (error) {
            console.error('❌ Erro no fallback de profissionais:', error);
            this.showErrorState('top-professionals', 'Erro ao carregar profissionais');
        }
    }

    renderTopProfessionals(professionals) {
        console.log('🎨 Renderizando profissionais:', professionals);
        const container = document.getElementById('top-professionals');
        
        if (!container) {
            console.error('❌ Container top-professionals não encontrado!');
            return;
        }
        
        if (professionals.length === 0) {
            console.log('📭 Nenhum profissional para renderizar');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhum profissional encontrado</p>
                </div>
            `;
            return;
        }

        // Limpar container
        container.innerHTML = '';
        
        professionals.forEach((item, index) => {
            const position = index + 1;
            let medalClass = '';
            let medalIcon = '';
            
            if (position === 1) {
                medalClass = 'medal-gold';
                medalIcon = '🥇';
            } else if (position === 2) {
                medalClass = 'medal-silver';
                medalIcon = '🥈';
            } else if (position === 3) {
                medalClass = 'medal-bronze';
                medalIcon = '🥉';
            }
            
            // A nova estrutura retorna { professional: {...}, count: number }
            const professional = item.professional || item;
            const count = item.count || 0;
            
            console.log(`👤 Profissional ${professional.firstName} ${professional.lastName}:`, {
                photo: professional.photo ? `${professional.photo.substring(0, 50)}...` : 'null',
                avatar: professional.avatar ? `${professional.avatar.substring(0, 50)}...` : 'null',
                hasPhoto: !!(professional.photo || professional.avatar)
            });
            
            // Criar elemento do ranking
            const rankingItem = document.createElement('div');
            rankingItem.className = 'ranking-item';
            
            // Posição/Medalha
            const positionDiv = document.createElement('div');
            positionDiv.className = `ranking-position ${medalClass}`;
            positionDiv.innerHTML = medalIcon ? `<span class="medal-icon">${medalIcon}</span>` : `<span class="position-number">${position}</span>`;
            
            // Informações do profissional
            const infoDiv = document.createElement('div');
            infoDiv.className = 'ranking-info';
            infoDiv.innerHTML = `
                <div class="ranking-name">${professional.firstName} ${professional.lastName}</div>
                <div class="ranking-details">
                    <span class="ranking-count">${count} atendimentos</span>
                    <span class="ranking-specialty">${professional.function || professional.specialty || 'Geral'}</span>
                </div>
            `;
            
            // Foto do profissional (usando a mesma lógica dos usuários)
            const photoDiv = document.createElement('div');
            photoDiv.className = 'professional-photo';
            
            if (professional.photo || professional.avatar) {
                const img = document.createElement('img');
                img.src = professional.photo || professional.avatar;
                img.alt = `${professional.firstName} ${professional.lastName}`;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                img.onerror = function() {
                    console.error('❌ Erro ao carregar foto do profissional:', this.src);
                    this.style.display = 'none';
                    const icon = this.nextElementSibling;
                    if (icon) icon.style.display = 'block';
                };
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                icon.style.display = 'none';
                
                photoDiv.appendChild(img);
                photoDiv.appendChild(icon);
                
                console.log('✅ Avatar do profissional criado com imagem');
            } else {
                const icon = document.createElement('i');
                icon.className = 'fas fa-user';
                photoDiv.appendChild(icon);
                console.log('✅ Avatar do profissional criado com ícone padrão');
            }
            
            // Montar o item
            rankingItem.appendChild(positionDiv);
            rankingItem.appendChild(infoDiv);
            rankingItem.appendChild(photoDiv);
            
            // Adicionar ao container
            container.appendChild(rankingItem);
        });
    }

    async loadChartData() {
        try {
            console.log('📊 Carregando dados do gráfico...');
            const token = localStorage.getItem('authToken');
            const currentYear = new Date().getFullYear();
            
            // Sempre buscar dados do ano todo para ter dados completos
            const startDate = new Date(currentYear, 0, 1);
            const endDate = new Date(currentYear, 11, 31);

            console.log('📅 Período do gráfico (sempre ano todo):', {
                view: this.currentView,
                startDate: this.formatDateForInput(startDate),
                endDate: this.formatDateForInput(endDate)
            });

            const response = await fetch(`/api/dashboard/appointments?startDate=${this.formatDateForInput(startDate)}&endDate=${this.formatDateForInput(endDate)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Resposta da API do gráfico:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                const appointments = data.appointments || [];
                console.log('📋 Agendamentos para o gráfico:', appointments.length);
                console.log('📋 Dados dos agendamentos:', appointments);
                this.renderChart(appointments);
            } else {
                console.error('❌ Erro na API do gráfico:', response.status);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados do gráfico:', error);
        }
    }

    renderChart(appointments) {
        const ctx = document.getElementById('appointmentsChart');
        if (!ctx) return;

        // Destruir gráfico anterior se existir
        if (this.chart) {
            this.chart.destroy();
        }

        const chartData = this.prepareChartData(appointments);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Atendimentos',
                    data: chartData.data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#2980b9',
                    pointBorderWidth: 3,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointHoverBackgroundColor: '#2980b9',
                    pointHoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#975756',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    prepareChartData(appointments) {
        console.log('🎨 Preparando dados do gráfico...');
        console.log('📊 Agendamentos recebidos:', appointments.length);
        console.log('👁️ Visualização atual:', this.currentView);
        
        const data = {};
        const labels = [];
        
        if (this.currentView === 'year') {
            // Dados por mês
            console.log('📅 Preparando dados por mês...');
            for (let i = 0; i < 12; i++) {
                const month = new Date(new Date().getFullYear(), i, 1);
                const monthKey = month.toISOString().substring(0, 7); // YYYY-MM
                data[monthKey] = 0;
                labels.push(month.toLocaleDateString('pt-BR', { month: 'short' }));
            }
        } else {
            // Dados por dia do mês atual
            console.log('📅 Preparando dados por dia...');
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            console.log('📅 Mês atual:', currentMonth + 1, 'Ano:', currentYear, 'Dias:', daysInMonth);
            
            for (let i = 1; i <= daysInMonth; i++) {
                const day = new Date(currentYear, currentMonth, i);
                const dayKey = day.toISOString().substring(0, 10); // YYYY-MM-DD
                data[dayKey] = 0;
                labels.push(i.toString());
            }
        }

        console.log('📊 Estrutura inicial dos dados:', data);
        console.log('🏷️ Labels gerados:', labels);

        // Contar agendamentos
        appointments.forEach(appointment => {
            const appointmentDate = new Date(appointment.date);
            let key;
            
            if (this.currentView === 'year') {
                key = appointmentDate.toISOString().substring(0, 7);
            } else {
                // Para visualização mensal, só contar agendamentos do mês atual
                const today = new Date();
                const appointmentMonth = appointmentDate.getMonth();
                const appointmentYear = appointmentDate.getFullYear();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                
                // Só processar se for do mês atual
                if (appointmentMonth === currentMonth && appointmentYear === currentYear) {
                    key = appointmentDate.toISOString().substring(0, 10);
                } else {
                    console.log(`⏭️ Agendamento ${appointmentDate.toISOString()} ignorado (não é do mês atual)`);
                    return; // Pular este agendamento
                }
            }
            
            console.log(`📅 Agendamento: ${appointmentDate.toISOString()} -> Chave: ${key}`);
            
            if (data.hasOwnProperty(key)) {
                data[key]++;
                console.log(`✅ Incrementado ${key}: ${data[key]}`);
            } else {
                console.log(`❌ Chave ${key} não encontrada nos dados`);
            }
        });

        const result = {
            labels: labels,
            data: Object.values(data)
        };
        
        console.log('📊 Dados finais do gráfico:', result);
        return result;
    }

    switchChartView(view) {
        this.currentView = view;
        
        // Atualizar botões
        document.querySelectorAll('.chart-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`chart-${view}-view`).classList.add('active');
        
        // Recarregar dados do gráfico
        this.loadChartData();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendente',
            'confirmed': 'Confirmado',
            'cancelled': 'Cancelado',
            'completed': 'Finalizado'
        };
        return statusMap[status] || status;
    }

    showErrorState(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showNoProfessionalsState() {
        const container = document.getElementById('top-professionals');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhum profissional encontrado</p>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Usar a função de notificação existente se disponível
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Inicializar Dashboard Manager quando a página carregar
let dashboardManager = null;

// Função para inicializar o dashboard
function initDashboard() {
    console.log('🎯 Função initDashboard chamada');
    if (!dashboardManager) {
        console.log('🆕 Criando novo DashboardManager...');
        dashboardManager = new DashboardManager();
    } else {
        console.log('♻️ DashboardManager já existe, recarregando dados...');
        dashboardManager.loadDashboardData();
    }
}

// Inicializar quando a página dashboard for ativada
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, verificando página dashboard...');
    // Verificar se estamos na página dashboard
    const dashboardPage = document.getElementById('dashboard-page');
    console.log('🔍 Dashboard page encontrada:', !!dashboardPage);
    console.log('🔍 Dashboard page ativa:', dashboardPage?.classList.contains('active'));
    
    if (dashboardPage && dashboardPage.classList.contains('active')) {
        console.log('✅ Inicializando dashboard...');
        initDashboard();
    } else {
        console.log('⏳ Dashboard não está ativo, aguardando ativação...');
    }
});

// Inicializar quando navegar para o dashboard
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-page="dashboard"]')) {
        console.log('🖱️ Clique detectado no dashboard, inicializando...');
        setTimeout(() => {
            initDashboard();
        }, 100);
    }
});

// ==================== ÍCONE FLUTUANTE GESTOR INTELIGENTE ====================

class GestorInteligenteIcon {
    constructor() {
        this.icon = null;
        this.isVisible = true;
        this.animationInterval = null;
        this.init();
    }

    init() {
        console.log('🧠 Inicializando ícone flutuante Gestor Inteligente...');
        this.createIcon();
        this.setupEventListeners();
        console.log('✅ Ícone flutuante Gestor Inteligente inicializado!');
    }

    createIcon() {
        // Verificar se o ícone já existe
        if (document.querySelector('.gestor-inteligente-icon')) {
            console.log('⚠️ Ícone flutuante já existe, removendo...');
            document.querySelector('.gestor-inteligente-icon').remove();
        }

        // Criar elemento do ícone
        this.icon = document.createElement('div');
        this.icon.className = 'gestor-inteligente-icon';
        this.icon.setAttribute('title', 'Gestor Inteligente');
        
        // Criar SVG profissional com gradiente
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.setAttribute('class', 'gestor-svg');
        
        // Definir gradiente profissional
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'aiGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#00b7ff');
        stop1.setAttribute('stop-opacity', '0.8');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '50%');
        stop2.setAttribute('stop-color', '#0099cc');
        stop2.setAttribute('stop-opacity', '0.9');
        
        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '100%');
        stop3.setAttribute('stop-color', '#006699');
        stop3.setAttribute('stop-opacity', '1');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        gradient.appendChild(stop3);
        defs.appendChild(gradient);
        svg.appendChild(defs);
        
        // Núcleo central (base preta) - tamanho equilibrado
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        core.setAttribute('x', '45');
        core.setAttribute('y', '45');
        core.setAttribute('width', '90');
        core.setAttribute('height', '90');
        core.setAttribute('rx', '18');
        core.setAttribute('class', 'ai-core');
        
        // Texto AI - perfeitamente centralizado
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '90');
        text.setAttribute('y', '90');
        text.setAttribute('class', 'ai-text');
        text.textContent = 'AI';
        
        // Borda profissional com gradiente - tamanho equilibrado
        const chipEnergy = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        chipEnergy.setAttribute('x', '45');
        chipEnergy.setAttribute('y', '45');
        chipEnergy.setAttribute('width', '90');
        chipEnergy.setAttribute('height', '90');
        chipEnergy.setAttribute('rx', '18');
        chipEnergy.setAttribute('class', 'chip-energy');
        
        // Adicionar elementos ao SVG
        svg.appendChild(core);
        svg.appendChild(text);
        svg.appendChild(chipEnergy);
        
        // Adicionar SVG ao ícone
        this.icon.appendChild(svg);
        
        // Adicionar ao DOM
        document.body.appendChild(this.icon);
        
        console.log('✅ Ícone flutuante Gestor Inteligente SVG criado e adicionado ao DOM');
    }

    setupEventListeners() {
        if (!this.icon) return;

        // Clique no ícone
        this.icon.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClick();
        });

        // Efeito de hover
        this.icon.addEventListener('mouseenter', () => {
            this.icon.classList.add('hovered');
        });

        this.icon.addEventListener('mouseleave', () => {
            this.icon.classList.remove('hovered');
        });

        // Efeito de clique
        this.icon.addEventListener('mousedown', () => {
            this.icon.classList.add('clicked');
        });

        this.icon.addEventListener('mouseup', () => {
            this.icon.classList.remove('clicked');
        });

        console.log('✅ Event listeners do ícone flutuante configurados');
    }

    // Funções de animação removidas - agora usando CSS puro para melhor performance

    handleClick() {
        console.log('🧠 Clique no Gestor Inteligente detectado');
        
        // Adicionar efeito visual de clique
        this.icon.classList.add('clicked');
        
        // Remover classe após animação
        setTimeout(() => {
            this.icon.classList.remove('clicked');
        }, 600);

        // Mostrar notificação
        if (window.showNotification) {
            window.showNotification('Gestor Inteligente ativado! Acessando recursos avançados de gestão.', 'success');
        } else {
            alert('Gestor Inteligente ativado! Acessando recursos avançados de gestão.');
        }

        // Aqui você pode adicionar a lógica específica do gestor inteligente
        this.openGestorInteligente();
    }

    openGestorInteligente() {
        console.log('🧠 Abrindo Gestor Inteligente...');
        
        // Por enquanto, apenas uma notificação
        // Futuramente, aqui pode ser implementado um modal ou sidebar com o gestor
        console.log('🚀 Funcionalidade do Gestor Inteligente será implementada em breve');
        
        // Exemplo de funcionalidade futura:
        // - Análise inteligente de dados
        // - Sugestões de otimização
        // - Relatórios automáticos
        // - Previsões e tendências
    }

    show() {
        if (this.icon) {
            this.icon.style.display = 'flex';
            this.isVisible = true;
            console.log('👁️ Ícone flutuante Gestor Inteligente mostrado');
        }
    }

    hide() {
        if (this.icon) {
            this.icon.style.display = 'none';
            this.isVisible = false;
            console.log('🙈 Ícone flutuante Gestor Inteligente ocultado');
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    destroy() {
        if (this.icon) {
            this.icon.remove();
            this.icon = null;
            console.log('🗑️ Ícone flutuante Gestor Inteligente removido');
        }
    }
}

// Inicializar ícone flutuante Gestor Inteligente
let gestorInteligenteIcon = null;

function initGestorInteligenteIcon() {
    console.log('🧠 Inicializando ícone flutuante Gestor Inteligente...');
    if (!gestorInteligenteIcon) {
        gestorInteligenteIcon = new GestorInteligenteIcon();
    }
    console.log('✅ Ícone flutuante Gestor Inteligente inicializado!');
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, verificando permissões para ícone flutuante Gestor Inteligente...');
    
    // Verificar se o usuário tem permissão para ver o ícone
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const userRole = currentUser.role || 'user';
    
    // Apenas admin e manager podem ver o ícone
    if (userRole === 'admin' || userRole === 'manager') {
        console.log('✅ Usuário tem permissão para ícone Gestor Inteligente, inicializando...');
        initGestorInteligenteIcon();
    } else {
        console.log('❌ Usuário comum - ícone Gestor Inteligente oculto');
    }
});

// Expor funções globalmente
window.gestorInteligenteIcon = gestorInteligenteIcon;
window.initGestorInteligenteIcon = initGestorInteligenteIcon;

// ==================== COMISSÕES ====================

class ComissoesManager {
    constructor() {
        this.currentFilters = {
            startDate: null,
            endDate: null
        };
        this.charts = {};
        this.isLoading = false;
        
        console.log('💰 ComissoesManager criado');
        this.init();
    }

    init() {
        console.log('💰 Inicializando ComissoesManager...');
        this.setupEventListeners();
        this.setDefaultDateRange();
        console.log('💰 Filtros configurados:', this.currentFilters);
        this.loadComissoesData();
    }

    setupEventListeners() {
        // Filtro de data
        const applyFilterBtn = document.getElementById('apply-comissoes-filter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                this.applyDateFilter();
            });
        }

        // Botão limpar filtros
        const clearFiltersBtn = document.getElementById('clear-comissoes-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearDateFilters();
            });
        }

        // Enter nos campos de data
        const startDateInput = document.getElementById('comissoes-start-date');
        const endDateInput = document.getElementById('comissoes-end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => this.applyDateFilter());
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', () => this.applyDateFilter());
        }
    }

    setDefaultDateRange() {
        console.log('📅 Configurando datas padrão das comissões...');
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        console.log('📅 Datas calculadas:', {
            today: today.toISOString(),
            firstDayOfMonth: firstDayOfMonth.toISOString(),
            lastDayOfMonth: lastDayOfMonth.toISOString()
        });

        const startDateInput = document.getElementById('comissoes-start-date');
        const endDateInput = document.getElementById('comissoes-end-date');
        
        if (startDateInput) {
            startDateInput.value = this.formatDateForInput(firstDayOfMonth);
        }
        if (endDateInput) {
            endDateInput.value = this.formatDateForInput(lastDayOfMonth);
        }

        this.currentFilters.startDate = this.formatDateForInput(firstDayOfMonth);
        this.currentFilters.endDate = this.formatDateForInput(lastDayOfMonth);
        
        console.log('📅 Filtros de comissões configurados:', this.currentFilters);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    applyDateFilter() {
        const startDateInput = document.getElementById('comissoes-start-date');
        const endDateInput = document.getElementById('comissoes-end-date');
        
        this.currentFilters.startDate = startDateInput?.value || null;
        this.currentFilters.endDate = endDateInput?.value || null;
        
        console.log('💰 Filtros aplicados:', this.currentFilters);
        this.loadComissoesData();
    }

    clearDateFilters() {
        // Limpar campos de data
        const startDateInput = document.getElementById('comissoes-start-date');
        const endDateInput = document.getElementById('comissoes-end-date');
        
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        
        // Resetar filtros
        this.currentFilters.startDate = null;
        this.currentFilters.endDate = null;
        
        console.log('💰 Filtros limpos');
        this.loadComissoesData();
    }

    async loadComissoesData() {
        try {
            console.log('💰 Carregando dados de comissões...');
            this.showLoadingState();
            
            const token = localStorage.getItem('authToken');
            console.log('💰 Token encontrado:', token ? 'SIM' : 'NÃO');
            if (!token) {
                console.error('💰 Token não encontrado');
                return;
            }

            // Buscar dados de comissões
            const urlParams = new URLSearchParams({
                startDate: this.currentFilters.startDate || '',
                endDate: this.currentFilters.endDate || ''
            });
            const url = '/api/commissions?' + urlParams;
            console.log('💰 URL da requisição:', url);
            console.log('💰 Parâmetros:', {
                startDate: this.currentFilters.startDate || '',
                endDate: this.currentFilters.endDate || ''
            });
            
            const commissionsResponse = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('💰 Status da resposta de comissões:', commissionsResponse.status);
            if (!commissionsResponse.ok) {
                console.error('❌ Erro na resposta de comissões:', commissionsResponse.status, commissionsResponse.statusText);
                throw new Error('Erro ao buscar comissões');
            }

            const commissionsData = await commissionsResponse.json();
            console.log('💰 Dados de comissões:', commissionsData);
            console.log('💰 Status da resposta:', commissionsResponse.status);
            console.log('💰 Comissões encontradas:', commissionsData.commissions?.length || 0);
            console.log('💰 Estatísticas:', commissionsData.stats);
            console.log('💰 Success:', commissionsData.success);

            // Buscar evolução mensal
            const evolutionResponse = await fetch('/api/commissions/evolution?' + new URLSearchParams({
                startDate: this.currentFilters.startDate || '',
                endDate: this.currentFilters.endDate || ''
            }), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!evolutionResponse.ok) {
                throw new Error('Erro ao buscar evolução das comissões');
            }

            const evolutionData = await evolutionResponse.json();
            console.log('📊 Dados de evolução:', evolutionData);

            // Renderizar dados
            console.log('💰 Renderizando dados de comissões...');
            console.log('💰 Stats recebidos:', commissionsData.stats);
            console.log('💰 Evolution data recebida:', evolutionData);
            this.renderComissoesStats(commissionsData.stats);
            this.renderComissoesCharts(evolutionData);

        } catch (error) {
            console.error('💰 Erro ao carregar dados de comissões:', error);
            console.error('💰 Stack trace:', error.stack);
            this.showErrorState();
        } finally {
            this.hideLoadingState();
        }
    }

    renderComissoesStats(stats) {
        console.log('💰 Renderizando estatísticas:', stats);
        console.log('💰 totalAppointments:', stats.totalAppointments);
        console.log('💰 averageCommission:', stats.averageCommission);
        console.log('💰 totalCommissions:', stats.totalCommissions);
        console.log('💰 Tipo de stats:', typeof stats);
        console.log('💰 Stats é null/undefined:', stats == null);
        
        // Serviços Concluídos
        const servicosConcluidosEl = document.getElementById('comissoes-servicos-concluidos');
        console.log('💰 Elemento servicosConcluidosEl:', servicosConcluidosEl);
        if (servicosConcluidosEl) {
            const value = stats.totalAppointments || 0;
            servicosConcluidosEl.textContent = value;
            console.log('💰 Serviços concluídos atualizado para:', value);
        } else {
            console.error('❌ Elemento comissoes-servicos-concluidos não encontrado!');
        }

        // Percentual de Comissão
        const percentualEl = document.getElementById('comissoes-percentual');
        console.log('💰 Elemento percentualEl:', percentualEl);
        if (percentualEl) {
            percentualEl.textContent = `${stats.averageCommission || 0}%`;
            console.log('💰 Percentual atualizado para:', `${stats.averageCommission || 0}%`);
        } else {
            console.error('❌ Elemento comissoes-percentual não encontrado!');
        }

        // Comissão Atual
        const valorAtualEl = document.getElementById('comissoes-valor-atual');
        console.log('💰 Elemento valorAtualEl:', valorAtualEl);
        if (valorAtualEl) {
            valorAtualEl.textContent = this.formatCurrency(stats.totalCommissions || 0);
            console.log('💰 Valor atual atualizado para:', this.formatCurrency(stats.totalCommissions || 0));
        } else {
            console.error('❌ Elemento comissoes-valor-atual não encontrado!');
        }
    }

    renderComissoesCharts(evolutionData) {
        console.log('📊 Renderizando gráficos de evolução:', evolutionData);
        
        // Processar dados para os gráficos
        const monthlyData = this.processMonthlyData(evolutionData);
        
        // Renderizar gráficos
        this.renderServicosChart(monthlyData);
        this.renderPercentualChart(monthlyData);
        this.renderValorChart(monthlyData);
    }

    processMonthlyData(evolutionData) {
        const months = [];
        const servicosData = [];
        const percentualData = [];
        const valorData = [];

        // Criar array de meses (últimos 6 meses)
        const endDate = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            
            months.push(monthName);
            
            // Buscar dados do mês
            const servicosMonth = evolutionData.monthlyAppointments.find(m => 
                `${m._id.year}-${String(m._id.month).padStart(2, '0')}` === monthKey
            );
            const percentualMonth = evolutionData.monthlyCommissionPercent.find(m => 
                `${m._id.year}-${String(m._id.month).padStart(2, '0')}` === monthKey
            );
            const valorMonth = evolutionData.monthlyCommissions.find(m => 
                `${m._id.year}-${String(m._id.month).padStart(2, '0')}` === monthKey
            );

            servicosData.push(servicosMonth?.count || 0);
            percentualData.push(percentualMonth?.avgCommission || 0);
            valorData.push(valorMonth?.totalCommissions || 0);
        }

        return {
            months,
            servicos: servicosData,
            percentual: percentualData,
            valor: valorData
        };
    }

    renderServicosChart(monthlyData) {
        const ctx = document.getElementById('comissoes-servicos-chart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.servicos) {
            this.charts.servicos.destroy();
        }

        this.charts.servicos = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.months,
                datasets: [{
                    label: 'Serviços Concluídos',
                    data: monthlyData.servicos,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#27ae60',
                    pointBorderColor: '#229954',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderPercentualChart(monthlyData) {
        const ctx = document.getElementById('comissoes-percentual-chart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.percentual) {
            this.charts.percentual.destroy();
        }

        this.charts.percentual = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.months,
                datasets: [{
                    label: 'Percentual de Comissão (%)',
                    data: monthlyData.percentual,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f39c12',
                    pointBorderColor: '#e67e22',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    renderValorChart(monthlyData) {
        const ctx = document.getElementById('comissoes-valor-chart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.valor) {
            this.charts.valor.destroy();
        }

        this.charts.valor = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.months,
                datasets: [{
                    label: 'Comissão em Reais (R$)',
                    data: monthlyData.valor,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#9b59b6',
                    pointBorderColor: '#8e44ad',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    showLoadingState() {
        // Implementar loading state se necessário
        console.log('💰 Mostrando loading...');
    }

    hideLoadingState() {
        // Implementar hide loading state se necessário
        console.log('💰 Escondendo loading...');
    }

    showErrorState() {
        console.error('💰 Mostrando estado de erro...');
    }

    formatCurrency(value) {
        if (isNaN(value) || value === null || value === undefined) {
            return 'R$ 0,00';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
}

// ==================== RELATÓRIOS ====================

class ReportsManager {
    constructor() {
        this.currentTab = 'agenda';
        this.currentFilters = {
            startDate: null,
            endDate: null,
            period: 'month'
        };
        this.charts = {};
        this.isLoading = false;
        
        console.log('📊 ReportsManager criado');
        this.init();
    }

    init() {
        console.log('📊 Inicializando ReportsManager...');
        this.setupEventListeners();
        this.setDefaultDates();
        this.loadReportsData();
        console.log('✅ ReportsManager inicializado!');
        
        // Forçar carregamento da aba agenda inicial
        setTimeout(() => {
            console.log('📊 Forçando carregamento da aba agenda...');
            this.switchTab('agenda');
        }, 500);
    }

    setupEventListeners() {
        // Filtros de data
        document.getElementById('apply-reports-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('reset-reports-filters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Mudança de período
        document.getElementById('reports-period')?.addEventListener('change', (e) => {
            this.handlePeriodChange(e.target.value);
        });

        // Abas
        document.querySelectorAll('.reports-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Botões de exportação
        document.getElementById('export-all-reports')?.addEventListener('click', () => {
            this.exportAllReports();
        });

        document.getElementById('generate-report')?.addEventListener('click', () => {
            this.generateReport();
        });

        // Botões de exportação individuais
        this.setupExportButtons();
    }

    setupExportButtons() {
        const exportButtons = [
            'export-agenda-chart', 'export-weekday-chart', 'export-monthly-chart', 'export-hours-chart',
            'export-category-chart', 'export-low-stock-chart', 'export-movements-chart', 'export-value-chart',
            'export-revenue-expenses-chart', 'export-cashflow-chart', 'export-expenses-category-chart', 'export-monthly-evolution-chart',
            'export-professional-appointments-chart', 'export-specialties-chart', 'export-performance-chart', 'export-schedule-chart',
            'export-popular-services-chart', 'export-service-revenue-chart', 'export-duration-chart', 'export-evolution-chart'
        ];

        exportButtons.forEach(buttonId => {
            document.getElementById(buttonId)?.addEventListener('click', () => {
                this.exportChart(buttonId);
            });
        });
    }

    setDefaultDates() {
        console.log('📅 Configurando datas padrão dos relatórios...');
        const today = new Date();
        // Usar um período mais amplo para capturar agendamentos futuros
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0); // +2 meses para incluir o próximo mês

        // Verificar se os elementos existem antes de tentar acessá-los
        const startDateEl = document.getElementById('reports-start-date');
        const endDateEl = document.getElementById('reports-end-date');
        
        if (startDateEl) {
            startDateEl.value = this.formatDateForInput(firstDayOfMonth);
        }
        if (endDateEl) {
            endDateEl.value = this.formatDateForInput(lastDayOfMonth);
        }

        this.currentFilters.startDate = firstDayOfMonth;
        this.currentFilters.endDate = lastDayOfMonth;
        this.currentFilters.period = 'month';
        
        console.log('📅 Filtros de relatórios configurados:', this.currentFilters);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    handlePeriodChange(period) {
        console.log('📅 Período alterado para:', period);
        const today = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = endDate = new Date(today);
                break;
            case 'week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startDate = startOfWeek;
                endDate = new Date(today);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), quarter * 3, 1);
                endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                break;
            default:
                return; // Personalizado - não alterar datas
        }

        if (startDate && endDate) {
            document.getElementById('reports-start-date').value = this.formatDateForInput(startDate);
            document.getElementById('reports-end-date').value = this.formatDateForInput(endDate);
            this.currentFilters.startDate = startDate;
            this.currentFilters.endDate = endDate;
            this.currentFilters.period = period;
        }
    }

    async applyFilters() {
        const startDate = document.getElementById('reports-start-date').value;
        const endDate = document.getElementById('reports-end-date').value;

        if (!startDate || !endDate) {
            this.showNotification('Por favor, selecione as datas de início e fim', 'error');
            return;
        }

        this.currentFilters.startDate = new Date(startDate);
        this.currentFilters.endDate = new Date(endDate);

        await this.loadReportsData();
        this.showNotification('Filtros aplicados com sucesso!', 'success');
    }

    resetFilters() {
        this.setDefaultDates();
        this.loadReportsData();
        this.showNotification('Filtros resetados', 'info');
    }

    switchTab(tabName) {
        console.log('📊 Mudando para aba:', tabName);
        
        // Remover active de todos os botões
        document.querySelectorAll('.reports-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adicionar active ao botão clicado
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Esconder todas as abas
        document.querySelectorAll('.reports-tabs .tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Mostrar aba correspondente
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Carregar dados específicos da aba
        this.loadTabData(tabName);
    }

    async loadReportsData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            console.log('📊 Carregando dados dos relatórios...');
            console.log('📊 Iniciando carregamento de dados financeiros...');
            
            // Carregar dados individualmente para capturar erros específicos
            try {
                await this.loadAgendaData();
                console.log('✅ Agenda carregada com sucesso');
            } catch (error) {
                console.error('❌ Erro ao carregar agenda:', error);
            }
            
            try {
                await this.loadEstoqueData();
                console.log('✅ Estoque carregado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao carregar estoque:', error);
            }
            
            try {
                await this.loadFinanceiroData();
                console.log('✅ Financeiro carregado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao carregar financeiro:', error);
            }
            
            try {
                await this.loadProfissionaisData();
                console.log('✅ Profissionais carregados com sucesso');
            } catch (error) {
                console.error('❌ Erro ao carregar profissionais:', error);
            }
            
            try {
                await this.loadServicosData();
                console.log('✅ Serviços carregados com sucesso');
            } catch (error) {
                console.error('❌ Erro ao carregar serviços:', error);
            }
            
            console.log('✅ Dados dos relatórios carregados com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao carregar dados dos relatórios:', error);
            this.showNotification('Erro ao carregar dados dos relatórios', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    async loadTabData(tabName) {
        console.log(`📊 Carregando dados da aba: ${tabName}`);
        
        // Mostrar loading state
        this.showLoadingState();
        
        try {
            switch (tabName) {
                case 'agenda':
                    await this.loadAgendaData();
                    break;
                case 'estoque':
                    await this.loadEstoqueData();
                    break;
                case 'financeiro':
                    await this.loadFinanceiroData();
                    break;
                case 'profissionais':
                    await this.loadProfissionaisData();
                    break;
                case 'servicos':
                    await this.loadServicosData();
                    break;
            }
        } catch (error) {
            console.error(`📊 Erro ao carregar dados da aba ${tabName}:`, error);
        } finally {
            this.hideLoadingState();
        }
    }

    async loadAgendaData() {
        try {
            console.log('📊 Carregando dados da agenda (com filtros de data)...');
            console.log('📊 AgendaManager disponível:', !!window.agendaManager);
            console.log('📊 Filtros atuais:', this.currentFilters);
            
            // Usar o AgendaManager existente se disponível
            if (window.agendaManager) {
                console.log('📊 Usando AgendaManager existente...');
                
                // Aplicar filtros de data ao AgendaManager
                window.agendaManager.filters.startDate = this.currentFilters.startDate;
                window.agendaManager.filters.endDate = this.currentFilters.endDate;
                
                // Carregar dados com filtros
                await window.agendaManager.loadAppointments();
                await window.agendaManager.loadStatistics();
                
                // Obter dados do AgendaManager
                const appointments = window.agendaManager.appointments || [];
                const stats = window.agendaManager.statistics || {};
                
                console.log('📊 Dados da agenda carregados:', { appointments: appointments.length, stats });
                
                this.renderAgendaStats(appointments);
                this.renderAgendaCharts(appointments);
                return;
            }
            
            // Fallback: carregar dados diretamente
            console.log('📊 Carregando dados da agenda diretamente...');
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            console.log('📊 Filtros:', { startDate, endDate, token: !!token });

            // Simular dados para teste se não houver token
            if (!token) {
                console.log('📊 Simulando dados da agenda...');
                const mockAppointments = [
                    { id: 1, status: 'confirmed', date: '2025-10-15', client: 'João Silva' },
                    { id: 2, status: 'pending', date: '2025-10-16', client: 'Maria Santos' },
                    { id: 3, status: 'cancelled', date: '2025-10-17', client: 'Pedro Costa' },
                    { id: 4, status: 'confirmed', date: '2025-10-18', client: 'Ana Lima' }
                ];
                
                this.renderAgendaStats(mockAppointments);
                this.renderAgendaCharts(mockAppointments);
                return;
            }

            const response = await fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const appointments = data.appointments || [];
                console.log('📊 Dados recebidos:', appointments);
                this.renderAgendaStats(appointments);
                this.renderAgendaCharts(appointments);
            } else {
                console.error('📊 Erro na resposta da API:', response.status);
            }
        } catch (error) {
            console.error('📊 Erro ao carregar dados da agenda:', error);
        }
    }

    renderAgendaStats(appointments) {
        const total = appointments.length;
        const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
        const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
        const pending = appointments.filter(apt => apt.status === 'pending').length;

        console.log('📊 Renderizando estatísticas da agenda:', { total, confirmed, cancelled, pending });

        const totalEl = document.getElementById('reports-total-appointments');
        const confirmedEl = document.getElementById('reports-confirmed-appointments');
        const cancelledEl = document.getElementById('reports-cancelled-appointments');
        const pendingEl = document.getElementById('reports-pending-appointments');

        console.log('📊 Elementos encontrados:', {
            total: !!totalEl,
            confirmed: !!confirmedEl,
            cancelled: !!cancelledEl,
            pending: !!pendingEl
        });

        if (totalEl) {
            totalEl.textContent = total;
            console.log('📊 Total agendamentos definido:', total);
        }
        if (confirmedEl) {
            confirmedEl.textContent = confirmed;
            console.log('📊 Confirmados definido:', confirmed);
        }
        if (cancelledEl) {
            cancelledEl.textContent = cancelled;
            console.log('📊 Cancelados definido:', cancelled);
        }
        if (pendingEl) {
            pendingEl.textContent = pending;
            console.log('📊 Pendentes definido:', pending);
        }
    }

    renderAgendaCharts(appointments) {
        // Gráfico de Status
        this.renderStatusChart(appointments);
        
        // Gráfico por Dia da Semana
        this.renderWeekdayChart(appointments);
        
        // Gráfico Mensal
        this.renderMonthlyChart(appointments);
        
        // Gráfico de Horários
        this.renderHoursChart(appointments);
    }

    renderStatusChart(appointments) {
        const ctx = document.getElementById('appointmentsStatusChart');
        if (!ctx) return;

        const statusCounts = {
            pending: appointments.filter(apt => apt.status === 'pending').length,
            confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
            completed: appointments.filter(apt => apt.status === 'completed').length
        };

        if (this.charts.appointmentsStatus) {
            this.charts.appointmentsStatus.destroy();
        }

        this.charts.appointmentsStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Confirmados', 'Cancelados', 'Finalizados'],
                datasets: [{
                    data: [statusCounts.pending, statusCounts.confirmed, statusCounts.cancelled, statusCounts.completed],
                    backgroundColor: ['#f39c12', '#27ae60', '#e74c3c', '#3498db'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderWeekdayChart(appointments) {
        const ctx = document.getElementById('weekdayChart');
        if (!ctx) return;

        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

        appointments.forEach(apt => {
            const date = new Date(apt.date);
            const day = date.getDay();
            weekdayCounts[day]++;
        });

        if (this.charts.weekday) {
            this.charts.weekday.destroy();
        }

        this.charts.weekday = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekdays,
                datasets: [{
                    label: 'Agendamentos',
                    data: weekdayCounts,
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c'
                    ],
                    borderColor: [
                        '#c0392b', '#d35400', '#229954', '#2980b9', '#8e44ad', '#d35400', '#16a085'
                    ],
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    renderMonthlyChart(appointments) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthCounts = new Array(12).fill(0);

        appointments.forEach(apt => {
            const date = new Date(apt.date);
            const month = date.getMonth();
            monthCounts[month]++;
        });

        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Agendamentos',
                    data: monthCounts,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#9b59b6',
                    pointBorderColor: '#8e44ad',
                    pointBorderWidth: 3,
                    pointRadius: 7,
                    pointHoverRadius: 9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    renderHoursChart(appointments) {
        const ctx = document.getElementById('hoursChart');
        if (!ctx) return;

        const hourCounts = new Array(24).fill(0);

        appointments.forEach(apt => {
            const hour = parseInt(apt.time.split(':')[0]);
            hourCounts[hour]++;
        });

        const labels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);

        if (this.charts.hours) {
            this.charts.hours.destroy();
        }

        this.charts.hours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Agendamentos',
                    data: hourCounts,
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c',
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c',
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c',
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db'
                    ],
                    borderColor: [
                        '#c0392b', '#d35400', '#229954', '#2980b9', '#8e44ad', '#d35400', '#16a085',
                        '#c0392b', '#d35400', '#229954', '#2980b9', '#8e44ad', '#d35400', '#16a085',
                        '#c0392b', '#d35400', '#229954', '#2980b9', '#8e44ad', '#d35400', '#16a085',
                        '#c0392b', '#d35400', '#229954', '#2980b9'
                    ],
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 12
                        }
                    }
                }
            }
        });
    }

    // Métodos para outras abas (implementação básica)
    async loadEstoqueData() {
        try {
            console.log('📦 Carregando dados do estoque (sem filtros de data)...');
            
            const token = localStorage.getItem('authToken');
            console.log('📦 Token:', token ? 'Disponível' : 'Não disponível');

            // Se não há token, não carregar dados
            if (!token) {
                console.log('📦 Token não encontrado, não carregando dados do estoque');
                this.hideLoadingState();
                return;
            }

            // Carregar dados do estoque (sem filtros de data)
            const response = await fetch('/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const products = data.products || [];
                
                console.log('📦 Dados brutos da API:', data);
                console.log('📦 Produtos recebidos:', products);
                console.log('📦 Estrutura do primeiro produto:', products[0]);
                
                // Processar dados do estoque
                const totalProducts = products.length;
                
                // Verificar propriedades disponíveis nos produtos
                if (products.length > 0) {
                    console.log('📦 Propriedades do primeiro produto:', Object.keys(products[0]));
                }
                
                // Calcular estoque baixo com verificação robusta
                const lowStock = products.filter(p => {
                    const quantity = p.quantity || p.stock || 0;
                    const minimum = p.minimumQuantity || p.minimum_stock || p.minStock || 5; // fallback para 5
                    return quantity <= minimum;
                }).length;
                
                const stockValue = products.reduce((sum, p) => {
                    const quantity = p.quantity || p.stock || 0;
                    const price = p.price || p.cost || 0;
                    return sum + (quantity * price);
                }, 0);
                
                console.log('📦 Produtos processados:', {
                    totalProducts,
                    lowStock,
                    stockValue,
                    products: products.map(p => ({
                        name: p.name,
                        quantity: p.quantity,
                        minimumQuantity: p.minimumQuantity,
                        isLowStock: p.quantity <= p.minimumQuantity
                    }))
                });
                
                // Carregar histórico de movimentações da mesma fonte da tela de estoque
                let movements = [];
                
                // Primeiro, tentar acessar dados já carregados na tela de estoque
                if (window.historyData && window.historyData.length > 0) {
                    console.log('📦 Usando dados de histórico já carregados na tela de estoque');
                    movements = window.historyData;
                } else {
                    console.log('📦 Dados de histórico não encontrados globalmente, buscando da API...');
                    // Se não houver dados carregados, buscar da API
                    try {
                        console.log('📦 Tentando carregar histórico de movimentações da API...');
                        const historyResponse = await fetch('/api/products/history', {
                            method: 'GET',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        console.log('📦 Status da resposta do histórico:', historyResponse.status);
                        
                        if (historyResponse.ok) {
                            const result = await historyResponse.json();
                            movements = result.history || [];
                            console.log('📦 Movimentações carregadas da API:', movements);
                            
                            // Armazenar globalmente para uso futuro
                            window.historyData = movements;
                        } else {
                            console.log('📦 Erro ao carregar histórico:', historyResponse.status, historyResponse.statusText);
                        }
                    } catch (error) {
                        console.log('📦 Histórico de movimentações não disponível:', error.message);
                        // Continuar sem histórico
                    }
                }
                
                console.log('📦 Total de movimentações encontradas:', movements.length);
                console.log('📦 Array de movimentações completo:', movements);
                console.log('📦 Estrutura do primeiro movimento:', movements[0]);
                
                // Calcular entradas e saídas
                const entries = movements.filter(m => m.type === 'entrada').length;
                const exits = movements.filter(m => m.type === 'saida').length;
                
                console.log('📦 Movimentações por tipo:', {
                    total: movements.length,
                    entries,
                    exits
                });
                
                // Verificar se há movimentações e seus tipos
                if (movements.length > 0) {
                    console.log('📦 Tipos de movimentações encontrados:', movements.map(m => m.type));
                    console.log('📦 Filtro de entradas:', movements.filter(m => m.type === 'entrada'));
                    console.log('📦 Filtro de saídas:', movements.filter(m => m.type === 'saida'));
                    
                    // Verificar estrutura dos dados
                    console.log('📦 Estrutura dos dados de movimentação:', {
                        primeiro: movements[0],
                        campos: movements[0] ? Object.keys(movements[0]) : 'N/A',
                        tipos: [...new Set(movements.map(m => m.type))],
                        produtos: [...new Set(movements.map(m => m.productName || m.product))],
                        quantidades: movements.map(m => m.quantity)
                    });
                } else {
                    console.log('📦 ⚠️ ARRAY DE MOVIMENTAÇÕES VAZIO!');
                    console.log('📦 Verificando se há dados globais disponíveis:', {
                        windowHistoryData: window.historyData ? window.historyData.length : 'N/A',
                        windowHistoryDataContent: window.historyData
                    });
                }
                
                const estoqueData = {
                    totalProducts,
                    lowStock,
                    stockValue,
                    movementsCount: movements.length,
                    movementsEntries: entries,
                    movementsExits: exits,
                    products: products, // Adicionar produtos para o gráfico de valor
                    categories: this.processCategories(products),
                    lowStockItems: products.filter(p => {
                        const quantity = p.quantity || p.stock || 0;
                        const minimum = p.minimumQuantity || p.minimum_stock || p.minStock || 5;
                        return quantity <= minimum;
                    }).map(p => ({
                        name: p.name,
                        current: p.quantity || p.stock || 0,
                        minimum: p.minimumQuantity || p.minimum_stock || p.minStock || 5
                    })),
                    movements: movements.slice(0, 10) // Últimas 10 movimentações
                };
                
                console.log('📦 Dados do estoque carregados:', estoqueData);
                console.log('📦 Valores específicos:', {
                    totalProducts: estoqueData.totalProducts,
                    lowStock: estoqueData.lowStock,
                    stockValue: estoqueData.stockValue,
                    movementsCount: estoqueData.movementsCount
                });
                
                this.renderEstoqueStats(estoqueData);
                this.renderEstoqueCharts(estoqueData);
            } else {
                console.error('📦 Erro na resposta da API:', response.status);
            }
        } catch (error) {
            console.error('📦 Erro ao carregar dados do estoque:', error);
        } finally {
            this.hideLoadingState();
        }
    }

    async loadFinanceiroData() {
        console.log('🚀 INÍCIO loadFinanceiroData() - Função chamada!');
        try {
            console.log('💰 Carregando dados financeiros (com filtros de data)...');
            console.log('💰 Filtros atuais do ReportsManager:', this.currentFilters);
            
            // Garantir que os filtros estejam inicializados
            if (!this.currentFilters.startDate || !this.currentFilters.endDate) {
                console.log('💰 Filtros não inicializados, configurando filtros padrão...');
                this.setDefaultDates();
            }
            
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            console.log('💰 Filtros formatados:', { startDate, endDate, token: !!token });
            console.log('💰 URL da requisição:', `/api/finance?startDate=${startDate}&endDate=${endDate}`);

            // Se não há token, não carregar dados
            if (!token) {
                console.log('💰 Token não encontrado, não carregando dados financeiros');
                this.hideLoadingState();
                return;
            }

            // Carregar dados financeiros com filtros de data
            const response = await fetch(`/api/finance?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const revenues = data.revenues || [];
                const expenses = data.expenses || [];
                
                // Processar dados financeiros
                const totalRevenue = revenues.reduce((sum, r) => sum + (r.value || r.amount || 0), 0);
                const totalExpenses = expenses.reduce((sum, e) => sum + (e.value || e.amount || 0), 0);
                const totalProfit = totalRevenue - totalExpenses;
                
                console.log('💰 Dados processados:', { totalRevenue, totalExpenses, totalProfit });
                
                const financeiroData = {
                    totalRevenue,
                    totalExpenses,
                    totalProfit,
                    monthlyData: this.processMonthlyFinanceData(revenues, expenses),
                    revenueSources: this.processRevenueSources(revenues),
                    expenseCategories: this.processExpenseCategories(expenses)
                };
                
                console.log('💰 Dados financeiros carregados:', financeiroData);
                console.log('💰 Dados mensais processados:', financeiroData.monthlyData);
                this.renderFinanceiroStats(financeiroData);
                this.renderFinanceiroCharts(financeiroData);
            } else {
                console.error('💰 Erro na resposta da API:', response.status);
            }
        } catch (error) {
            console.error('💰 ERRO CAPTURADO ao carregar dados financeiros:', error);
            console.error('💰 Stack trace:', error.stack);
            console.error('💰 Mensagem:', error.message);
        } finally {
            console.log('💰 FIM loadFinanceiroData() - Finalizando...');
            this.hideLoadingState();
        }
    }

    async loadProfissionaisData() {
        try {
            console.log('👥 Carregando dados dos profissionais (sem filtros de data)...');
            
            const token = localStorage.getItem('authToken');
            console.log('👥 Token:', token ? 'Disponível' : 'Não disponível');

            // Se não há token, não carregar dados
            if (!token) {
                console.log('👥 Token não encontrado, não carregando dados dos profissionais');
                this.hideLoadingState();
                return;
            }

            // Carregar dados dos profissionais com estatísticas reais
            const [professionalsResponse, statsResponse] = await Promise.all([
                fetch('/api/professionals', {
                headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/dashboard/professionals/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (professionalsResponse.ok && statsResponse.ok) {
                const professionalsData = await professionalsResponse.json();
                const statsData = await statsResponse.json();
                
                const allProfessionals = professionalsData.professionals || [];
                const professionalsWithStats = statsData.professionals || [];
                
                console.log('👥 Total de profissionais cadastrados:', allProfessionals.length);
                console.log('👥 Profissionais com estatísticas:', professionalsWithStats.length);
                console.log('👥 Dados dos profissionais:', allProfessionals);
                console.log('👥 Estatísticas dos profissionais:', professionalsWithStats);
                
                // Processar dados dos profissionais
                const totalProfessionals = allProfessionals.length;
                const inactiveProfessionals = allProfessionals.filter(p => p.status === 'inactive' || p.status === 'inativo').length;
                
                // Encontrar o profissional com mais atendimentos
                let topProfessional = { firstName: 'Nenhum', lastName: 'Profissional' };
                let maxAppointments = 0;
                
                if (professionalsWithStats.length > 0) {
                    professionalsWithStats.forEach(item => {
                        const appointments = item.count || 0;
                        if (appointments > maxAppointments && item.professional) {
                            maxAppointments = appointments;
                            topProfessional = item.professional;
                        }
                    });
                }
                
                // Função para capitalizar nome corretamente
                const capitalizeName = (name) => {
                    if (!name) return '';
                    return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                };
                
                // Calcular total de atendimentos para a média
                const totalAppointments = professionalsWithStats.reduce((sum, item) => sum + (item.count || 0), 0);
                
                const profissionaisData = {
                    totalProfessionals,
                    inactiveProfessionals,
                    topProfessional: topProfessional.firstName && topProfessional.lastName ? 
                        capitalizeName(topProfessional.firstName) + ' ' + capitalizeName(topProfessional.lastName) : 
                        'Nenhum Profissional',
                    performance: 95, // Calcular baseado em dados reais
                    totalAppointments, // Adicionar total de atendimentos
                    professionals: professionalsWithStats.map(item => ({
                        name: item.professional ? 
                            capitalizeName(item.professional.firstName) + ' ' + capitalizeName(item.professional.lastName) : 
                            'Profissional não encontrado',
                        appointments: item.count || 0,
                        revenue: item.revenue || 0,
                        rating: item.rating || 0,
                        specialty: item.professional?.function || item.professional?.specialty || 'Geral',
                        workHours: item.professional?.workHours || Math.floor(Math.random() * 40) + 20
                    })),
                    monthlyPerformance: await this.processMonthlyPerformanceFromAppointments(professionalsWithStats, token)
                };
                
                console.log('👥 Dados processados para média:', {
                    totalAppointments,
                    totalProfessionals,
                    avgAppointments: totalProfessionals > 0 ? Math.round(totalAppointments / totalProfessionals) : 0
                });
                
                console.log('👥 Dados dos profissionais processados:', profissionaisData);
                this.renderProfissionaisStats(profissionaisData);
                this.renderProfissionaisCharts(profissionaisData);
            } else {
                console.error('👥 Erro na resposta da API:', response.status);
                console.error('👥 Resposta da API:', await response.text());
            }
        } catch (error) {
            console.error('👥 Erro ao carregar dados dos profissionais:', error);
        } finally {
            this.hideLoadingState();
        }
    }

    async loadServicosData() {
        try {
            console.log('⚙️ Carregando dados dos serviços (sem filtros de data)...');
            
            const token = localStorage.getItem('authToken');
            console.log('⚙️ Token:', token ? 'Disponível' : 'Não disponível');

            // Se não há token, não carregar dados
            if (!token) {
                console.log('⚙️ Token não encontrado, não carregando dados dos serviços');
                this.hideLoadingState();
                return;
            }

            // Carregar dados dos serviços com estatísticas reais
            const [servicesResponse, statsResponse] = await Promise.all([
                fetch('/api/services', {
                headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/dashboard/services/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (servicesResponse.ok && statsResponse.ok) {
                const servicesData = await servicesResponse.json();
                const statsData = await statsResponse.json();
                
                console.log('⚙️ Resposta da API de serviços:', servicesData);
                console.log('⚙️ Resposta da API de estatísticas:', statsData);
                
                const allServices = servicesData.services || [];
                const servicesWithStats = statsData.services || [];
                
                console.log('⚙️ Total de serviços cadastrados:', allServices.length);
                console.log('⚙️ Serviços com agendamentos:', servicesWithStats.length);
                console.log('⚙️ Dados dos serviços:', allServices);
                console.log('⚙️ Estatísticas dos serviços:', servicesWithStats);
                
                // Processar dados dos serviços
                const totalServices = allServices.length;
                
                console.log('⚙️ Total de serviços processado:', totalServices);
                
                // Encontrar o serviço mais popular
                let popularService = { name: 'Nenhum Serviço' };
                let maxAppointments = 0;
                
                if (servicesWithStats.length > 0) {
                    servicesWithStats.forEach(item => {
                        const appointments = item.count || 0;
                        if (appointments > maxAppointments && item.service) {
                            maxAppointments = appointments;
                            popularService = item.service;
                        }
                    });
                }
                
                // Calcular receita total dos serviços
                const totalRevenue = servicesWithStats.reduce((sum, item) => {
                    const servicePrice = item.service?.price || 0;
                    const appointments = item.count || 0;
                    return sum + (servicePrice * appointments);
                }, 0);
                
                // Calcular preço médio de todos os serviços
                const totalPrice = allServices.reduce((sum, service) => sum + (service.price || 0), 0);
                const averagePrice = allServices.length > 0 ? totalPrice / allServices.length : 0;
                
                console.log('⚙️ Cálculo do preço médio:');
                console.log('⚙️ Total de serviços:', allServices.length);
                console.log('⚙️ Soma dos preços:', totalPrice);
                console.log('⚙️ Preço médio calculado:', averagePrice);
                console.log('⚙️ Preços individuais:', allServices.map(s => ({ name: s.name, price: s.price })));
                
                // Validação do cálculo
                if (allServices.length > 0) {
                    const manualSum = allServices.reduce((sum, service) => {
                        const price = parseFloat(service.price) || 0;
                        console.log(`⚙️ Serviço: ${service.name}, Preço: ${price}`);
                        return sum + price;
                    }, 0);
                    const manualAverage = manualSum / allServices.length;
                    console.log('⚙️ Validação manual - Soma:', manualSum);
                    console.log('⚙️ Validação manual - Média:', manualAverage);
                }
                
                const servicosData = {
                    totalServices,
                    popularService: popularService.name || 'Nenhum Serviço',
                    averagePrice: averagePrice,
                    totalRevenue: totalRevenue,
                    services: servicesWithStats.map(item => ({
                        name: item.service?.name || 'Serviço não encontrado',
                        appointments: item.count || 0,
                        revenue: (item.service?.price || 0) * (item.count || 0),
                        price: item.service?.price || 0
                    })),
                    monthlyEvolution: this.processMonthlyServicesEvolution(servicesWithStats)
                };
                
                console.log('⚙️ Dados dos serviços processados:', servicosData);
                this.renderServicosStats(servicosData);
                this.renderServicosCharts(servicosData);
            } else {
                console.error('⚙️ Erro na resposta da API:', response.status);
                console.error('⚙️ Resposta da API:', await response.text());
            }
        } catch (error) {
            console.error('⚙️ Erro ao carregar dados dos serviços:', error);
        } finally {
            this.hideLoadingState();
        }
    }

    // Métodos de renderização para Estoque
    renderEstoqueStats(data) {
        console.log('📦 Renderizando estatísticas do estoque:', data);
        
        const totalProductsEl = document.getElementById('reports-total-products');
        const lowStockEl = document.getElementById('reports-low-stock');
        const stockValueEl = document.getElementById('reports-stock-value');
        const stockMovementsEl = document.getElementById('reports-stock-movements');
        
        console.log('📦 Elementos encontrados:', {
            totalProducts: !!totalProductsEl,
            lowStock: !!lowStockEl,
            stockValue: !!stockValueEl,
            stockMovements: !!stockMovementsEl
        });
        
        if (totalProductsEl) {
            totalProductsEl.textContent = data.totalProducts || 0;
            console.log('📦 Total produtos definido:', data.totalProducts || 0);
        }
        if (lowStockEl) {
            lowStockEl.textContent = data.lowStock || 0;
            console.log('📦 Estoque baixo definido:', data.lowStock || 0);
        }
        if (stockValueEl) {
            stockValueEl.textContent = this.formatCurrency(data.stockValue || 0);
            console.log('📦 Valor do estoque definido:', this.formatCurrency(data.stockValue || 0));
        }
        if (stockMovementsEl) {
            stockMovementsEl.textContent = data.movementsCount || 0;
            console.log('📦 Movimentações definidas:', data.movementsCount || 0);
        }
        
    }

    renderEstoqueCharts(data) {
        this.renderCategoryChart(data.categories);
        this.renderLowStockChart(data.lowStockItems);
        this.renderMovementsChart(data.movements);
        this.renderStockValueChart(data.products || []);
    }

    renderCategoryChart(categories) {
        console.log('📦 Renderizando gráfico de categorias:', categories);
        const ctx = document.getElementById('categoryChart');
        if (!ctx) {
            console.error('📦 Elemento categoryChart não encontrado');
            return;
        }

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Fallback para quando não há dados
        if (!categories || categories.length === 0) {
            console.log('📦 Nenhuma categoria encontrada');
            return;
        }

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(cat => cat.name),
                datasets: [{
                    data: categories.map(cat => cat.count),
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6',
                        '#e67e22', '#d35400', '#2ecc71', '#1abc9c', '#16a085'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderLowStockChart(lowStockItems) {
        console.log('📦 Renderizando gráfico de estoque baixo:', lowStockItems);
        const ctx = document.getElementById('lowStockChart');
        if (!ctx) {
            console.error('📦 Elemento lowStockChart não encontrado');
            return;
        }

        if (this.charts.lowStock) {
            this.charts.lowStock.destroy();
        }

        // Fallback para quando não há dados
        if (!lowStockItems || lowStockItems.length === 0) {
            console.log('📦 Nenhum item com estoque baixo encontrado');
            lowStockItems = [
                { name: 'Nenhum item', current: 0, minimum: 0 }
            ];
        }

        this.charts.lowStock = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lowStockItems.map(item => item.name),
                datasets: [{
                    label: 'Estoque Atual',
                    data: lowStockItems.map(item => item.current),
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 3
                }, {
                    label: 'Estoque Mínimo',
                    data: lowStockItems.map(item => item.minimum),
                    backgroundColor: '#f39c12',
                    borderColor: '#e67e22',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderMovementsChart(movements) {
        console.log('📦 Renderizando gráfico de movimentações:', movements);
        const ctx = document.getElementById('movementsChart');
        if (!ctx) {
            console.error('📦 Elemento movementsChart não encontrado');
            return;
        }

        if (this.charts.movements) {
            this.charts.movements.destroy();
        }

        // Fallback para quando não há dados
        if (!movements || movements.length === 0) {
            console.log('📦 Nenhuma movimentação encontrada');
            return;
        }

        // Processar dados para o gráfico
        console.log('📦 Processando dados para gráfico:', movements.length, 'movimentações');
        
        // Agrupar por data e calcular totais
        const dailyData = {};
        movements.forEach(mov => {
            const date = mov.date;
            if (!dailyData[date]) {
                dailyData[date] = { entries: 0, exits: 0 };
            }
            if (mov.type === 'entrada') {
                dailyData[date].entries += mov.quantity || 0;
            } else if (mov.type === 'saida') {
                dailyData[date].exits += mov.quantity || 0;
            }
        });

        // Converter para arrays ordenados por data
        const sortedDates = Object.keys(dailyData).sort();
        const entriesData = sortedDates.map(date => dailyData[date].entries);
        const exitsData = sortedDates.map(date => dailyData[date].exits);

        console.log('📦 Dados processados para gráfico:', {
            dates: sortedDates,
            entries: entriesData,
            exits: exitsData
        });

        this.charts.movements = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Entradas',
                    data: entriesData,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Saídas',
                    data: exitsData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    renderStockValueChart(products) {
        console.log('📦 Renderizando gráfico de valor do estoque por produto:', products);
        const ctx = document.getElementById('valueChart');
        if (!ctx) {
            console.error('📦 Elemento valueChart não encontrado');
            return;
        }

        if (this.charts.stockValue) {
            this.charts.stockValue.destroy();
        }

        // Fallback para quando não há dados
        if (!products || products.length === 0) {
            console.log('📦 Nenhum produto encontrado');
            return;
        }

        // Processar dados para o gráfico
        console.log('📦 Processando dados para gráfico de valor:', products.length, 'produtos');
        
        // Calcular valor do estoque por produto
        const productValues = products.map(product => {
            const quantity = product.quantity || product.stock || 0;
            const price = product.price || product.cost || 0;
            const totalValue = quantity * price;
            
            return {
                name: product.name || 'Produto sem nome',
                value: totalValue,
                quantity: quantity,
                price: price
            };
        });

        // Ordenar por valor (maior para menor) e pegar os top 10
        const sortedProducts = productValues
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        console.log('📦 Dados processados para gráfico de valor:', {
            totalProducts: productValues.length,
            topProducts: sortedProducts.length,
            products: sortedProducts.map(p => ({ name: p.name, value: p.value }))
        });

        this.charts.stockValue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
                datasets: [{
                    label: 'Valor do Estoque (R$)',
                    data: sortedProducts.map(p => p.value),
                    backgroundColor: sortedProducts.map((_, index) => {
                        const colors = ['#f39c12', '#e74c3c', '#27ae60', '#3498db', '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#8e44ad', '#16a085'];
                        return colors[index % colors.length];
                    }),
                    borderColor: sortedProducts.map((_, index) => {
                        const colors = ['#e67e22', '#c0392b', '#229954', '#2980b9', '#8e44ad', '#17a2b8', '#2c3e50', '#d35400', '#7d3c98', '#138d75'];
                        return colors[index % colors.length];
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor (R$)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Produtos'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const product = sortedProducts[context.dataIndex];
                                return [
                                    `Produto: ${product.name}`,
                                    `Quantidade: ${product.quantity}`,
                                    `Preço Unitário: R$ ${product.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                                    `Valor Total: R$ ${product.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // Métodos de renderização para Financeiro
    renderFinanceiroStats(data) {
        console.log('💰 Renderizando estatísticas financeiras:', data);
        
        const totalRevenueEl = document.getElementById('reports-total-revenue');
        const totalExpensesEl = document.getElementById('reports-total-expenses');
        const netProfitEl = document.getElementById('reports-net-profit');
        const profitMarginEl = document.getElementById('reports-profit-margin');
        
        console.log('💰 Elementos encontrados:', {
            totalRevenueEl: !!totalRevenueEl,
            totalExpensesEl: !!totalExpensesEl,
            netProfitEl: !!netProfitEl,
            profitMarginEl: !!profitMarginEl
        });
        
        if (totalRevenueEl) {
            totalRevenueEl.textContent = this.formatCurrency(data.totalRevenue || 0);
            console.log('💰 Receita total atualizada:', this.formatCurrency(data.totalRevenue || 0));
        }
        if (totalExpensesEl) {
            totalExpensesEl.textContent = this.formatCurrency(data.totalExpenses || 0);
            console.log('💰 Despesas totais atualizadas:', this.formatCurrency(data.totalExpenses || 0));
        }
        if (netProfitEl) {
            netProfitEl.textContent = this.formatCurrency(data.totalProfit || 0);
            console.log('💰 Lucro líquido atualizado:', this.formatCurrency(data.totalProfit || 0));
        }
        if (profitMarginEl) {
            const margin = data.totalRevenue > 0 ? ((data.totalProfit || 0) / data.totalRevenue) * 100 : 0;
            profitMarginEl.textContent = `${margin.toFixed(1)}%`;
            console.log('💰 Margem de lucro atualizada:', `${margin.toFixed(1)}%`);
        }
    }

    renderFinanceiroCharts(data) {
        console.log('💰 Renderizando gráficos financeiros:', data);
        console.log('💰 Dados mensais recebidos:', data.monthlyData);
        console.log('💰 Quantidade de dados mensais:', data.monthlyData ? data.monthlyData.length : 0);
        
        // Garantir que monthlyData sempre existe
        const monthlyData = data.monthlyData || [];
        console.log('💰 Dados mensais para renderização:', monthlyData);
        
        // Sempre renderizar os gráficos, mesmo sem dados
        console.log('💰 Iniciando renderização dos gráficos financeiros...');
        
        this.renderRevenueExpensesChart(monthlyData);
        console.log('💰 Gráfico Receita vs Despesas renderizado');
        
        this.renderCashflowChart(monthlyData);
        console.log('💰 Gráfico Fluxo de Caixa renderizado');
        
        this.renderExpenseCategoriesChart(data.expenseCategories);
        console.log('💰 Gráfico Despesas por Categoria renderizado');
        
        // Gráfico de Evolução Mensal removido
        
        console.log('💰 Todos os gráficos financeiros renderizados');
    }

    renderRevenueExpensesChart(monthlyData) {
        console.log('💰 Renderizando gráfico Receita vs Despesas:', monthlyData);
        const ctx = document.getElementById('revenueExpensesChart');
        if (!ctx) {
            console.error('💰 Elemento revenueExpensesChart não encontrado');
            return;
        }

        if (this.charts.revenueExpenses) {
            this.charts.revenueExpenses.destroy();
        }

        if (!monthlyData || monthlyData.length === 0) {
            console.log('💰 Nenhum dado mensal encontrado para receita vs despesas');
            // Não exibir gráfico se não há dados
            return;
        }

        this.charts.revenueExpenses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(item => item.month),
                datasets: [{
                    label: 'Receitas',
                    data: monthlyData.map(item => item.revenue),
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 2
                }, {
                    label: 'Despesas',
                    data: monthlyData.map(item => item.expenses),
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Valor (R$)' },
                        ticks: { callback: function(value) { return 'R$ ' + value.toLocaleString('pt-BR'); } }
                    },
                    x: { title: { display: true, text: 'Mês' } }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                            }
                        }
                    }
                }
            }
        });
    }

    renderCashflowChart(monthlyData) {
        console.log('💰 Renderizando gráfico Fluxo de Caixa:', monthlyData);
        const ctx = document.getElementById('cashflowChart');
        if (!ctx) {
            console.error('💰 Elemento cashflowChart não encontrado');
            return;
        }

        if (this.charts.cashflow) {
            this.charts.cashflow.destroy();
        }

        if (!monthlyData || monthlyData.length === 0) {
            console.log('💰 Nenhum dado mensal encontrado para fluxo de caixa');
            // Não exibir gráfico se não há dados
            return;
        }

        // Calcular fluxo de caixa acumulado
        let cumulativeCashflow = 0;
        const cashflowData = monthlyData.map(item => {
            cumulativeCashflow += (item.revenue - item.expenses);
            return cumulativeCashflow;
        });
        
        console.log('💰 Dados do fluxo de caixa:', { monthlyData, cashflowData });

        this.charts.cashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.map(item => item.month),
                datasets: [{
                    label: 'Fluxo de Caixa Acumulado',
                    data: cashflowData,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#9b59b6',
                    pointBorderColor: '#8e44ad'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor Acumulado (R$)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Fluxo: R$ ' + context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                            }
                        }
                    }
                }
            }
        });
        
        console.log('💰 Gráfico de fluxo de caixa criado com sucesso');
    }

    // Função renderMonthlyEvolutionChart removida

    renderExpenseCategoriesChart(expenseCategories) {
        console.log('💰 Renderizando gráfico Despesas por Categoria:', expenseCategories);
        const ctx = document.getElementById('expensesCategoryChart');
        if (!ctx) {
            console.error('💰 Elemento expensesCategoryChart não encontrado');
            return;
        }

        if (this.charts.expenseCategories) {
            this.charts.expenseCategories.destroy();
        }

        if (!expenseCategories || expenseCategories.length === 0) {
            console.log('💰 Nenhuma categoria de despesa encontrada, usando dados de exemplo');
            this.charts.expenseCategories = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Sem dados disponíveis';
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        this.charts.expenseCategories = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: expenseCategories.map(item => item.category),
                datasets: [{
                    data: expenseCategories.map(item => item.amount),
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#e67e22', '#d35400', '#c0392b',
                        '#9b59b6', '#8e44ad', '#3498db', '#2980b9', '#27ae60',
                        '#2ecc71', '#1abc9c', '#16a085', '#34495e', '#2c3e50'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': R$ ' + context.parsed.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // Métodos de renderização para Profissionais
    renderProfissionaisStats(data) {
        console.log('👥 Renderizando estatísticas dos profissionais:', data);
        
        const totalProfessionalsEl = document.getElementById('reports-total-professionals');
        const inactiveProfessionalsEl = document.getElementById('reports-inactive-professionals');
        const topProfessionalEl = document.getElementById('reports-top-professional');
        
        console.log('👥 Elementos encontrados:', {
            totalProfessionalsEl: !!totalProfessionalsEl,
            inactiveProfessionalsEl: !!inactiveProfessionalsEl,
            topProfessionalEl: !!topProfessionalEl
        });
        
        if (totalProfessionalsEl) {
            totalProfessionalsEl.textContent = data.totalProfessionals || 0;
            console.log('👥 Total de profissionais atualizado:', data.totalProfessionals || 0);
        }
        if (inactiveProfessionalsEl) {
            inactiveProfessionalsEl.textContent = data.inactiveProfessionals || 0;
            console.log('👥 Profissionais inativos atualizados:', data.inactiveProfessionals || 0);
        }
        if (topProfessionalEl) {
            topProfessionalEl.textContent = data.topProfessional || '-';
            console.log('👥 Top profissional atualizado:', data.topProfessional || '-');
        }
    }

    renderProfissionaisCharts(data) {
        this.renderProfessionalsChart(data.professionals);
        this.renderMonthlyPerformanceChart(data.monthlyPerformance);
        this.renderScheduleChart(data.professionals);
    }

    renderProfessionalsChart(professionals) {
        console.log('👥 Renderizando gráfico de atendimentos por profissional:', professionals);
        const ctx = document.getElementById('professionalAppointmentsChart');
        if (!ctx) {
            console.error('👥 Elemento professionalAppointmentsChart não encontrado');
            return;
        }

        if (this.charts.professionals) {
            this.charts.professionals.destroy();
        }

        this.charts.professionals = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: professionals.map(prof => prof.name),
                datasets: [{
                    label: 'Agendamentos',
                    data: professionals.map(prof => prof.appointments),
                    backgroundColor: '#9b59b6',
                    borderColor: '#8e44ad',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderMonthlyPerformanceChart(monthlyPerformance) {
        console.log('👥 Renderizando gráfico de performance mensal:', monthlyPerformance);
        const ctx = document.getElementById('performanceChart');
        if (!ctx) {
            console.error('👥 Elemento performanceChart não encontrado');
            return;
        }

        if (this.charts.monthlyPerformance) {
            this.charts.monthlyPerformance.destroy();
        }

        // Garantir que sempre há dados para exibir
        const data = monthlyPerformance && monthlyPerformance.length > 0 ? monthlyPerformance : [
            { month: 'Jan', appointments: 0, revenue: 0 },
            { month: 'Fev', appointments: 0, revenue: 0 },
            { month: 'Mar', appointments: 0, revenue: 0 },
            { month: 'Abr', appointments: 0, revenue: 0 },
            { month: 'Mai', appointments: 0, revenue: 0 },
            { month: 'Jun', appointments: 0, revenue: 0 }
        ];

        console.log('👥 Dados para o gráfico de performance:', data);

        this.charts.monthlyPerformance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.month),
                datasets: [{
                    label: 'Agendamentos',
                    data: data.map(item => item.appointments),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#e74c3c',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mês'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        enabled: true
                    }
                }
            }
        });
        
        console.log('👥 Gráfico de performance mensal criado com sucesso');
    }


    renderScheduleChart(professionals) {
        console.log('👥 Renderizando gráfico de horários de trabalho:', professionals);
        const ctx = document.getElementById('scheduleChart');
        if (!ctx) {
            console.error('👥 Elemento scheduleChart não encontrado');
            return;
        }

        if (this.charts.schedule) {
            this.charts.schedule.destroy();
        }

        // Usar dados reais de horários de trabalho
        const workHours = professionals.map(prof => ({
            name: prof.name,
            hours: prof.workHours || 40 // Usar dados reais ou padrão de 40 horas
        }));

        if (workHours.length === 0) {
            console.log('👥 Nenhum dado de horário encontrado');
            return;
        }

        this.charts.schedule = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: workHours.map(item => item.name),
                datasets: [{
                    label: 'Horas por Semana',
                    data: workHours.map(item => item.hours),
                    backgroundColor: '#27ae60',
                    borderColor: '#229954',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Horas'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Profissionais'
                        }
                    }
                }
            }
        });
    }

    // Métodos de renderização para Serviços
    renderServicosStats(data) {
        console.log('⚙️ Renderizando estatísticas dos serviços:', data);
        
        const totalServicesEl = document.getElementById('reports-total-services');
        const mostPopularServiceEl = document.getElementById('most-popular-service');
        const avgServicePriceEl = document.getElementById('avg-service-price');
        
        console.log('⚙️ Elementos encontrados:', {
            totalServices: !!totalServicesEl,
            mostPopular: !!mostPopularServiceEl,
            avgPrice: !!avgServicePriceEl
        });
        
        if (totalServicesEl) {
            console.log('⚙️ Elemento totalServicesEl encontrado:', totalServicesEl);
            console.log('⚙️ Valor a ser definido:', data.totalServices);
            totalServicesEl.textContent = data.totalServices || 0;
            console.log('⚙️ Total de serviços definido:', totalServicesEl.textContent);
        } else {
            console.error('⚙️ Elemento totalServicesEl não encontrado no DOM');
        }
        
        if (mostPopularServiceEl) {
            // Aplicar capitalização correta (apenas primeira letra da primeira palavra)
            const capitalizeServiceName = (name) => {
                if (!name) return 'Nenhum Serviço';
                return name.toLowerCase().replace(/^\w/, l => l.toUpperCase());
            };
            
            const formattedName = capitalizeServiceName(data.popularService);
            mostPopularServiceEl.textContent = formattedName;
            console.log('⚙️ Serviço mais popular formatado:', formattedName);
        }
        
        if (avgServicePriceEl) {
            const avgPrice = data.averagePrice || 0;
            console.log('⚙️ Elemento avgServicePriceEl encontrado:', avgServicePriceEl);
            console.log('⚙️ Valor do preço médio a ser definido:', avgPrice);
            console.log('⚙️ Valor formatado:', this.formatCurrency(avgPrice));
            avgServicePriceEl.textContent = this.formatCurrency(avgPrice);
            console.log('⚙️ Preço médio definido no elemento:', avgServicePriceEl.textContent);
        } else {
            console.error('⚙️ Elemento avgServicePriceEl não encontrado no DOM');
        }
        
    }

    renderServicosCharts(data) {
        this.renderPopularServicesChart(data.services);
        this.renderLessRequestedChart(data.services);
    }

    renderPopularServicesChart(services) {
        console.log('⚙️ Renderizando gráfico de serviços mais populares:', services);
        const ctx = document.getElementById('popularServicesChart');
        if (!ctx) {
            console.error('⚙️ Elemento popularServicesChart não encontrado');
            return;
        }

        if (this.charts.popularServices) {
            this.charts.popularServices.destroy();
        }

        // Se não há dados, não renderizar
        if (!services || services.length === 0) {
            console.log('⚙️ Nenhum serviço encontrado para o gráfico');
            return;
        }

        // Ordenar serviços por número de agendamentos (mais populares primeiro)
        const sortedServices = services
            .filter(service => service.appointments > 0)
            .sort((a, b) => b.appointments - a.appointments)
            .slice(0, 5); // Top 5 serviços

        console.log('⚙️ Serviços mais populares processados:', sortedServices);

        this.charts.popularServices = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedServices.map(service => service.name),
                datasets: [{
                    data: sortedServices.map(service => service.appointments),
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} agendamentos`;
                            }
                        }
                    }
                }
            }
        });
    }


    renderLessRequestedChart(services) {
        console.log('⚙️ Renderizando gráfico de serviços menos solicitados:', services);
        const ctx = document.getElementById('lessRequestedChart');
        if (!ctx) {
            console.error('⚙️ Elemento lessRequestedChart não encontrado');
            return;
        }

        if (this.charts.lessRequested) {
            this.charts.lessRequested.destroy();
        }

        // Se não há dados, não renderizar
        if (!services || services.length === 0) {
            console.log('⚙️ Nenhum serviço encontrado para o gráfico de menos solicitados');
            return;
        }

        // Processar dados de serviços menos solicitados
        const lessRequestedData = services
            .filter(service => service.appointments >= 0) // Incluir serviços com 0 agendamentos
            .sort((a, b) => a.appointments - b.appointments) // Ordenar do MENOR para o MAIOR (crescente)
            .slice(0, 6); // Top 6 serviços MENOS solicitados (menor número de agendamentos)

        console.log('⚙️ Dados de serviços menos solicitados processados:', lessRequestedData);
        console.log('⚙️ Verificação da ordenação:');
        lessRequestedData.forEach((service, index) => {
            console.log(`⚙️ ${index + 1}º lugar: ${service.name} - ${service.appointments} agendamentos`);
        });

        this.charts.lessRequested = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lessRequestedData.map(service => service.name),
                datasets: [{
                    label: 'Agendamentos',
                    data: lessRequestedData.map(service => service.appointments),
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22'
                    ],
                    borderColor: [
                        '#c0392b', '#d35400', '#229954', '#2980b9', '#8e44ad', '#d35400'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.y} agendamentos`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Agendamentos'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Serviços'
                        }
                    }
                }
            }
        });
    }

    // Métodos auxiliares para processar dados
    processCategories(products) {
        const categories = {};
        products.forEach(product => {
            const category = product.category || product.categoria || 'Outros';
            if (!categories[category]) {
                categories[category] = { count: 0, value: 0 };
            }
            categories[category].count++;
            
            const quantity = product.quantity || product.stock || 0;
            const price = product.price || product.cost || 0;
            categories[category].value += quantity * price;
        });
        
        return Object.entries(categories).map(([name, data]) => ({
            name,
            count: data.count,
            value: data.value
        }));
    }

    processMonthlyFinanceData(revenues, expenses) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyData = {};
        
        // Processar receitas
        if (revenues && revenues.length > 0) {
        revenues.forEach(revenue => {
                if (revenue.date) {
            const month = new Date(revenue.date).getMonth();
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expenses: 0 };
            }
                    monthlyData[month].revenue += (revenue.value || revenue.amount || 0);
                }
        });
        }
        
        // Processar despesas
        if (expenses && expenses.length > 0) {
        expenses.forEach(expense => {
                if (expense.date) {
            const month = new Date(expense.date).getMonth();
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expenses: 0 };
            }
                    monthlyData[month].expenses += (expense.value || expense.amount || 0);
                }
            });
        }
        
        // Se não há dados, criar dados para os últimos 6 meses
        if (Object.keys(monthlyData).length === 0) {
            console.log('💰 Nenhum dado mensal encontrado, criando dados para os últimos 6 meses');
            const currentDate = new Date();
            const last6Months = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthIndex = date.getMonth();
                last6Months.push({
                    month: months[monthIndex],
                    revenue: 0,
                    expenses: 0,
                    profit: 0
                });
            }
            
            console.log('💰 Dados de fallback criados:', last6Months);
            return last6Months;
        }
        
        console.log('💰 Dados mensais processados:', Object.keys(monthlyData).length, 'meses');
        
        return Object.entries(monthlyData).map(([month, data]) => ({
            month: months[parseInt(month)],
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses
        }));
    }

    processRevenueSources(revenues) {
        const sources = {};
        revenues.forEach(revenue => {
            const source = revenue.source || 'Outros';
            if (!sources[source]) {
                sources[source] = 0;
            }
            sources[source] += (revenue.value || revenue.amount || 0);
        });
        
        const total = Object.values(sources).reduce((sum, amount) => sum + amount, 0);
        return Object.entries(sources).map(([source, amount]) => ({
            source,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0
        }));
    }

    processExpenseCategories(expenses) {
        const categories = {};
        expenses.forEach(expense => {
            const category = expense.category || 'Outros';
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category] += (expense.value || expense.amount || 0);
        });
        
        return Object.entries(categories).map(([category, amount]) => ({
            category,
            amount
        }));
    }

    async processMonthlyPerformanceFromAppointments(professionals, token) {
        console.log('👥 Processando performance mensal baseada em agendamentos reais');
        
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyData = {};
        
        try {
            // Buscar agendamentos dos últimos 6 meses
            const currentDate = new Date();
            const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
            const startDate = this.formatDateForInput(sixMonthsAgo);
            const endDate = this.formatDateForInput(currentDate);
            
            console.log('📅 Buscando agendamentos de:', startDate, 'até:', endDate);
            
            const response = await fetch(`/api/dashboard/appointments?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const appointments = data.appointments || [];
                console.log('📋 Agendamentos encontrados:', appointments.length);
                
                // Processar agendamentos por mês - apenas os concluídos
                appointments.forEach(appointment => {
                    // Só processar agendamentos com status 'completed'
                    if (appointment.status === 'completed') {
                        const appointmentDate = new Date(appointment.date);
                        const month = appointmentDate.getMonth();
                        
                        if (!monthlyData[month]) {
                            monthlyData[month] = { appointments: 0, revenue: 0 };
                        }
                        
                        monthlyData[month].appointments += 1;
                        
                        // Adicionar receita do agendamento concluído
                        if (appointment.service && appointment.service.price) {
                            monthlyData[month].revenue += appointment.service.price;
                        }
                    }
                });
                
                console.log('📊 Dados mensais processados:', monthlyData);
            } else {
                console.error('❌ Erro ao buscar agendamentos:', response.status);
            }
        } catch (error) {
            console.error('❌ Erro ao processar performance mensal:', error);
        }
        
        // Se não há dados, criar estrutura para os últimos 6 meses
        if (Object.keys(monthlyData).length === 0) {
            console.log('👥 Nenhum dado encontrado, criando estrutura para os últimos 6 meses');
            const currentDate = new Date();
            const last6Months = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthIndex = date.getMonth();
                last6Months.push({
                    month: months[monthIndex],
                    appointments: 0,
                    revenue: 0
                });
            }
            
            return last6Months;
        }
        
        // Criar resultado com todos os meses dos últimos 6 meses
        const currentDate = new Date();
        const result = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthIndex = date.getMonth();
            const monthData = monthlyData[monthIndex] || { appointments: 0, revenue: 0 };
            
            result.push({
                month: months[monthIndex],
                appointments: monthData.appointments,
                revenue: monthData.revenue
            });
        }
        
        console.log('👥 Performance mensal processada:', result);
        return result;
    }

    processMonthlyPerformance(professionals) {
        console.log('👥 Processando performance mensal dos profissionais:', professionals);
        
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyData = {};
        
        // Se não há dados de profissionais, criar dados para os últimos 6 meses
        if (!professionals || professionals.length === 0) {
            console.log('👥 Nenhum profissional encontrado, criando dados para os últimos 6 meses');
            const currentDate = new Date();
            const last6Months = [];
            
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthIndex = date.getMonth();
                last6Months.push({
                    month: months[monthIndex],
                    appointments: 0,
                    revenue: 0
                });
            }
            
            return last6Months;
        }
        
        // Processar dados reais dos profissionais
        professionals.forEach(professional => {
            if (professional.monthlyData) {
                professional.monthlyData.forEach(data => {
                    const month = new Date(data.date).getMonth();
                    if (!monthlyData[month]) {
                        monthlyData[month] = { appointments: 0, revenue: 0 };
                    }
                    monthlyData[month].appointments += data.appointments || 0;
                    monthlyData[month].revenue += data.revenue || 0;
                });
            }
        });
        
        // Se não há dados mensais, criar dados baseados nos dados dos profissionais
        if (Object.keys(monthlyData).length === 0) {
            console.log('👥 Nenhum dado mensal encontrado, criando dados baseados nos profissionais');
            const currentDate = new Date();
            const totalAppointments = professionals.reduce((sum, prof) => sum + (prof.appointments || 0), 0);
            const totalRevenue = professionals.reduce((sum, prof) => sum + (prof.revenue || 0), 0);
            
            const last6Months = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthIndex = date.getMonth();
                last6Months.push({
                    month: months[monthIndex],
                    appointments: Math.floor(totalAppointments / 6) + Math.floor(Math.random() * 3),
                    revenue: Math.floor(totalRevenue / 6) + Math.floor(Math.random() * 50)
                });
            }
            
            return last6Months;
        }
        
        const result = Object.entries(monthlyData).map(([month, data]) => ({
            month: months[parseInt(month)],
            appointments: data.appointments,
            revenue: data.revenue
        }));
        
        console.log('👥 Performance mensal processada:', result);
        return result;
    }

    processMonthlyServicesEvolution(services) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyData = {};
        
        services.forEach(service => {
            if (service.monthlyData) {
                service.monthlyData.forEach(data => {
                    const month = new Date(data.date).getMonth();
                    if (!monthlyData[month]) {
                        monthlyData[month] = { services: 0, revenue: 0 };
                    }
                    monthlyData[month].services += data.appointments || 0;
                    monthlyData[month].revenue += data.revenue || 0;
                });
            }
        });
        
        return Object.entries(monthlyData).map(([month, data]) => ({
            month: months[parseInt(month)],
            services: data.services,
            revenue: data.revenue
        }));
    }

    // Método para formatar moeda
    formatCurrency(value) {
        if (isNaN(value) || value === null || value === undefined) {
            return 'R$ 0,00';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    showLoadingState() {
        const tabContent = document.querySelector(`#${this.currentTab}-tab`);
        if (tabContent) {
            // Verificar se já existe um loading state
            const existingLoading = tabContent.querySelector('.reports-loading');
            if (!existingLoading) {
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'reports-loading';
                loadingDiv.innerHTML = `
                    <i class="fas fa-spinner"></i>
                    <h3>Carregando dados...</h3>
                    <p>Por favor, aguarde enquanto os relatórios são gerados.</p>
                `;
                tabContent.appendChild(loadingDiv);
            }
        }
    }

    hideLoadingState() {
        const tabContent = document.querySelector(`#${this.currentTab}-tab`);
        if (tabContent) {
            // Remover o estado de loading se existir
            const loadingElement = tabContent.querySelector('.reports-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }

    exportChart(chartId) {
        console.log('📤 Exportando gráfico:', chartId);
        this.showNotification('Funcionalidade de exportação será implementada em breve', 'info');
    }

    exportAllReports() {
        console.log('📤 Exportando todos os relatórios...');
        this.showNotification('Funcionalidade de exportação completa será implementada em breve', 'info');
    }

    generateReport() {
        console.log('📊 Gerando relatório...');
        this.showNotification('Relatório gerado com sucesso!', 'success');
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Inicializar Reports Manager
let reportsManager = null;
let comissoesManager = null;

function initReportsManager() {
    console.log('📊 Inicializando ReportsManager...');
    if (!reportsManager) {
        reportsManager = new ReportsManager();
    }
    console.log('✅ ReportsManager inicializado!');
}

function initComissoesManager() {
    console.log('💰 Inicializando ComissoesManager...');
    if (!comissoesManager) {
        console.log('💰 Criando nova instância do ComissoesManager...');
        comissoesManager = new ComissoesManager();
    } else {
        console.log('💰 ComissoesManager já existe, recarregando dados...');
        comissoesManager.loadComissoesData();
    }
    console.log('✅ ComissoesManager inicializado!');
}

// Inicializar quando a página de relatórios for ativada
document.addEventListener('click', (e) => {
    console.log('🔍 Clique detectado em:', e.target);
    console.log('🔍 Elemento com data-page:', e.target.closest('[data-page]'));
    console.log('🔍 Data-page encontrado:', e.target.closest('[data-page]')?.getAttribute('data-page'));
    
    if (e.target.closest('[data-page="relatorios"]')) {
        console.log('📊 Clique detectado em relatórios, inicializando...');
        setTimeout(() => {
            initReportsManager();
        }, 100);
    }
    if (e.target.closest('[data-page="comissoes"]')) {
        console.log('💰 Clique detectado em comissões, inicializando...');
        console.log('💰 Elemento clicado:', e.target);
        console.log('💰 Página atual:', e.target.closest('[data-page="comissoes"]'));
        setTimeout(() => {
            console.log('💰 Chamando initComissoesManager...');
            initComissoesManager();
        }, 100);
    }
    if (e.target.closest('[data-page="financeiro"]')) {
        console.log('💰 Clique detectado em financeiro, inicializando...');
        console.log('💰 Elemento clicado:', e.target);
        setTimeout(() => {
            console.log('💰 Chamando initReportsManager para financeiro...');
            initReportsManager();
        }, 100);
    }
});

// Expor funções globalmente
window.reportsManager = reportsManager;

// Função para apagar todos os agendamentos
window.clearAllAppointments = async function() {
    try {
        // Confirmar ação
        const confirmed = confirm(
            '⚠️ ATENÇÃO: Esta operação irá apagar TODOS os agendamentos!\n\n' +
            'Esta ação NÃO pode ser desfeita!\n\n' +
            'Tem certeza que deseja continuar?'
        );
        
        if (!confirmed) {
            return;
        }
        
        // Segunda confirmação
        const doubleConfirmed = confirm(
            '🚨 ÚLTIMA CONFIRMAÇÃO 🚨\n\n' +
            'Você está prestes a apagar TODOS os agendamentos do sistema.\n\n' +
            'Esta ação é IRREVERSÍVEL!\n\n' +
            'Digite "CONFIRMAR" para continuar:'
        );
        
        if (!doubleConfirmed) {
            return;
        }
        
        // Mostrar loading
        window.showLoading('Apagando todos os agendamentos...');
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/clear-appointments-simple', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        window.hideLoading();
        
        if (result.success) {
            const relatedMsg = result.relatedDeletedCount ? ` e ${result.relatedDeletedCount} dados relacionados` : '';
            showNotification(`✅ ${result.message} (${result.deletedCount} agendamentos${relatedMsg} apagados)`, 'success');
            
            // Recarregar dados se necessário
            if (window.agendaManager) {
                await window.agendaManager.loadAppointments();
            }
        } else {
            showNotification(`❌ Erro: ${result.message}`, 'error');
        }
        
    } catch (error) {
        window.hideLoading();
        console.error('Erro ao apagar agendamentos:', error);
        showNotification('❌ Erro ao apagar agendamentos', 'error');
    }
};

// Função para apagar todas as comissões
window.clearAllCommissions = async function() {
    try {
        // Confirmar ação
        const confirmed = confirm(
            '⚠️ ATENÇÃO: Esta operação irá apagar TODAS as comissões!\n\n' +
            'Esta ação NÃO pode ser desfeita!\n\n' +
            'Tem certeza que deseja continuar?'
        );
        
        if (!confirmed) {
            return;
        }
        
        // Segunda confirmação
        const doubleConfirmed = confirm(
            '🚨 ÚLTIMA CONFIRMAÇÃO 🚨\n\n' +
            'Você está prestes a apagar TODAS as comissões do sistema.\n\n' +
            'Esta ação é IRREVERSÍVEL!\n\n' +
            'Digite "CONFIRMAR" para continuar:'
        );
        
        if (!doubleConfirmed) {
            return;
        }
        
        // Mostrar loading
        window.showLoading('Apagando todas as comissões...');
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/clear-commissions', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        window.hideLoading();
        
        if (result.success) {
            showNotification(`✅ ${result.message} (${result.deletedCount} comissões apagadas)`, 'success');
            
            // Recarregar dados de comissões se estiver na página
            if (window.comissoesManager) {
                await window.comissoesManager.loadCommissions();
            }
        } else {
            showNotification(`❌ Erro: ${result.message}`, 'error');
        }
        
    } catch (error) {
        window.hideLoading();
        console.error('Erro ao apagar comissões:', error);
        showNotification('❌ Erro ao apagar comissões', 'error');
    }
};

// Mostrar seção administrativa apenas para admins
function checkAdminPermissions() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const isAdmin = userData.role === 'admin';
        
        const adminActions = document.getElementById('admin-actions');
        if (adminActions) {
            adminActions.style.display = isAdmin ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
    }
}

// Verificar permissões quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    checkAdminPermissions();
});
window.initReportsManager = initReportsManager;
window.comissoesManager = comissoesManager;
window.initComissoesManager = initComissoesManager;

// Função para forçar inicialização das comissões
window.forceInitComissoes = function() {
    console.log('💰 Forçando inicialização das comissões...');
    initComissoesManager();
};

// Inicializar automaticamente quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 DOM carregado, inicializando ComissoesManager...');
    // Aguardar um pouco para garantir que todos os elementos estejam prontos
    setTimeout(() => {
        initComissoesManager();
    }, 500);
});
