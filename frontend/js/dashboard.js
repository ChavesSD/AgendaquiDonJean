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

    // Inicializar gerenciamento de usuários
    initUserManagement();

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

        // Carregar lista de usuários
        loadUsers();
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
                loadUsers(); // Recarregar lista
                
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
                loadUsers(); // Recarregar lista
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

            const response = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}&limit=5&sort=-createdAt`, {
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

            const response = await fetch(`/api/services/stats?startDate=${startDate}&endDate=${endDate}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // A nova API retorna { service: {...}, count: number }
                const services = data.services || [];
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
                fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`, {
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

            const response = await fetch(`/api/professionals/stats?startDate=${startDate}&endDate=${endDate}&limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Resposta da API:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dados recebidos:', data);
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
                fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`, {
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

            const response = await fetch(`/api/appointments?startDate=${this.formatDateForInput(startDate)}&endDate=${this.formatDateForInput(endDate)}`, {
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
                    borderColor: '#975756',
                    backgroundColor: 'rgba(151, 87, 86, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#975756',
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

// ==================== FLOATING AI ICON ====================

class FloatingAIIcon {
    constructor() {
        this.icon = null;
        this.isVisible = true;
        this.init();
    }

    init() {
        console.log('🤖 Inicializando ícone flutuante AI...');
        this.createIcon();
        this.setupEventListeners();
        console.log('✅ Ícone flutuante AI inicializado!');
    }

    createIcon() {
        // Verificar se o ícone já existe
        if (document.querySelector('.floating-ai-icon')) {
            console.log('⚠️ Ícone flutuante já existe, removendo...');
            document.querySelector('.floating-ai-icon').remove();
        }

        // Criar elemento do ícone
        this.icon = document.createElement('div');
        this.icon.className = 'floating-ai-icon';
        this.icon.setAttribute('title', 'Assistente IA');
        
        // Criar imagem do ícone
        const img = document.createElement('img');
        img.src = '../assets/AI.png';
        img.alt = 'Assistente IA';
        img.onerror = () => {
            console.error('❌ Erro ao carregar imagem AI.png');
            // Fallback: usar ícone FontAwesome
            this.icon.innerHTML = '<i class="fas fa-robot" style="color: white; font-size: 24px;"></i>';
        };
        
        this.icon.appendChild(img);
        
        // Adicionar ao DOM
        document.body.appendChild(this.icon);
        
        console.log('✅ Ícone flutuante AI criado e adicionado ao DOM');
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
            this.icon.style.transform = 'scale(1.1) translateY(-5px)';
        });

        this.icon.addEventListener('mouseleave', () => {
            this.icon.style.transform = 'scale(1) translateY(0)';
        });

        // Efeito de clique
        this.icon.addEventListener('mousedown', () => {
            this.icon.style.transform = 'scale(0.95)';
        });

        this.icon.addEventListener('mouseup', () => {
            this.icon.style.transform = 'scale(1.1) translateY(-5px)';
        });

        console.log('✅ Event listeners do ícone flutuante configurados');
    }

    handleClick() {
        console.log('🤖 Clique no ícone AI detectado');
        
        // Adicionar efeito visual de clique
        this.icon.classList.add('clicked');
        
        // Remover classe após animação
        setTimeout(() => {
            this.icon.classList.remove('clicked');
        }, 600);

        // Mostrar notificação
        if (window.showNotification) {
            window.showNotification('Assistente IA ativado! Em breve você terá acesso a recursos de inteligência artificial.', 'success');
        } else {
            alert('Assistente IA ativado! Em breve você terá acesso a recursos de inteligência artificial.');
        }

        // Aqui você pode adicionar a lógica específica do assistente IA
        this.openAIAssistant();
    }

    openAIAssistant() {
        console.log('🤖 Abrindo assistente IA...');
        
        // Por enquanto, apenas uma notificação
        // Futuramente, aqui pode ser implementado um modal ou sidebar com o assistente
        console.log('🚀 Funcionalidade do assistente IA será implementada em breve');
        
        // Exemplo de funcionalidade futura:
        // - Abrir modal com chat
        // - Conectar com API de IA
        // - Mostrar sugestões inteligentes
        // - Análise de dados do dashboard
    }

    show() {
        if (this.icon) {
            this.icon.style.display = 'flex';
            this.isVisible = true;
            console.log('👁️ Ícone flutuante AI mostrado');
        }
    }

    hide() {
        if (this.icon) {
            this.icon.style.display = 'none';
            this.isVisible = false;
            console.log('🙈 Ícone flutuante AI ocultado');
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
            console.log('🗑️ Ícone flutuante AI removido');
        }
    }
}

// Inicializar ícone flutuante AI
let floatingAIIcon = null;

function initFloatingAIIcon() {
    console.log('🤖 Inicializando ícone flutuante AI...');
    if (!floatingAIIcon) {
        floatingAIIcon = new FloatingAIIcon();
    }
    console.log('✅ Ícone flutuante AI inicializado!');
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando ícone flutuante AI...');
    initFloatingAIIcon();
});

// Expor funções globalmente
window.floatingAIIcon = floatingAIIcon;
window.initFloatingAIIcon = initFloatingAIIcon;

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
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        document.getElementById('reports-start-date').value = this.formatDateForInput(firstDayOfMonth);
        document.getElementById('reports-end-date').value = this.formatDateForInput(lastDayOfMonth);

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
            await Promise.all([
                this.loadAgendaData(),
                this.loadEstoqueData(),
                this.loadFinanceiroData(),
                this.loadProfissionaisData(),
                this.loadServicosData()
            ]);
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
    }

    async loadAgendaData() {
        try {
            const token = localStorage.getItem('authToken');
            const startDate = this.formatDateForInput(this.currentFilters.startDate);
            const endDate = this.formatDateForInput(this.currentFilters.endDate);

            const response = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const appointments = data.appointments || [];
                this.renderAgendaStats(appointments);
                this.renderAgendaCharts(appointments);
            }
        } catch (error) {
            console.error('Erro ao carregar dados da agenda:', error);
        }
    }

    renderAgendaStats(appointments) {
        const total = appointments.length;
        const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
        const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
        const pending = appointments.filter(apt => apt.status === 'pending').length;

        document.getElementById('total-appointments').textContent = total;
        document.getElementById('confirmed-appointments').textContent = confirmed;
        document.getElementById('cancelled-appointments').textContent = cancelled;
        document.getElementById('pending-appointments').textContent = pending;
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
                    backgroundColor: '#975756',
                    borderColor: '#7a4443',
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
                    borderColor: '#975756',
                    backgroundColor: 'rgba(151, 87, 86, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#975756',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
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
                    backgroundColor: '#975756',
                    borderColor: '#7a4443',
                    borderWidth: 1,
                    borderRadius: 2
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
        console.log('📦 Carregando dados do estoque...');
        // Implementar carregamento de dados do estoque
    }

    async loadFinanceiroData() {
        console.log('💰 Carregando dados financeiros...');
        // Implementar carregamento de dados financeiros
    }

    async loadProfissionaisData() {
        console.log('👥 Carregando dados dos profissionais...');
        // Implementar carregamento de dados dos profissionais
    }

    async loadServicosData() {
        console.log('⚙️ Carregando dados dos serviços...');
        // Implementar carregamento de dados dos serviços
    }

    showLoadingState() {
        const tabContent = document.querySelector(`#${this.currentTab}-tab`);
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="reports-loading">
                    <i class="fas fa-spinner"></i>
                    <h3>Carregando dados...</h3>
                    <p>Por favor, aguarde enquanto os relatórios são gerados.</p>
                </div>
            `;
        }
    }

    hideLoadingState() {
        // O conteúdo será recarregado pelos métodos específicos
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

function initReportsManager() {
    console.log('📊 Inicializando ReportsManager...');
    if (!reportsManager) {
        reportsManager = new ReportsManager();
    }
    console.log('✅ ReportsManager inicializado!');
}

// Inicializar quando a página de relatórios for ativada
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-page="relatorios"]')) {
        console.log('📊 Clique detectado em relatórios, inicializando...');
        setTimeout(() => {
            initReportsManager();
        }, 100);
    }
});

// Expor funções globalmente
window.reportsManager = reportsManager;
window.initReportsManager = initReportsManager;
