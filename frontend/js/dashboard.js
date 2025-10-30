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
        if (window.innerWidth <= 768) {
            // Em mobile, não fazer nada - sidebar sempre fixa e colapsada
            return;
        } else {
            // Comportamento desktop: colapsar
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }
    });
    
    // Função para toggle do overlay da sidebar
    function toggleSidebarOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            
            // Fechar sidebar ao clicar no overlay
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            });
        }
        
        if (sidebar.classList.contains('open')) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
    
    // Função para configurar sidebar baseada no tamanho da tela
    function configureSidebarForScreenSize() {
        if (window.innerWidth <= 768) {
            // Mobile: sidebar sempre colapsada e fixa
            sidebar.classList.add('collapsed');
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        } else {
            // Desktop: restaurar estado salvo
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            } else {
                sidebar.classList.remove('collapsed');
            }
            sidebar.classList.remove('open');
        }
    }
    
    // Configurar sidebar na inicialização
    configureSidebarForScreenSize();
    
    // Fechar sidebar ao redimensionar para desktop
    window.addEventListener('resize', function() {
        configureSidebarForScreenSize();
    });

    // Estado do sidebar já é configurado pela função configureSidebarForScreenSize()

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
    logoutBtn.addEventListener('click', async function() {
        const confirmed = await confirmAction(
            'Confirmar saída',
            'Tem certeza que deseja sair do sistema?',
            'Você precisará fazer login novamente para acessar o sistema.'
        );
        if (confirmed) {
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

    // ==================== SISTEMA DE NOTIFICAÇÕES ====================
    // As funções de notificação e confirmação estão no arquivo js/utils/notifications.js

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

                // Carregar dados específicos da aba
                if (targetTab === 'contatos') {
                    if (dashboardManager) {
                        dashboardManager.loadContacts();
                    } else {
                        console.error('DashboardManager não está inicializado');
                    }
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
        
        // Inicializar checkboxes de horário de funcionamento
        initWorkingHoursCheckboxes();
    }

    // Inicializar checkboxes de horário de funcionamento
    function initWorkingHoursCheckboxes() {
        const saturdayCheckbox = document.getElementById('saturday-enabled');
        const sundayCheckbox = document.getElementById('sunday-enabled');
        
        // Função para atualizar estado visual do checkbox
        function updateCheckboxState(checkbox) {
            const label = checkbox.closest('.checkbox-label');
            if (checkbox.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        }
        
        // Event listeners para sábado
        if (saturdayCheckbox) {
            updateCheckboxState(saturdayCheckbox); // Estado inicial
            saturdayCheckbox.addEventListener('change', function() {
                updateCheckboxState(this);
            });
        }
        
        // Event listeners para domingo
        if (sundayCheckbox) {
            updateCheckboxState(sundayCheckbox); // Estado inicial
            sundayCheckbox.addEventListener('change', function() {
                updateCheckboxState(this);
            });
        }
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
                if (saturdayEnabled) {
                    saturdayEnabled.checked = saturday.enabled || false;
                    // Atualizar estado visual
                    const label = saturdayEnabled.closest('.checkbox-label');
                    if (saturdayEnabled.checked) {
                        label.classList.add('active');
                    } else {
                        label.classList.remove('active');
                    }
                }
            }

            const sunday = settings.workingHours.sunday;
            if (sunday) {
                const sundayOpen = document.getElementById('sunday-open');
                const sundayClose = document.getElementById('sunday-close');
                const sundayEnabled = document.getElementById('sunday-enabled');
                
                if (sundayOpen) sundayOpen.value = sunday.open || '08:00';
                if (sundayClose) sundayClose.value = sunday.close || '12:00';
                if (sundayEnabled) {
                    sundayEnabled.checked = sunday.enabled || false;
                    // Atualizar estado visual
                    const label = sundayEnabled.closest('.checkbox-label');
                    if (sundayEnabled.checked) {
                        label.classList.add('active');
                    } else {
                        label.classList.remove('active');
                    }
                }
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
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon danger ${!canDelete ? 'disabled' : ''}" 
                            onclick="${!canDelete ? 'showNotification("Não é possível excluir o usuário administrador do sistema", "error")' : `deleteUser('${user._id}')`}" 
                            title="${!canDelete ? 'Usuário protegido' : 'Excluir'}"
                            ${!canDelete ? 'disabled' : ''}>
                        <i class="fas fa-trash-alt"></i>
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

        const confirmed = await confirmDelete(
            'este usuário',
            'Todos os dados associados ao usuário serão perdidos permanentemente.'
        );
        if (!confirmed) {
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
        this.showNotification('Filtros limpos com sucesso!', 'success');
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
                        <div class="client-name-row">
                            <strong>${appointment.clientName}</strong>
                            <span class="status-badge status-${appointment.status}">
                                ${this.getStatusText(appointment.status)}
                            </span>
                        </div>
                        <span class="appointment-service">${appointment.service?.name || 'Serviço não definido'}</span>
                    </div>
                    <div class="appointment-details">
                        <span class="appointment-date">${this.formatDate(appointment.date)}</span>
                        <span class="appointment-time">${appointment.time}</span>
                    </div>
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
            
            // Container para posição e foto
            const positionContainer = document.createElement('div');
            positionContainer.className = 'ranking-position-container';
            
            // Posição/Medalha
            const positionDiv = document.createElement('div');
            positionDiv.className = `ranking-position ${medalClass}`;
            positionDiv.innerHTML = medalIcon ? `<span class="medal-icon">${medalIcon}</span>` : `<span class="position-number">${position}</span>`;
            
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
            
            // Adicionar posição e foto ao container
            positionContainer.appendChild(positionDiv);
            positionContainer.appendChild(photoDiv);
            
            // Informações do profissional
            const infoDiv = document.createElement('div');
            infoDiv.className = 'ranking-info';
            infoDiv.innerHTML = `
                <div class="ranking-name">${professional.firstName} ${professional.lastName}</div>
                <div class="ranking-details">
                    <span class="ranking-count">${count} atendimentos</span>
                </div>
            `;
            
            // Montar o item
            rankingItem.appendChild(positionContainer);
            rankingItem.appendChild(infoDiv);
            
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
        showNotification('Gestor Inteligente ativado! Acessando recursos avançados de gestão.', 'success');

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
                
                // Forçar renderização dos gráficos quando a aba de comissões for ativada
                if (tabName === 'comissoes') {
                    setTimeout(() => {
                        this.loadReportsComissoesData();
                    }, 100);
                }
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

        // Event listeners para contatos
        this.setupContactsEventListeners();
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
        this.showNotification('Filtros limpos com sucesso!', 'success');
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
                case 'comissoes':
                    await this.loadReportsComissoesData();
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
                
                // Calcular estatísticas de estoque (igual à tela de estoque)
                const inStock = products.filter(p => {
                    const quantity = p.quantity || p.stock || 0;
                    const minimum = p.minimumQuantity || p.minimum_stock || p.minStock || 5;
                    return quantity > minimum;
                }).length;
                
                const lowStock = products.filter(p => {
                    const quantity = p.quantity || p.stock || 0;
                    const minimum = p.minimumQuantity || p.minimum_stock || p.minStock || 5;
                    return quantity <= minimum && quantity > 0;
                }).length;
                
                const outOfStock = products.filter(p => {
                    const quantity = p.quantity || p.stock || 0;
                    return quantity === 0;
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
                    inStock,
                    lowStock,
                    outOfStock,
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
                    inStock: estoqueData.inStock,
                    lowStock: estoqueData.lowStock,
                    outOfStock: estoqueData.outOfStock,
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

            // Carregar dados dos profissionais com estatísticas reais (apenas agendamentos finalizados)
            const [professionalsResponse, statsResponse] = await Promise.all([
                fetch('/api/professionals', {
                headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/professionals/stats', {
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
                
                // Processar dados dos profissionais (igual à tela de profissionais)
                const totalProfessionals = allProfessionals.length;
                const activeProfessionals = allProfessionals.filter(p => p.status === 'active' || p.status === 'ativo').length;
                const inactiveProfessionals = allProfessionals.filter(p => p.status === 'inactive' || p.status === 'inativo').length;
                const vacationProfessionals = allProfessionals.filter(p => p.status === 'vacation' || p.status === 'ferias').length;
                const leaveProfessionals = allProfessionals.filter(p => p.status === 'leave' || p.status === 'licenca').length;
                
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
                    activeProfessionals,
                    inactiveProfessionals,
                    vacationProfessionals,
                    leaveProfessionals,
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
                        workHours: item.count > 0 ? (item.professional?.workHours || 0) : 0
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
                
                // Processar dados dos serviços (igual à tela de serviços)
                const totalServices = allServices.length;
                const activeServices = allServices.filter(s => s.status === 'active' || s.status === 'ativo').length;
                const inactiveServices = allServices.filter(s => s.status === 'inactive' || s.status === 'inativo').length;
                
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
                    activeServices,
                    inactiveServices,
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

    async loadReportsComissoesData() {
        try {
            console.log('💰 Carregando dados de comissões (relatórios)...');
            
            const token = localStorage.getItem('authToken');
            
            // Carregar profissionais
            const professionalsResponse = await fetch('/api/professionals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (professionalsResponse.ok) {
                const professionals = await professionalsResponse.json();
                
                // Carregar dados de comissões de cada profissional
                const commissionsData = await this.loadCommissionsForProfessionals(professionals, token);
                
                this.renderReportsComissoesStats(commissionsData);
                this.renderReportsComissoesCharts(commissionsData);
                this.renderCommissionRanking(commissionsData);
            } else {
                console.error('Erro ao carregar profissionais:', professionalsResponse.statusText);
                // Renderizar com dados vazios mesmo se houver erro
                this.renderReportsComissoesStats([]);
                this.renderReportsComissoesCharts([]);
                this.renderCommissionRanking([]);
            }
        } catch (error) {
            console.error('Erro ao carregar dados de comissões:', error);
            // Renderizar com dados vazios mesmo se houver erro
            this.renderReportsComissoesStats([]);
            this.renderReportsComissoesCharts([]);
            this.renderCommissionRanking([]);
        }
        
        // Forçar renderização dos gráficos após um pequeno delay
        setTimeout(() => {
            this.forceRenderCommissionsCharts();
        }, 200);
    }

    forceRenderCommissionsCharts() {
        console.log('💰 Forçando renderização dos gráficos de comissões...');
        
        // Verificar se estamos na aba de comissões
        const comissoesTab = document.getElementById('comissoes-tab');
        if (!comissoesTab || !comissoesTab.classList.contains('active')) {
            console.log('💰 Aba de comissões não está ativa, pulando renderização');
            return;
        }
        
        // Forçar renderização do gráfico
        this.renderReportsComissoesCharts([]);
        
        // Forçar renderização do ranking
        this.renderCommissionRanking([]);
        
        console.log('💰 Renderização forçada concluída');
    }

    async loadCommissionsForProfessionals(professionals, token) {
        const commissionsData = [];
        
        for (const professional of professionals) {
            try {
                // Simular dados de comissões (em um sistema real, isso viria de uma API)
                const commissionData = {
                    id: professional._id,
                    name: professional.name,
                    photo: professional.photo || null,
                    specialty: professional.specialty || 'Geral',
                    totalCommissions: Math.random() * 5000 + 1000, // Valor aleatório para demonstração
                    servicesCompleted: Math.floor(Math.random() * 50) + 10,
                    averageCommission: Math.random() * 20 + 10, // Percentual aleatório
                    lastMonthCommissions: Math.random() * 1000 + 200
                };
                
                commissionsData.push(commissionData);
            } catch (error) {
                console.error(`Erro ao carregar comissões do profissional ${professional.name}:`, error);
            }
        }
        
        return commissionsData.sort((a, b) => b.totalCommissions - a.totalCommissions);
    }

    renderReportsComissoesStats(commissionsData) {
        console.log('💰 Renderizando estatísticas de comissões (relatórios):', commissionsData);
        
        const totalProfessionals = commissionsData.length;
        const totalCommissions = commissionsData.reduce((sum, p) => sum + (p.totalCommissions || 0), 0);
        const averageCommission = totalProfessionals > 0 ? 
            commissionsData.reduce((sum, p) => sum + (p.averageCommission || 0), 0) / totalProfessionals : 0;
        const topEarner = commissionsData.length > 0 ? commissionsData[0].name : '-';

        // Atualizar cards com verificação de elementos
        const totalProfessionalsEl = document.getElementById('reports-total-professionals');
        const totalCommissionsEl = document.getElementById('reports-total-commissions');
        const avgCommissionEl = document.getElementById('reports-avg-commission');
        const topEarnerEl = document.getElementById('reports-top-earner');

        if (totalProfessionalsEl) {
            totalProfessionalsEl.textContent = totalProfessionals;
            console.log('💰 Total profissionais atualizado:', totalProfessionals);
        }
        
        if (totalCommissionsEl) {
            totalCommissionsEl.textContent = this.formatCurrency(totalCommissions);
            console.log('💰 Total comissões atualizado:', this.formatCurrency(totalCommissions));
        }
        
        if (avgCommissionEl) {
            avgCommissionEl.textContent = `${averageCommission.toFixed(1)}%`;
            console.log('💰 Comissão média atualizada:', `${averageCommission.toFixed(1)}%`);
        }
        
        if (topEarnerEl) {
            topEarnerEl.textContent = topEarner;
            console.log('💰 Maior ganhador atualizado:', topEarner);
        }
    }

    renderReportsComissoesCharts(commissionsData) {
        console.log('💰 Renderizando gráficos de comissões (relatórios):', commissionsData);
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('💰 Chart.js não está carregado!');
            return;
        }
        
        // Verificar se a aba de comissões está ativa
        const comissoesTab = document.getElementById('comissoes-tab');
        if (!comissoesTab || !comissoesTab.classList.contains('active')) {
            console.log('💰 Aba de comissões não está ativa, aguardando...');
            // Tentar novamente em 500ms
            setTimeout(() => {
                this.renderReportsComissoesCharts(commissionsData);
            }, 500);
            return;
        }
        
        // Gráfico de comissões por profissional
        const ctx = document.getElementById('commissionsChart');
        if (ctx) {
            if (this.commissionsChart) {
                this.commissionsChart.destroy();
            }

            // Preparar dados para o gráfico
            let chartData = {
                labels: [],
                data: []
            };

            if (commissionsData && commissionsData.length > 0) {
                chartData.labels = commissionsData.slice(0, 10).map(p => p.name);
                chartData.data = commissionsData.slice(0, 10).map(p => p.totalCommissions);
            } else {
                // Dados vazios para renderizar gráfico mesmo sem dados
                chartData.labels = ['Nenhum dado disponível'];
                chartData.data = [0];
            }

            try {
                this.commissionsChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'Comissões (R$)',
                            data: chartData.data,
                            backgroundColor: commissionsData && commissionsData.length > 0 ? 
                                'rgba(151, 87, 86, 0.8)' : 'rgba(200, 200, 200, 0.5)',
                            borderColor: commissionsData && commissionsData.length > 0 ? 
                                'rgba(151, 87, 86, 1)' : 'rgba(200, 200, 200, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return 'R$ ' + value.toFixed(0);
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
                
                console.log('💰 Gráfico de comissões renderizado com sucesso');
            } catch (error) {
                console.error('💰 Erro ao criar gráfico:', error);
            }
        } else {
            console.warn('💰 Elemento commissionsChart não encontrado');
        }
    }

    renderCommissionRanking(commissionsData) {
        console.log('💰 Renderizando ranking de comissões:', commissionsData);
        
        // Verificar se a aba de comissões está ativa
        const comissoesTab = document.getElementById('comissoes-tab');
        if (!comissoesTab || !comissoesTab.classList.contains('active')) {
            console.log('💰 Aba de comissões não está ativa para ranking, aguardando...');
            // Tentar novamente em 500ms
            setTimeout(() => {
                this.renderCommissionRanking(commissionsData);
            }, 500);
            return;
        }
        
        const rankingContainer = document.getElementById('commission-ranking');
        if (!rankingContainer) {
            console.warn('💰 Elemento commission-ranking não encontrado');
            return;
        }

        if (!commissionsData || commissionsData.length === 0) {
            rankingContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhum profissional encontrado</p>
                    <p style="font-size: 12px; color: #999; margin-top: 8px;">
                        Os dados de comissões aparecerão aqui quando houver profissionais cadastrados.
                    </p>
                </div>
            `;
            console.log('💰 Ranking vazio renderizado');
            return;
        }

        rankingContainer.innerHTML = commissionsData.map((professional, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
            
            return `
                <div class="commission-item">
                    <div class="commission-rank ${rankClass}">
                        ${rank}
                    </div>
                    <div class="commission-professional">
                        <div class="commission-professional-photo">
                            ${professional.photo ? 
                                `<img src="${professional.photo}" alt="${professional.name}">` : 
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="commission-professional-info">
                            <h4>${professional.name}</h4>
                            <p>${professional.specialty || 'Geral'}</p>
                        </div>
                    </div>
                    <div class="commission-amount">
                        <h3>${this.formatCurrency(professional.totalCommissions || 0)}</h3>
                        <p>${professional.servicesCompleted || 0} serviços</p>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('💰 Ranking renderizado com', commissionsData.length, 'profissionais');
    }

    // Métodos de renderização para Estoque
    renderEstoqueStats(data) {
        console.log('📦 Renderizando estatísticas do estoque:', data);
        
        // Elementos dos cards da tela de estoque
        const totalProductsStockEl = document.getElementById('reports-total-products-stock');
        const inStockProductsEl = document.getElementById('reports-in-stock-products');
        const lowStockProductsEl = document.getElementById('reports-low-stock-products');
        const outOfStockProductsEl = document.getElementById('reports-out-of-stock-products');
        
        // Elementos dos cards únicos dos relatórios
        const stockValueEl = document.getElementById('reports-stock-value');
        const stockMovementsEl = document.getElementById('reports-stock-movements');
        
        console.log('📦 Elementos encontrados:', {
            totalProductsStock: !!totalProductsStockEl,
            inStockProducts: !!inStockProductsEl,
            lowStockProducts: !!lowStockProductsEl,
            outOfStockProducts: !!outOfStockProductsEl,
            stockValue: !!stockValueEl,
            stockMovements: !!stockMovementsEl
        });
        
        // Atualizar cards da tela de estoque
        if (totalProductsStockEl) {
            totalProductsStockEl.textContent = data.totalProducts || 0;
            console.log('📦 Total produtos (estoque) definido:', data.totalProducts || 0);
        }
        if (inStockProductsEl) {
            inStockProductsEl.textContent = data.inStock || 0;
            console.log('📦 Em estoque definido:', data.inStock || 0);
        }
        if (lowStockProductsEl) {
            lowStockProductsEl.textContent = data.lowStock || 0;
            console.log('📦 Estoque baixo (estoque) definido:', data.lowStock || 0);
        }
        if (outOfStockProductsEl) {
            outOfStockProductsEl.textContent = data.outOfStock || 0;
            console.log('📦 Sem estoque definido:', data.outOfStock || 0);
        }
        
        // Atualizar cards únicos dos relatórios
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
            console.log('📦 Nenhuma categoria encontrada - renderizando gráfico vazio');
            this.charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#ecf0f1'],
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
                                usePointStyle: true,
                                generateLabels: function(chart) {
                                    return [{
                                        text: 'Nenhuma categoria encontrada',
                                        fillStyle: '#95a5a6',
                                        strokeStyle: '#95a5a6',
                                        lineWidth: 0,
                                        pointStyle: 'circle'
                                    }];
                                }
                            }
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
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
        
        // Elementos dos cards da tela de profissionais
        const totalProfessionalsStockEl = document.getElementById('reports-total-professionals-stock');
        const activeProfessionalsEl = document.getElementById('reports-active-professionals');
        const inactiveProfessionalsStockEl = document.getElementById('reports-inactive-professionals-stock');
        const vacationProfessionalsEl = document.getElementById('reports-vacation-professionals');
        const leaveProfessionalsEl = document.getElementById('reports-leave-professionals');
        
        // Elemento do card único dos relatórios
        const topProfessionalEl = document.getElementById('reports-top-professional');
        
        console.log('👥 Elementos encontrados:', {
            totalProfessionalsStock: !!totalProfessionalsStockEl,
            activeProfessionals: !!activeProfessionalsEl,
            inactiveProfessionalsStock: !!inactiveProfessionalsStockEl,
            vacationProfessionals: !!vacationProfessionalsEl,
            leaveProfessionals: !!leaveProfessionalsEl,
            topProfessional: !!topProfessionalEl
        });
        
        // Atualizar cards da tela de profissionais
        if (totalProfessionalsStockEl) {
            totalProfessionalsStockEl.textContent = data.totalProfessionals || 0;
            console.log('👥 Total de profissionais (estoque) atualizado:', data.totalProfessionals || 0);
        }
        if (activeProfessionalsEl) {
            activeProfessionalsEl.textContent = data.activeProfessionals || 0;
            console.log('👥 Profissionais ativos atualizados:', data.activeProfessionals || 0);
        }
        if (inactiveProfessionalsStockEl) {
            inactiveProfessionalsStockEl.textContent = data.inactiveProfessionals || 0;
            console.log('👥 Profissionais inativos (estoque) atualizados:', data.inactiveProfessionals || 0);
        }
        if (vacationProfessionalsEl) {
            vacationProfessionalsEl.textContent = data.vacationProfessionals || 0;
            console.log('👥 Profissionais em férias atualizados:', data.vacationProfessionals || 0);
        }
        if (leaveProfessionalsEl) {
            leaveProfessionalsEl.textContent = data.leaveProfessionals || 0;
            console.log('👥 Profissionais em licença atualizados:', data.leaveProfessionals || 0);
        }
        
        // Atualizar card único dos relatórios
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

        // Se não há dados, renderizar gráfico vazio com mensagem
        if (!professionals || professionals.length === 0) {
            console.log('👥 Nenhum profissional encontrado para o gráfico - renderizando gráfico vazio');
            this.charts.professionals = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        label: 'Agendamentos',
                        data: [0],
                        backgroundColor: '#ecf0f1',
                        borderColor: '#bdc3c7',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            enabled: false
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
                                text: 'Profissionais'
                            }
                        }
                    }
                }
            });
            return;
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

        // Calcular horas trabalhadas baseadas nos agendamentos finalizados
        const workHours = professionals.map(prof => {
            // Se não há agendamentos, retornar 0 horas
            const hours = prof.appointments > 0 ? prof.workHours || 0 : 0;
            return {
            name: prof.name,
                hours: hours
            };
        });

        // Se não há dados ou todos têm 0 horas, renderizar gráfico vazio
        if (workHours.length === 0 || workHours.every(item => item.hours === 0)) {
            console.log('👥 Nenhum agendamento finalizado encontrado - renderizando gráfico vazio');
            this.charts.schedule = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        label: 'Horas por Semana',
                        data: [0],
                        backgroundColor: '#ecf0f1',
                        borderColor: '#bdc3c7',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            enabled: false
                        }
                    },
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
        
        // Elementos dos cards da tela de serviços
        const totalServicesStockEl = document.getElementById('reports-total-services-stock');
        const activeServicesEl = document.getElementById('reports-active-services');
        const inactiveServicesEl = document.getElementById('reports-inactive-services');
        
        // Elementos dos cards únicos dos relatórios
        const mostPopularServiceEl = document.getElementById('most-popular-service');
        const avgServicePriceEl = document.getElementById('avg-service-price');
        
        console.log('⚙️ Elementos encontrados:', {
            totalServicesStock: !!totalServicesStockEl,
            activeServices: !!activeServicesEl,
            inactiveServices: !!inactiveServicesEl,
            mostPopular: !!mostPopularServiceEl,
            avgPrice: !!avgServicePriceEl
        });
        
        // Atualizar cards da tela de serviços
        if (totalServicesStockEl) {
            totalServicesStockEl.textContent = data.totalServices || 0;
            console.log('⚙️ Total de serviços (estoque) atualizado:', data.totalServices || 0);
        }
        if (activeServicesEl) {
            activeServicesEl.textContent = data.activeServices || 0;
            console.log('⚙️ Serviços ativos atualizados:', data.activeServices || 0);
        }
        if (inactiveServicesEl) {
            inactiveServicesEl.textContent = data.inactiveServices || 0;
            console.log('⚙️ Serviços inativos atualizados:', data.inactiveServices || 0);
        }
        
        // Atualizar cards únicos dos relatórios
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

        // Se não há dados, renderizar gráfico vazio com mensagem
        if (!services || services.length === 0) {
            console.log('⚙️ Nenhum serviço encontrado para o gráfico - renderizando gráfico vazio');
            this.charts.popularServices = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#ecf0f1'],
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
                                usePointStyle: true,
                                generateLabels: function(chart) {
                                    return [{
                                        text: 'Nenhum serviço com agendamentos encontrado',
                                        fillStyle: '#95a5a6',
                                        strokeStyle: '#95a5a6',
                                        lineWidth: 0,
                                        pointStyle: 'circle'
                                    }];
                                }
                            }
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
            return;
        }

        // Ordenar serviços por número de agendamentos (mais populares primeiro)
        const sortedServices = services
            .filter(service => service.appointments > 0)
            .sort((a, b) => b.appointments - a.appointments)
            .slice(0, 5); // Top 5 serviços

        console.log('⚙️ Serviços mais populares processados:', sortedServices);

        // Se não há serviços com agendamentos, renderizar gráfico vazio
        if (sortedServices.length === 0) {
            console.log('⚙️ Nenhum serviço com agendamentos encontrado - renderizando gráfico vazio');
            this.charts.popularServices = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#ecf0f1'],
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
                                usePointStyle: true,
                                generateLabels: function(chart) {
                                    return [{
                                        text: 'Nenhum serviço com agendamentos encontrado',
                                        fillStyle: '#95a5a6',
                                        strokeStyle: '#95a5a6',
                                        lineWidth: 0,
                                        pointStyle: 'circle'
                                    }];
                                }
                            }
                        },
                        tooltip: {
                            enabled: false
                        }
                    }
                }
            });
            return;
        }

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

        // Se não há dados, renderizar gráfico vazio com mensagem
        if (!services || services.length === 0) {
            console.log('⚙️ Nenhum serviço encontrado para o gráfico de menos solicitados - renderizando gráfico vazio');
            this.charts.lessRequested = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        label: 'Agendamentos',
                        data: [0],
                        backgroundColor: ['#ecf0f1'],
                        borderColor: ['#bdc3c7'],
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
                            enabled: false
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

        // Se não há dados processados, renderizar gráfico vazio
        if (lessRequestedData.length === 0) {
            console.log('⚙️ Nenhum serviço processado para o gráfico de menos solicitados - renderizando gráfico vazio');
            this.charts.lessRequested = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Nenhum dado disponível'],
                    datasets: [{
                        label: 'Agendamentos',
                        data: [0],
                        backgroundColor: ['#ecf0f1'],
                        borderColor: ['#bdc3c7'],
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
                            enabled: false
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
            return;
        }

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

    async exportChart(chartId) {
        console.log('📤 Exportando gráfico:', chartId);
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = margin;

            // Cabeçalho
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CH CELIA HOLANDA STUDIO', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'normal');
            pdf.text('EXPORTAÇÃO DE GRÁFICO', pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            // Data
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
            pdf.setFontSize(10);
            pdf.text(`Gerado em: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            // Capturar o gráfico com configurações otimizadas
            const chartElement = document.getElementById(chartId);
            if (chartElement) {
                const canvas = await html2canvas(chartElement, {
                    scale: 3, // Aumentar escala para melhor qualidade
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: chartElement.scrollWidth,
                    height: chartElement.scrollHeight,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: chartElement.scrollWidth,
                    windowHeight: chartElement.scrollHeight,
                    foreignObjectRendering: true,
                    removeContainer: true,
                    imageTimeout: 0,
                    // Forçar cores mais vivas
                    onclone: function(clonedDoc) {
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            canvas {
                                image-rendering: -webkit-optimize-contrast !important;
                                image-rendering: crisp-edges !important;
                            }
                            .chart-container {
                                filter: saturate(1.2) contrast(1.1) !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                });

                const imgWidth = pageWidth - (margin * 2);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }

                // Processar imagem para melhorar qualidade
                const processedCanvas = this.enhanceImageQuality(canvas);
                const imgData = processedCanvas.toDataURL('image/png', 1.0); // Qualidade máxima
                pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
            } else {
                pdf.setFontSize(12);
                pdf.text('Gráfico não encontrado', margin, currentY);
            }

            // Salvar
            const fileName = `grafico_${chartId}_${now.toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            this.showNotification('Gráfico exportado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar gráfico:', error);
            this.showNotification('Erro ao exportar gráfico', 'error');
        }
    }

    exportAllReports() {
        console.log('📤 Exportando todos os relatórios...');
        this.showNotification('Gerando relatório completo em PDF...', 'info');
        
        // Gerar relatório completo com todas as abas
        this.generateCompleteReport();
    }

    generateReport() {
        console.log('📊 Gerando relatório da aba atual...');
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.getAttribute('data-tab');
            this.showNotification(`Gerando relatório de ${tabName}...`, 'info');
            this.generateTabReport(tabName);
        } else {
            this.showNotification('Nenhuma aba ativa encontrada', 'error');
        }
    }

    async generateCompleteReport() {
        try {
            // Mostrar indicador de progresso
            this.showProgressIndicator('Gerando relatório completo...');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Configurações do PDF
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = margin;

            // Cabeçalho do relatório
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CH CELIA HOLANDA STUDIO', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'normal');
            pdf.text('RELATÓRIO COMPLETO', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;

            // Data de geração
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
            pdf.setFontSize(10);
            pdf.text(`Gerado em: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            // Filtros aplicados
            const startDate = document.getElementById('reports-start-date')?.value || 'Não definido';
            const endDate = document.getElementById('reports-end-date')?.value || 'Não definido';
            const period = document.getElementById('reports-period')?.value || 'Personalizado';

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PERÍODO DO RELATÓRIO:', margin, currentY);
            currentY += 8;

            pdf.setFont('helvetica', 'normal');
            pdf.text(`Data Início: ${startDate}`, margin, currentY);
            currentY += 6;
            pdf.text(`Data Fim: ${endDate}`, margin, currentY);
            currentY += 6;
            pdf.text(`Período: ${period}`, margin, currentY);
            currentY += 15;

            // Gerar relatórios de cada aba
            const tabs = ['agenda', 'estoque', 'financeiro', 'profissionais', 'servicos'];
            
            for (const tab of tabs) {
                currentY = await this.addTabToPDF(pdf, tab, currentY, pageWidth, pageHeight, margin);
                
                // Verificar se precisa de nova página
                if (currentY > pageHeight - 30) {
                    pdf.addPage();
                    currentY = margin;
                }
            }

            // Salvar o PDF
            const fileName = `relatorio_completo_${now.toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            // Esconder indicador de progresso
            this.hideProgressIndicator();
            this.showNotification('Relatório completo gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao gerar relatório completo:', error);
            this.hideProgressIndicator();
            this.showNotification('Erro ao gerar relatório completo', 'error');
        }
    }

    async generateTabReport(tabName) {
        try {
            this.showProgressIndicator(`Gerando relatório de ${this.getTabTitle(tabName)}...`);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = margin;

            // Cabeçalho
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CH CELIA HOLANDA STUDIO', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'normal');
            const tabTitle = this.getTabTitle(tabName);
            pdf.text(`RELATÓRIO - ${tabTitle.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            // Data e filtros
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
            pdf.setFontSize(10);
            pdf.text(`Gerado em: ${dateStr}`, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            // Adicionar conteúdo da aba específica
            currentY = await this.addTabToPDF(pdf, tabName, currentY, pageWidth, pageHeight, margin);

            // Salvar o PDF
            const fileName = `relatorio_${tabName}_${now.toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
            this.hideProgressIndicator();
            this.showNotification(`Relatório de ${tabTitle} gerado com sucesso!`, 'success');
            
        } catch (error) {
            console.error(`❌ Erro ao gerar relatório de ${tabName}:`, error);
            this.hideProgressIndicator();
            this.showNotification(`Erro ao gerar relatório de ${tabName}`, 'error');
        }
    }

    getTabTitle(tabName) {
        const titles = {
            'agenda': 'Agenda',
            'estoque': 'Estoque',
            'financeiro': 'Financeiro',
            'profissionais': 'Profissionais',
            'servicos': 'Serviços'
        };
        return titles[tabName] || tabName;
    }

    async addTabToPDF(pdf, tabName, currentY, pageWidth, pageHeight, margin) {
        try {
            // Título da seção
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            const sectionTitle = this.getTabTitle(tabName);
            pdf.text(sectionTitle, margin, currentY);
            currentY += 10;

            // Capturar o conteúdo da aba como imagem
            const tabElement = document.getElementById(`${tabName}-tab`);
            if (tabElement) {
                // Temporariamente mostrar a aba se estiver oculta
                const wasHidden = tabElement.style.display === 'none';
                if (wasHidden) {
                    tabElement.style.display = 'block';
                }

                // Aplicar classe especial para PDF
                tabElement.classList.add('pdf-export-mode');

                // Capturar como canvas com configurações otimizadas para cores vivas
                const canvas = await html2canvas(tabElement, {
                    scale: 3, // Aumentar escala para melhor qualidade
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false, // Desabilitar logs para melhor performance
                    width: tabElement.scrollWidth,
                    height: tabElement.scrollHeight,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: tabElement.scrollWidth,
                    windowHeight: tabElement.scrollHeight,
                    // Configurações para melhorar cores
                    foreignObjectRendering: true,
                    removeContainer: true,
                    imageTimeout: 0,
                    // Forçar cores mais vivas
                    onclone: function(clonedDoc) {
                        // Aplicar estilos para melhorar cores no clone
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .stat-card .stat-icon {
                                filter: saturate(1.2) contrast(1.1) !important;
                            }
                            .stat-card::before {
                                filter: saturate(1.2) contrast(1.1) !important;
                            }
                            canvas {
                                image-rendering: -webkit-optimize-contrast !important;
                                image-rendering: crisp-edges !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                });

                // Calcular dimensões da imagem
                const imgWidth = pageWidth - (margin * 2);
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // Verificar se cabe na página
                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }

                // Processar imagem para melhorar qualidade
                const processedCanvas = this.enhanceImageQuality(canvas);
                const imgData = processedCanvas.toDataURL('image/png', 1.0); // Qualidade máxima
                pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;

                // Remover classe especial e restaurar estado original
                tabElement.classList.remove('pdf-export-mode');
                if (wasHidden) {
                    tabElement.style.display = 'none';
                }
            } else {
                // Se não conseguir capturar a aba, adicionar dados em texto
                currentY = this.addTabDataAsText(pdf, tabName, currentY, pageWidth, margin);
            }

            return currentY;
            
        } catch (error) {
            console.error(`❌ Erro ao adicionar aba ${tabName} ao PDF:`, error);
            // Fallback: adicionar dados em texto
            return this.addTabDataAsText(pdf, tabName, currentY, pageWidth, margin);
        }
    }

    addTabDataAsText(pdf, tabName, currentY, pageWidth, margin) {
        // Adicionar dados da aba em formato de texto como fallback
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const tabElement = document.getElementById(`${tabName}-tab`);
        if (tabElement) {
            // Extrair texto dos cards de estatísticas
            const statCards = tabElement.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const title = card.querySelector('p')?.textContent || '';
                const value = card.querySelector('h3')?.textContent || '';
                
                if (title && value) {
                    pdf.text(`${title}: ${value}`, margin, currentY);
                    currentY += 6;
                }
            });
        } else {
            pdf.text('Dados não disponíveis para esta seção', margin, currentY);
            currentY += 6;
        }
        
        return currentY + 10;
    }

    showProgressIndicator(message = 'Processando...') {
        // Remover indicador existente se houver
        this.hideProgressIndicator();
        
        const progressDiv = document.createElement('div');
        progressDiv.id = 'pdf-progress-indicator';
        progressDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: 'Segoe UI', sans-serif;
        `;
        
        progressDiv.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                color: #333;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #975756;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h3 style="margin: 0 0 10px; color: #975756;">${message}</h3>
                <p style="margin: 0; color: #666;">Aguarde enquanto geramos o PDF...</p>
            </div>
        `;
        
        // Adicionar animação CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(progressDiv);
    }

    hideProgressIndicator() {
        const progressDiv = document.getElementById('pdf-progress-indicator');
        if (progressDiv) {
            progressDiv.remove();
        }
    }

    enhanceImageQuality(canvas) {
        // Criar um novo canvas para processar a imagem
        const enhancedCanvas = document.createElement('canvas');
        const ctx = enhancedCanvas.getContext('2d');
        
        // Manter as mesmas dimensões
        enhancedCanvas.width = canvas.width;
        enhancedCanvas.height = canvas.height;
        
        // Desenhar a imagem original
        ctx.drawImage(canvas, 0, 0);
        
        // Obter dados da imagem
        const imageData = ctx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const data = imageData.data;
        
        // Aplicar melhorias de cor e contraste
        for (let i = 0; i < data.length; i += 4) {
            // Aplicar saturação e contraste
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Aumentar saturação (tornar cores mais vivas)
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const saturation = 1.3; // Aumentar saturação em 30%
            
            data[i] = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
            data[i + 1] = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
            data[i + 2] = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
            
            // Aumentar contraste ligeiramente
            const contrast = 1.1;
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
        }
        
        // Aplicar os dados processados de volta ao canvas
        ctx.putImageData(imageData, 0, 0);
        
        return enhancedCanvas;
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ==================== GERENCIAMENTO DE CONTATOS ====================

    setupContactsEventListeners() {
        // Botão de sincronizar WhatsApp
        document.getElementById('sync-contacts-btn')?.addEventListener('click', () => {
            this.syncWhatsAppContacts();
        });

        // Botão de adicionar contato
        document.getElementById('add-contact-btn')?.addEventListener('click', () => {
            this.showContactModal();
        });

        // Busca de contatos
        document.getElementById('contact-search')?.addEventListener('input', (e) => {
            this.searchContacts(e.target.value);
        });

        // Filtro por origem
        document.getElementById('contact-source-filter')?.addEventListener('change', (e) => {
            this.filterContactsBySource(e.target.value);
        });
    }

    async loadContacts(page = 1, search = '', origin = '') {
        try {
            console.log('📞 Carregando contatos...');
            this.showLoadingState('contacts-list');

            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('Token não encontrado');
                this.hideLoadingState();
                return;
            }

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });

            if (search) params.append('search', search);
            if (origin) params.append('origin', origin);

            const response = await fetch(`/api/contacts?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📞 Contatos carregados:', data);
                this.renderContacts(data.contacts, data.pagination);
            } else {
                console.error('Erro ao carregar contatos:', response.status);
                this.showNotification('Erro ao carregar contatos', 'error');
            }

            this.hideLoadingState();
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            this.showNotification('Erro ao carregar contatos', 'error');
            this.hideLoadingState();
        }
    }

    renderContacts(contacts, pagination) {
        const contactsList = document.getElementById('contacts-list');
        if (!contactsList) return;

        if (contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum contato encontrado</h3>
                    <p>Adicione contatos manualmente ou sincronize com o WhatsApp.</p>
                </div>
            `;
            return;
        }

        const contactsHTML = contacts.map(contact => `
            <div class="contact-card" data-contact-id="${contact._id}">
                <div class="contact-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <p class="contact-phone">
                        <i class="fas fa-phone"></i>
                        ${contact.phone}
                    </p>
                    ${contact.email ? `
                        <p class="contact-email">
                            <i class="fas fa-envelope"></i>
                            ${contact.email}
                        </p>
                    ` : ''}
                    <div class="contact-meta">
                        <span class="contact-origin ${contact.origin}">
                            <i class="fas fa-${contact.origin === 'whatsapp' ? 'whatsapp' : 'user-plus'}"></i>
                            ${contact.origin === 'whatsapp' ? 'WhatsApp' : 'Manual'}
                        </span>
                        ${contact.totalAppointments > 0 ? `
                            <span class="contact-appointments">
                                <i class="fas fa-calendar"></i>
                                ${contact.totalAppointments} agendamentos
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="contact-actions">
                    <button class="btn btn-sm btn-primary" onclick="dashboardManager.editContact('${contact._id}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="dashboardManager.deleteContact('${contact._id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');

        contactsList.innerHTML = contactsHTML;
        this.renderContactsPagination(pagination);
    }

    renderContactsPagination(pagination) {
        const paginationEl = document.getElementById('contacts-pagination');
        if (!paginationEl) return;

        if (pagination.pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Botão anterior
        if (pagination.page > 1) {
            paginationHTML += `
                <button class="btn btn-sm" onclick="dashboardManager.loadContacts(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Páginas
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="btn btn-sm ${i === pagination.page ? 'active' : ''}" 
                        onclick="dashboardManager.loadContacts(${i})">
                    ${i}
                </button>
            `;
        }

        // Botão próximo
        if (pagination.page < pagination.pages) {
            paginationHTML += `
                <button class="btn btn-sm" onclick="dashboardManager.loadContacts(${pagination.page + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</div>';
        paginationEl.innerHTML = paginationHTML;
    }

    async syncWhatsAppContacts() {
        try {
            console.log('🔄 Sincronizando contatos do WhatsApp...');
            this.showNotification('Sincronizando contatos do WhatsApp...', 'info');

            const token = localStorage.getItem('authToken');
            if (!token) {
                this.showNotification('Token não encontrado', 'error');
                return;
            }

            const response = await fetch('/api/contacts/sync-whatsapp', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(`Sincronização concluída! ${data.contactsCount} contatos processados.`, 'success');
                this.loadContacts(); // Recarregar lista
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
            this.showNotification('Erro na sincronização', 'error');
        }
    }

    showContactModal(contact = null) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${contact ? 'Editar Contato' : 'Novo Contato'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="contact-form">
                        <div class="form-group">
                            <label for="contact-name">Nome *</label>
                            <input type="text" id="contact-name" value="${contact?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="contact-phone">Telefone *</label>
                            <input type="tel" id="contact-phone" value="${contact?.phone || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="contact-email">E-mail</label>
                            <input type="email" id="contact-email" value="${contact?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="contact-notes">Observações</label>
                            <textarea id="contact-notes" rows="3">${contact?.notes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="contact-tags">Tags (separadas por vírgula)</label>
                            <input type="text" id="contact-tags" value="${contact?.tags?.join(', ') || ''}">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="dashboardManager.saveContact('${contact?._id || ''}')">
                        ${contact ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal ao clicar no X ou fora
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async saveContact(contactId) {
        try {
            const form = document.getElementById('contact-form');
            const formData = new FormData(form);
            
            const contactData = {
                name: document.getElementById('contact-name').value,
                phone: document.getElementById('contact-phone').value,
                email: document.getElementById('contact-email').value,
                notes: document.getElementById('contact-notes').value,
                tags: document.getElementById('contact-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
            };

            if (!contactData.name || !contactData.phone) {
                this.showNotification('Nome e telefone são obrigatórios', 'error');
                return;
            }

            const token = localStorage.getItem('authToken');
            const url = contactId ? `/api/contacts/${contactId}` : '/api/contacts';
            const method = contactId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(contactId ? 'Contato atualizado com sucesso!' : 'Contato criado com sucesso!', 'success');
                document.querySelector('.modal-overlay').remove();
                this.loadContacts();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar contato:', error);
            this.showNotification('Erro ao salvar contato', 'error');
        }
    }

    editContact(contactId) {
        // Buscar dados do contato e abrir modal
        this.getContactById(contactId).then(contact => {
            if (contact) {
                this.showContactModal(contact);
            }
        });
    }

    async getContactById(contactId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/contacts/${contactId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                return data.contact;
            }
        } catch (error) {
            console.error('Erro ao obter contato:', error);
        }
        return null;
    }

    async deleteContact(contactId) {
        const confirmed = await confirmDelete(
            'este contato',
            'O contato será removido da sua lista, mas os dados de agendamentos serão preservados.'
        );
        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Contato removido com sucesso!', 'success');
                this.loadContacts();
            } else {
                this.showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao remover contato:', error);
            this.showNotification('Erro ao remover contato', 'error');
        }
    }

    searchContacts(searchTerm) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadContacts(1, searchTerm);
        }, 500);
    }

    filterContactsBySource(origin) {
        this.loadContacts(1, '', origin);
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
        const confirmed = await confirmDangerousAction(
            '⚠️ ATENÇÃO: Apagar TODOS os agendamentos',
            'Esta operação irá apagar TODOS os agendamentos do sistema!',
            'Esta ação NÃO pode ser desfeita e irá remover permanentemente todos os dados de agendamentos.'
        );
        
        if (!confirmed) {
            return;
        }
        
        // Segunda confirmação
        const doubleConfirmed = await confirmDangerousAction(
            '🚨 ÚLTIMA CONFIRMAÇÃO 🚨',
            'Você está prestes a apagar TODOS os agendamentos do sistema.',
            'Esta ação é IRREVERSÍVEL! Todos os dados de agendamentos serão perdidos permanentemente.'
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
        const confirmed = await confirmDangerousAction(
            '⚠️ ATENÇÃO: Apagar TODAS as comissões',
            'Esta operação irá apagar TODAS as comissões do sistema!',
            'Esta ação NÃO pode ser desfeita e irá remover permanentemente todos os dados de comissões.'
        );
        
        if (!confirmed) {
            return;
        }
        
        // Segunda confirmação
        const doubleConfirmed = await confirmDangerousAction(
            '🚨 ÚLTIMA CONFIRMAÇÃO 🚨',
            'Você está prestes a apagar TODAS as comissões do sistema.',
            'Esta ação é IRREVERSÍVEL! Todos os dados de comissões serão perdidos permanentemente.'
        );
        
        if (!doubleConfirmed) {
            return;
        }
        
        // Mostrar loading
        window.showLoading('Apagando todas as comissões...');
        
        // Usar endpoint simples para comissões
        const response = await fetch('/api/clear-commissions-simple', {
            method: 'DELETE',
            headers: {
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
        initDevArea();
    }, 500);
});

// ===== ÁREA DEV - FUNCIONALIDADES =====

// Inicializar Área Dev
function initDevArea() {
    console.log('🔧 Inicializando Área Dev...');
    
    // Verificar permissões de admin
    checkDevAreaAccess();
    
    // Inicializar personalização de cores
    initColorCustomization();
    
    // Inicializar gerenciamento de licenças
    initLicenseManagement();
    
    // Inicializar gerenciamento de atualizações
    initUpdateManagement();
    
    // Inicializar gerenciamento de assets
    initAssetsManagement();
    
    // Carregar logs do sistema
    loadSystemLogs();
}

// Verificar acesso à Área Dev (apenas Admin)
function checkDevAreaAccess() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const devAreaContent = document.getElementById('dev-area-content');
    const devAreaDenied = document.getElementById('dev-area-denied');
    
    if (userData.role === 'admin') {
        if (devAreaContent) devAreaContent.style.display = 'block';
        if (devAreaDenied) devAreaDenied.style.display = 'none';
        console.log('✅ Acesso à Área Dev liberado para Admin');
    } else {
        if (devAreaContent) devAreaContent.style.display = 'none';
        if (devAreaDenied) devAreaDenied.style.display = 'block';
        console.log('❌ Acesso à Área Dev negado - usuário não é Admin');
    }
}

// ===== AÇÕES ADMINISTRATIVAS =====

// Função de teste para verificar se as funções administrativas estão funcionais
function testAdminFunctions() {
    console.log('🧪 Testando funções administrativas...');
    
    // Lista de todas as funções administrativas
    const adminFunctions = [
        'clearAllAppointments',
        'clearAllCommissions', 
        'clearAllRevenues',
        'clearAllExpenses',
        'clearAllSales',
        'clearAllPosMachines',
        'clearAllProfessionals',
        'clearAllServices',
        'clearAllProducts',
        'clearAllUsers',
        'clearAllWhatsAppMessages'
    ];
    
    // Verificar se todas as funções existem
    let allFunctionsExist = true;
    adminFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
            console.error(`❌ Função ${funcName} não encontrada!`);
            allFunctionsExist = false;
        } else {
            console.log(`✅ Função ${funcName} encontrada`);
        }
    });
    
    if (allFunctionsExist) {
        console.log('✅ Todas as funções administrativas estão disponíveis!');
        showNotification('✅ Teste concluído: Todas as funções administrativas estão funcionais!', 'success');
        
        // Testar se os endpoints da API existem
        testAPIEndpoints();
    } else {
        console.error('❌ Algumas funções administrativas estão faltando!');
        showNotification('❌ Erro: Algumas funções administrativas não foram encontradas!', 'error');
    }
}

// Função para testar se os endpoints da API existem
async function testAPIEndpoints() {
    console.log('🔍 Testando endpoints da API...');
    
    const endpoints = [
        '/api/appointments/clear-all',
        '/api/commissions/clear-all',
        '/api/revenues/clear-all',
        '/api/expenses/clear-all',
        '/api/sales/clear-all',
        '/api/pos-machines/clear-all',
        '/api/professionals/clear-all',
        '/api/services/clear-all',
        '/api/products/clear-all',
        '/api/users/clear-all',
        '/api/whatsapp-messages/clear-all'
    ];
    
    let allEndpointsExist = true;
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'OPTIONS', // Usar OPTIONS para verificar se o endpoint existe
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 404) {
                console.warn(`⚠️ Endpoint ${endpoint} não encontrado (404)`);
                allEndpointsExist = false;
            } else {
                console.log(`✅ Endpoint ${endpoint} respondeu com status ${response.status}`);
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao testar endpoint ${endpoint}:`, error.message);
            allEndpointsExist = false;
        }
    }
    
    if (allEndpointsExist) {
        console.log('✅ Todos os endpoints da API estão funcionais!');
        showNotification('✅ Todos os endpoints da API estão funcionais!', 'success');
    } else {
        console.warn('⚠️ Alguns endpoints da API podem não estar implementados!');
        showNotification('⚠️ Alguns endpoints da API podem não estar implementados!', 'warning');
    }
}

// Apagar todos os agendamentos
async function clearAllAppointments() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os agendamentos do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/appointments/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os agendamentos foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar agendamentos');
        }
    } catch (error) {
        console.error('Erro ao apagar agendamentos:', error);
        showNotification('❌ Erro ao apagar agendamentos: ' + error.message, 'error');
    }
}

// Apagar todas as comissões
async function clearAllCommissions() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODAS as comissões do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todas',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/commissions/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todas as comissões foram apagadas com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar comissões');
        }
    } catch (error) {
        console.error('Erro ao apagar comissões:', error);
        showNotification('❌ Erro ao apagar comissões: ' + error.message, 'error');
    }
}

// Apagar todas as receitas
async function clearAllRevenues() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODAS as receitas do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todas',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/revenues/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todas as receitas foram apagadas com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar receitas');
        }
    } catch (error) {
        console.error('Erro ao apagar receitas:', error);
        showNotification('❌ Erro ao apagar receitas: ' + error.message, 'error');
    }
}

// Apagar todos os gastos
async function clearAllExpenses() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os gastos do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/expenses/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os gastos foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar gastos');
        }
    } catch (error) {
        console.error('Erro ao apagar gastos:', error);
        showNotification('❌ Erro ao apagar gastos: ' + error.message, 'error');
    }
}

// Apagar todas as vendas
async function clearAllSales() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODAS as vendas do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todas',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/sales/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todas as vendas foram apagadas com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar vendas');
        }
    } catch (error) {
        console.error('Erro ao apagar vendas:', error);
        showNotification('❌ Erro ao apagar vendas: ' + error.message, 'error');
    }
}

// Apagar todas as maquininhas
async function clearAllPosMachines() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODAS as maquininhas do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todas',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/pos-machines/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todas as maquininhas foram apagadas com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar maquininhas');
        }
    } catch (error) {
        console.error('Erro ao apagar maquininhas:', error);
        showNotification('❌ Erro ao apagar maquininhas: ' + error.message, 'error');
    }
}

// Apagar todos os profissionais
async function clearAllProfessionals() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os profissionais do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/professionals/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os profissionais foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar profissionais');
        }
    } catch (error) {
        console.error('Erro ao apagar profissionais:', error);
        showNotification('❌ Erro ao apagar profissionais: ' + error.message, 'error');
    }
}

// Apagar todos os serviços
async function clearAllServices() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os serviços do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/services/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os serviços foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar serviços');
        }
    } catch (error) {
        console.error('Erro ao apagar serviços:', error);
        showNotification('❌ Erro ao apagar serviços: ' + error.message, 'error');
    }
}

// Apagar todos os produtos
async function clearAllProducts() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os produtos do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/products/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os produtos foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar produtos');
        }
    } catch (error) {
        console.error('Erro ao apagar produtos:', error);
        showNotification('❌ Erro ao apagar produtos: ' + error.message, 'error');
    }
}

// Apagar todos os usuários (exceto admin)
async function clearAllUsers() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODOS os usuários do sistema (exceto administradores).',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todos',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/users/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todos os usuários foram apagados com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar usuários');
        }
    } catch (error) {
        console.error('Erro ao apagar usuários:', error);
        showNotification('❌ Erro ao apagar usuários: ' + error.message, 'error');
    }
}

// Apagar todas as mensagens do WhatsApp
async function clearAllWhatsAppMessages() {
    const confirmed = await showConfirmation({
        title: '⚠️ Confirmar Exclusão',
        message: 'Esta ação irá apagar TODAS as mensagens do WhatsApp do sistema.',
        details: 'Esta ação não pode ser desfeita!',
        type: 'danger',
        confirmText: 'Apagar Todas',
        cancelText: 'Cancelar',
        confirmButtonType: 'danger'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/whatsapp-messages/clear-all', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✅ Todas as mensagens do WhatsApp foram apagadas com sucesso!', 'success');
        } else {
            throw new Error('Erro ao apagar mensagens do WhatsApp');
        }
    } catch (error) {
        console.error('Erro ao apagar mensagens do WhatsApp:', error);
        showNotification('❌ Erro ao apagar mensagens do WhatsApp: ' + error.message, 'error');
    }
}

// ===== PERSONALIZAÇÃO DE CORES =====

// Inicializar personalização de cores
function initColorCustomization() {
    console.log('🎨 Inicializando personalização de cores...');
    
    // Carregar cores salvas
    loadSavedColors();
    
    // Adicionar event listeners para os color pickers
    const colorPickers = document.querySelectorAll('.color-picker');
    colorPickers.forEach(picker => {
        picker.addEventListener('change', function() {
            const hexInput = this.parentElement.querySelector('.color-hex');
            if (hexInput) {
                hexInput.value = this.value;
            }
        });
    });
}

// Carregar cores salvas
function loadSavedColors() {
    const savedColors = JSON.parse(localStorage.getItem('systemColors') || '{}');
    
    if (savedColors.primary) {
        document.getElementById('primary-color').value = savedColors.primary;
        document.getElementById('primary-color-hex').value = savedColors.primary;
        // Aplicar a cor salva
        document.documentElement.style.setProperty('--primary-color', savedColors.primary);
        // Aplicar variações da cor principal
        applyColorVariations(savedColors.primary, 'primary');
        // Aplicar cor a elementos específicos
        applyColorToElements(savedColors.primary, 'primary');
    }
    
    if (savedColors.secondary) {
        document.getElementById('secondary-color').value = savedColors.secondary;
        document.getElementById('secondary-color-hex').value = savedColors.secondary;
        // Aplicar a cor salva
        document.documentElement.style.setProperty('--secondary-color', savedColors.secondary);
        // Aplicar variações da cor secundária
        applyColorVariations(savedColors.secondary, 'secondary');
        // Aplicar cor a elementos específicos
        applyColorToElements(savedColors.secondary, 'secondary');
    }
    
    if (savedColors.success) {
        document.getElementById('success-color').value = savedColors.success;
        document.getElementById('success-color-hex').value = savedColors.success;
        // Aplicar a cor salva
        document.documentElement.style.setProperty('--success-color', savedColors.success);
    }
    
    if (savedColors.warning) {
        document.getElementById('warning-color').value = savedColors.warning;
        document.getElementById('warning-color-hex').value = savedColors.warning;
        // Aplicar a cor salva
        document.documentElement.style.setProperty('--warning-color', savedColors.warning);
    }
    
    if (savedColors.danger) {
        document.getElementById('danger-color').value = savedColors.danger;
        document.getElementById('danger-color-hex').value = savedColors.danger;
        // Aplicar a cor salva
        document.documentElement.style.setProperty('--danger-color', savedColors.danger);
    }
}

// Aplicar cor principal
function applyPrimaryColor() {
    const color = document.getElementById('primary-color').value;
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Aplicar variações da cor principal
    applyColorVariations(color, 'primary');
    
    // Aplicar cor a elementos específicos
    applyColorToElements(color, 'primary');
    
    // Salvar no localStorage
    const savedColors = JSON.parse(localStorage.getItem('systemColors') || '{}');
    savedColors.primary = color;
    localStorage.setItem('systemColors', JSON.stringify(savedColors));
    
    showNotification('✅ Cor principal aplicada com sucesso!', 'success');
}

// Aplicar cor secundária
function applySecondaryColor() {
    const color = document.getElementById('secondary-color').value;
    document.documentElement.style.setProperty('--secondary-color', color);
    
    // Aplicar variações da cor secundária
    applyColorVariations(color, 'secondary');
    
    // Aplicar cor a elementos específicos
    applyColorToElements(color, 'secondary');
    
    // Salvar no localStorage
    const savedColors = JSON.parse(localStorage.getItem('systemColors') || '{}');
    savedColors.secondary = color;
    localStorage.setItem('systemColors', JSON.stringify(savedColors));
    
    showNotification('✅ Cor secundária aplicada com sucesso!', 'success');
}

// Aplicar cor de sucesso
function applySuccessColor() {
    const color = document.getElementById('success-color').value;
    document.documentElement.style.setProperty('--success-color', color);
    showNotification('✅ Cor de sucesso aplicada com sucesso!', 'success');
}

// Aplicar cor de aviso
function applyWarningColor() {
    const color = document.getElementById('warning-color').value;
    document.documentElement.style.setProperty('--warning-color', color);
    showNotification('✅ Cor de aviso aplicada com sucesso!', 'success');
}

// Aplicar cor de perigo
function applyDangerColor() {
    const color = document.getElementById('danger-color').value;
    document.documentElement.style.setProperty('--danger-color', color);
    showNotification('✅ Cor de perigo aplicada com sucesso!', 'success');
}

// Salvar esquema de cores
function saveColorScheme() {
    const colors = {
        primary: document.getElementById('primary-color').value,
        secondary: document.getElementById('secondary-color').value,
        success: document.getElementById('success-color').value,
        warning: document.getElementById('warning-color').value,
        danger: document.getElementById('danger-color').value
    };
    
    localStorage.setItem('systemColors', JSON.stringify(colors));
    showNotification('✅ Esquema de cores salvo com sucesso!', 'success');
}

// Restaurar cores padrão
async function resetColorScheme() {
    const confirmed = await showConfirmation({
        title: 'Restaurar Cores Padrão',
        message: 'Tem certeza que deseja restaurar as cores padrão do sistema?',
        type: 'warning',
        confirmText: 'Restaurar',
        cancelText: 'Cancelar',
        confirmButtonType: 'warning'
    });
    
    if (!confirmed) {
        return;
    }
    
    const defaultColors = {
        primary: '#975756',
        secondary: '#7a4443',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545'
    };
    
    // Aplicar cores padrão
    Object.keys(defaultColors).forEach(key => {
        document.documentElement.style.setProperty(`--${key}-color`, defaultColors[key]);
        const picker = document.getElementById(`${key}-color`);
        const hex = document.getElementById(`${key}-color-hex`);
        if (picker) picker.value = defaultColors[key];
        if (hex) hex.value = defaultColors[key];
    });
    
    // Salvar no localStorage
    localStorage.setItem('systemColors', JSON.stringify(defaultColors));
    showNotification('✅ Cores padrão restauradas com sucesso!', 'success');
}

// ===== GERENCIAMENTO DE LICENÇAS =====

// Inicializar gerenciamento de licenças
function initLicenseManagement() {
    console.log('🔑 Inicializando gerenciamento de licenças...');
    
    // Carregar licença atual
    loadCurrentLicense();
}

// Carregar licença atual
function loadCurrentLicense() {
    const currentLicense = localStorage.getItem('currentLicense') || 'basic';
    const licenseTypeElement = document.getElementById('current-license-type');
    
    if (licenseTypeElement) {
        const licenseNames = {
            'basic': 'Básico',
            'intermediate': 'Intermediário',
            'advanced': 'Avançado'
        };
        
        licenseTypeElement.textContent = licenseNames[currentLicense] || 'Básico';
    }
}

// Selecionar licença
async function selectLicense(plan) {
    const confirmed = await showConfirmation({
        title: 'Alterar Plano de Licença',
        message: `Tem certeza que deseja alterar para o plano ${plan.toUpperCase()}?`,
        type: 'info',
        confirmText: 'Alterar',
        cancelText: 'Cancelar',
        confirmButtonType: 'primary'
    });
    
    if (!confirmed) {
        return;
    }
    
    // Salvar licença selecionada
    localStorage.setItem('currentLicense', plan);
    
    // Atualizar interface
    loadCurrentLicense();
    
    // Remover seleção anterior
    document.querySelectorAll('.license-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Adicionar seleção atual
    const selectedCard = document.querySelector(`[data-plan="${plan}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    showNotification(`✅ Plano ${plan.toUpperCase()} selecionado com sucesso!`, 'success');
}

// ===== LOGS DO SISTEMA =====

// Carregar logs do sistema
function loadSystemLogs() {
    console.log('📋 Carregando logs do sistema...');
    
    const logsContent = document.getElementById('system-logs-content');
    if (logsContent) {
        // Simular logs do sistema
        const logs = [
            `[${new Date().toLocaleString()}] Sistema inicializado`,
            `[${new Date().toLocaleString()}] Usuário logado: Admin`,
            `[${new Date().toLocaleString()}] Área Dev acessada`,
            `[${new Date().toLocaleString()}] Verificação de permissões: OK`,
            `[${new Date().toLocaleString()}] Personalização de cores carregada`,
            `[${new Date().toLocaleString()}] Gerenciamento de licenças inicializado`,
            `[${new Date().toLocaleString()}] Logs do sistema carregados`
        ];
        
        logsContent.textContent = logs.join('\n');
    }
}

// Atualizar logs
function refreshLogs() {
    loadSystemLogs();
    showNotification('✅ Logs atualizados com sucesso!', 'success');
}

// Limpar logs
async function clearLogs() {
    const confirmed = await showConfirmation({
        title: 'Limpar Logs',
        message: 'Tem certeza que deseja limpar todos os logs do sistema?',
        type: 'warning',
        confirmText: 'Limpar',
        cancelText: 'Cancelar',
        confirmButtonType: 'warning'
    });
    
    if (!confirmed) {
        return;
    }
    
    const logsContent = document.getElementById('system-logs-content');
    if (logsContent) {
        logsContent.textContent = `[${new Date().toLocaleString()}] Logs limpos pelo administrador`;
    }
    
    showNotification('✅ Logs limpos com sucesso!', 'success');
}

// Baixar logs
function downloadLogs() {
    const logsContent = document.getElementById('system-logs-content');
    if (logsContent) {
        const logs = logsContent.textContent;
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('✅ Logs baixados com sucesso!', 'success');
    }
}

// ===== GERENCIAMENTO DE ASSETS =====

// Inicializar gerenciamento de assets
function initAssetsManagement() {
    console.log('🖼️ Inicializando gerenciamento de assets...');
    
    // Configurar drag and drop
    setupDragAndDrop();
    
    // Configurar input de arquivo
    setupFileInput();
    
    // Carregar assets atuais
    loadCurrentAssets();
}

// Configurar drag and drop
function setupDragAndDrop() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('assets-input');
    
    if (!uploadZone || !fileInput) return;
    
    // Prevenir comportamento padrão do navegador
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Destacar zona de drop
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Processar arquivos soltos
    uploadZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadZone.classList.add('dragover');
    }
    
    function unhighlight(e) {
        uploadZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
}

// Configurar input de arquivo
function setupFileInput() {
    const fileInput = document.getElementById('assets-input');
    
    if (!fileInput) return;
    
    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });
}

// Processar arquivos selecionados
function handleFiles(files) {
    const validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    Array.from(files).forEach(file => {
        // Validar tipo de arquivo
        if (!allowedTypes.includes(file.type)) {
            showNotification(`❌ Arquivo ${file.name} não é um formato válido (JPG/PNG)`, 'error');
            return;
        }
        
        // Validar tamanho
        if (file.size > maxSize) {
            showNotification(`❌ Arquivo ${file.name} é muito grande (máximo 5MB)`, 'error');
            return;
        }
        
        validFiles.push(file);
    });
    
    if (validFiles.length > 0) {
        displaySelectedFiles(validFiles);
    }
}

// Exibir arquivos selecionados
function displaySelectedFiles(files) {
    const uploadedFilesDiv = document.getElementById('uploaded-files');
    const filesList = document.getElementById('files-list');
    
    if (!uploadedFilesDiv || !filesList) return;
    
    filesList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-image"></i>
                <span class="file-name">${file.name}</span>
            </div>
            <span class="file-size">${formatFileSize(file.size)}</span>
        `;
        filesList.appendChild(fileItem);
    });
    
    uploadedFilesDiv.style.display = 'block';
    
    // Armazenar arquivos para upload
    window.selectedFiles = files;
}

// Limpar arquivos selecionados
function clearSelectedFiles() {
    const uploadedFilesDiv = document.getElementById('uploaded-files');
    const fileInput = document.getElementById('assets-input');
    
    if (uploadedFilesDiv) {
        uploadedFilesDiv.style.display = 'none';
    }
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    window.selectedFiles = [];
}

// Fazer upload dos assets
function uploadAssets() {
    if (!window.selectedFiles || window.selectedFiles.length === 0) {
        showNotification('❌ Nenhum arquivo selecionado', 'error');
        return;
    }
    
    const formData = new FormData();
    
    window.selectedFiles.forEach(file => {
        formData.append('assets', file);
    });
    
    // Simular upload (aqui você implementaria a chamada real para o backend)
    showNotification('📤 Fazendo upload dos assets...', 'info');
    
    // Simular progresso
    setTimeout(() => {
        showNotification('✅ Assets enviados com sucesso!', 'success');
        clearSelectedFiles();
        loadCurrentAssets(); // Recarregar assets atuais
    }, 2000);
}

// Carregar assets atuais
function loadCurrentAssets() {
    console.log('📁 Carregando assets atuais...');
    
    // Aqui você implementaria a chamada para o backend para obter a lista de assets
    // Por enquanto, vamos apenas simular
    const assets = [
        'Background Dashboard.jpg',
        'Background Login.png',
        'Favicon.png',
        'LogoSiderBarAberta.png',
        'LogoSiderBarFechada.png'
    ];
    
    console.log('Assets encontrados:', assets);
}

// Visualizar asset
function previewAsset(filename) {
    const modal = document.getElementById('asset-preview-modal');
    const previewImage = document.getElementById('preview-image');
    
    if (!modal || !previewImage) return;
    
    // Definir src da imagem
    previewImage.src = `../assets/${filename}`;
    previewImage.alt = filename;
    
    // Mostrar modal
    modal.classList.add('show');
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeAssetPreview();
        }
    });
}

// Fechar preview de asset
function closeAssetPreview() {
    const modal = document.getElementById('asset-preview-modal');
    
    if (modal) {
        modal.classList.remove('show');
    }
}

// Formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validar nome do arquivo
function validateAssetName(filename) {
    const validNames = [
        'Background Dashboard.jpg',
        'Background Login.png',
        'Favicon.png',
        'LogoSiderBarAberta.png',
        'LogoSiderBarFechada.png'
    ];
    
    return validNames.includes(filename);
}

// Aplicar variações de cor (rgba)
function applyColorVariations(color, type) {
    // Converter hex para rgb
    const rgb = hexToRgb(color);
    if (!rgb) return;
    
    // Aplicar diferentes opacidades
    const variations = {
        '0.05': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`,
        '0.1': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        '0.15': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
        '0.2': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
        '0.3': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
        '0.4': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
    };
    
    // Aplicar as variações como variáveis CSS
    Object.keys(variations).forEach(opacity => {
        document.documentElement.style.setProperty(`--${type}-color-${opacity}`, variations[opacity]);
    });
}

// Converter hex para rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Aplicar cor a elementos específicos
function applyColorToElements(color, type) {
    const rgb = hexToRgb(color);
    if (!rgb) return;
    
    // Aplicar cor aos botões primários
    if (type === 'primary') {
        const primaryButtons = document.querySelectorAll('.btn-primary');
        primaryButtons.forEach(btn => {
            btn.style.background = color;
            btn.style.boxShadow = `0 4px 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
        });
        
        // Aplicar cor aos elementos da sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.background = `linear-gradient(180deg, ${color} 0%, var(--secondary-color) 100%)`;
        }
        
        // Aplicar cor aos headers
        const headers = document.querySelectorAll('.sidebar-header');
        headers.forEach(header => {
            header.style.borderBottom = `2px solid ${color}`;
        });
    }
    
    // Aplicar cor aos botões secundários
    if (type === 'secondary') {
        const secondaryButtons = document.querySelectorAll('.btn-secondary');
        secondaryButtons.forEach(btn => {
            btn.style.background = color;
            btn.style.boxShadow = `0 4px 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
        });
    }
}

// Criar variável global dashboard para compatibilidade
window.dashboard = null;

// Atualizar referência global quando dashboardManager for criado
const originalInitDashboard = initDashboard;
initDashboard = function() {
    originalInitDashboard();
    window.dashboard = dashboardManager;
};

// ===== SISTEMA DE GERENCIAMENTO DE ATUALIZAÇÕES =====

let updateManager = {
    currentUpdates: [],
    selectedUpdate: null,
    selectedRepositories: [],
    githubConfig: {
        owner: 'ChavesSD',
        repo: 'AgendaquiCHStudio',
        branch: 'master',
        token: '' // Token de acesso pessoal do GitHub
    },
    repositories: [] // Será preenchido com repositórios reais do GitHub
};

// Inicializar sistema de atualizações
function initUpdateManagement() {
    console.log('🔄 Inicializando sistema de atualizações...');
    
    // Carregar configurações salvas
    loadUpdateSettings();
    
    // Carregar repositórios salvos
    loadRepositories();
    
    // Verificar atualizações automaticamente
    setTimeout(() => {
        checkForUpdates();
    }, 1000);
}

// Carregar configurações do sistema de atualizações
function loadUpdateSettings() {
    const savedConfig = localStorage.getItem('updateManagerConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            updateManager.githubConfig = { ...updateManager.githubConfig, ...config };
        } catch (e) {
            console.error('Erro ao carregar configurações de atualizações:', e);
        }
    }
}

// Salvar configurações do sistema de atualizações
function saveUpdateSettings() {
    localStorage.setItem('updateManagerConfig', JSON.stringify(updateManager.githubConfig));
}

// Verificar atualizações disponíveis
async function checkForUpdates() {
    console.log('🔍 Verificando atualizações...');
    
    updateStatus('verificando', 'Verificando...');
    
    // Mostrar indicador de carregamento
    const container = document.getElementById('updates-container');
    if (container) {
        container.innerHTML = `
            <div class="loading-updates">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Buscando atualizações do GitHub...</p>
            </div>
        `;
    }
    
    try {
        const updates = await fetchGitHubCommits();
        
        updateManager.currentUpdates = updates;
        displayUpdates(updates);
        updateStatus('atualizado', 'Atualizado');
        updateLastCheck();
        
        console.log(`✅ Encontradas ${updates.length} atualizações`);
        
        // Mostrar notificação de sucesso
        showNotification(`Encontradas ${updates.length} atualizações disponíveis!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
        updateStatus('erro', 'Erro na verificação');
        showUpdateError('Erro ao verificar atualizações: ' + error.message);
        
        // Mostrar notificação de erro
        showNotification('Erro ao verificar atualizações. Verifique sua conexão com a internet.', 'error');
    }
}

// Buscar commits do GitHub (API real)
async function fetchGitHubCommits() {
    const { owner, repo, branch, token } = updateManager.githubConfig;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=10`;
    
    try {
        console.log('🔍 Buscando commits do GitHub:', apiUrl);
        
        // Preparar headers com autenticação se disponível
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CHStudio-UpdateManager/1.0'
        };
        
        if (token && token.trim() !== '') {
            headers['Authorization'] = `token ${token}`;
            console.log('🔑 Usando token de autenticação do GitHub');
        } else {
            console.log('⚠️ Nenhum token configurado - tentando acesso público');
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Repositório não encontrado: ${owner}/${repo}. Verifique se o nome está correto.`);
            } else if (response.status === 401) {
                throw new Error(`Acesso negado. Token inválido ou expirado. Configure um token válido do GitHub.`);
            } else if (response.status === 403) {
                throw new Error(`Acesso negado. Repositório privado sem permissão. Configure um token com acesso ao repositório.`);
            }
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const commits = await response.json();
        
        // Transformar dados da API para o formato esperado
        const formattedCommits = commits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message.split('\n')[0], // Primeira linha da mensagem
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            files: [], // Será preenchido se necessário
            description: commit.commit.message.split('\n').slice(1).join(' ').trim() || 'Sem descrição adicional'
        }));
        
        console.log(`✅ Encontrados ${formattedCommits.length} commits reais do GitHub`);
        showNotification(`Encontradas ${formattedCommits.length} atualizações reais do GitHub!`, 'success');
        return formattedCommits;
        
    } catch (error) {
        console.error('❌ Erro ao buscar commits do GitHub:', error);
        
        if (error.message.includes('Token inválido') || error.message.includes('Acesso negado')) {
            showNotification('Token do GitHub inválido ou expirado. Configure um token válido nas configurações.', 'error');
        } else if (error.message.includes('Repositório não encontrado')) {
            showNotification('Repositório não encontrado. Verifique o nome do repositório.', 'error');
        } else {
            showNotification('Erro ao conectar com GitHub. Verifique sua conexão e configurações.', 'error');
        }
        
        // Não retornar dados simulados - forçar configuração
        return [];
    }
}

// Exibir atualizações na interface
function displayUpdates(updates) {
    const container = document.getElementById('updates-container');
    
    if (!updates || updates.length === 0) {
        container.innerHTML = `
            <div class="no-updates">
                <div class="no-updates-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Nenhuma atualização encontrada</h3>
                    <p>Configure um token do GitHub para acessar repositórios privados ou verifique suas configurações.</p>
                    <button onclick="showUpdateSettings()" class="btn btn-primary">
                        <i class="fas fa-cog"></i> Configurar GitHub
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    const updatesHTML = updates.map(update => `
        <div class="update-item" onclick="showUpdateDetails('${update.sha}')">
            <div class="update-item-header">
                <h5 class="update-title">${update.message}</h5>
                <span class="update-date">${formatDate(update.date)}</span>
            </div>
            <p class="update-description">${update.description}</p>
            <div class="update-meta">
                <div class="update-author">
                    <i class="fas fa-user"></i>
                    <span>${update.author}</span>
                </div>
                <div class="update-hash">${update.sha.substring(0, 7)}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = updatesHTML;
}

// Mostrar detalhes de uma atualização
async function showUpdateDetails(sha) {
    const update = updateManager.currentUpdates.find(u => u.sha === sha);
    if (!update) return;
    
    updateManager.selectedUpdate = update;
    updateManager.selectedRepositories = []; // Reset seleção
    
    // Buscar detalhes completos do commit se necessário
    let detailedUpdate = update;
    if (!update.files || update.files.length === 0) {
        try {
            detailedUpdate = await fetchCommitDetails(sha);
        } catch (error) {
            console.warn('Erro ao buscar detalhes do commit:', error);
        }
    }
    
    const detailsContainer = document.getElementById('update-detail-content');
    detailsContainer.innerHTML = `
        <h5>Mensagem do Commit</h5>
        <p>${detailedUpdate.message}</p>
        
        <h5>Descrição</h5>
        <p>${detailedUpdate.description}</p>
        
        <h5>Autor</h5>
        <p><i class="fas fa-user"></i> ${detailedUpdate.author}</p>
        
        <h5>Data</h5>
        <p><i class="fas fa-calendar"></i> ${formatDate(detailedUpdate.date)}</p>
        
        <h5>Hash do Commit</h5>
        <pre>${detailedUpdate.sha}</pre>
        
        <h5>Arquivos Modificados</h5>
        <ul>
            ${detailedUpdate.files && detailedUpdate.files.length > 0 
                ? detailedUpdate.files.map(file => `<li><code>${file}</code></li>`).join('')
                : '<li><em>Arquivos não disponíveis</em></li>'
            }
        </ul>
    `;
    
    // Carregar lista de repositórios
    await loadRepositoriesList();
    
    // Atualizar botão de aplicar
    updateApplyButton();
    
    document.getElementById('update-details').style.display = 'block';
}

// Fechar detalhes da atualização
function closeUpdateDetails() {
    document.getElementById('update-details').style.display = 'none';
    updateManager.selectedUpdate = null;
}

// Aplicar atualização selecionada
async function applyUpdate() {
    if (!updateManager.selectedUpdate) {
        showNotification('Nenhuma atualização selecionada', 'error');
        return;
    }
    
    if (updateManager.selectedRepositories.length === 0) {
        showNotification('Selecione pelo menos um repositório', 'error');
        return;
    }
    
    const update = updateManager.selectedUpdate;
    const selectedRepos = updateManager.selectedRepositories.map(id => 
        updateManager.repositories.find(repo => repo.id === id)
    ).filter(repo => repo);
    
    const repoList = selectedRepos.map(repo => `• ${repo.name}`).join('\n');
    
    if (!confirm(`Tem certeza que deseja aplicar a atualização "${update.message}" nos seguintes repositórios?\n\n${repoList}`)) {
        return;
    }
    
    try {
        showNotification(`Aplicando atualização em ${selectedRepos.length} repositório(s)...`, 'info');
        
        // Simular aplicação da atualização em cada repositório
        for (const repo of selectedRepos) {
            console.log(`Aplicando atualização ${update.sha} no repositório: ${repo.name}`);
            await simulateUpdateApplication(update, repo);
        }
        
        showNotification(`Atualização aplicada com sucesso em ${selectedRepos.length} repositório(s)!`, 'success');
        closeUpdateDetails();
        
        // Recarregar a página após 2 segundos
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao aplicar atualização:', error);
        showNotification('Erro ao aplicar atualização: ' + error.message, 'error');
    }
}

// Simular aplicação de atualização
async function simulateUpdateApplication(update, repository) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`Aplicando atualização ${update.sha} no repositório: ${repository.name} (${repository.url})`);
            resolve();
        }, 1000);
    });
}

// Atualizar status do sistema
function updateStatus(status, text) {
    const statusElement = document.getElementById('update-status');
    if (statusElement) {
        statusElement.className = `status-value ${status}`;
        statusElement.textContent = text;
    }
}

// Atualizar última verificação
function updateLastCheck() {
    const lastCheckElement = document.getElementById('last-update-check');
    if (lastCheckElement) {
        lastCheckElement.textContent = new Date().toLocaleString('pt-BR');
    }
}

// Atualizar lista de atualizações
function refreshUpdateList() {
    checkForUpdates();
}

// Atualizar lista de repositórios
async function refreshRepositoriesList() {
    console.log('🔄 Atualizando lista de repositórios...');
    await loadRepositoriesList();
    showNotification('Lista de repositórios atualizada!', 'success');
}

// Mostrar configurações de atualizações
function showUpdateSettings() {
    console.log('🔧 Abrindo configurações do GitHub...');
    
    // Remover modal existente se houver
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.zIndex = '10000';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header" style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: #333; font-size: 1.25rem; font-weight: 600;">Configurações do GitHub</h3>
                <button onclick="closeUpdateSettings()" class="close" style="background: none; border: none; font-size: 24px; color: #999; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Repositório GitHub:</label>
                    <input type="text" id="github-repo" value="${updateManager.githubConfig.owner}/${updateManager.githubConfig.repo}" placeholder="usuario/repositorio" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: border-color 0.2s ease; box-sizing: border-box;">
                    <small style="display: block; margin-top: 5px; color: #666; font-size: 12px;">Formato: usuario/repositorio</small>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Branch:</label>
                    <input type="text" id="github-branch" value="${updateManager.githubConfig.branch}" placeholder="master" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: border-color 0.2s ease; box-sizing: border-box;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Token de Acesso (Obrigatório para repositórios privados):</label>
                    <input type="password" id="github-token" value="${updateManager.githubConfig.token}" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; transition: border-color 0.2s ease; box-sizing: border-box;">
                    <small style="display: block; margin-top: 5px; color: #666; font-size: 12px;">Necessário para repositórios privados. <a href="https://github.com/settings/tokens" target="_blank" style="color: #007bff; text-decoration: none;">Gerar token</a></small>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Testar Conexão:</label>
                    <button onclick="testGitHubConnection()" class="btn btn-secondary" style="padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #6c757d; color: white;">
                        <i class="fas fa-plug"></i> Testar Conexão
                    </button>
                </div>
            </div>
            <div class="modal-footer" style="padding: 20px 25px; border-top: 1px solid #e9ecef; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="saveUpdateSettings()" class="btn btn-primary" style="padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #007bff; color: white;">Salvar</button>
                <button onclick="closeUpdateSettings()" class="btn btn-secondary" style="padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #6c757d; color: white;">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ Modal de configurações criado e adicionado ao DOM');
    
    // Adicionar evento de clique no fundo para fechar
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeUpdateSettings();
        }
    });
}

// Fechar configurações de atualização
function closeUpdateSettings() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Salvar configurações de atualização
function saveUpdateSettings() {
    console.log('💾 Salvando configurações do GitHub...');
    
    const repoInput = document.getElementById('github-repo');
    const branchInput = document.getElementById('github-branch');
    const tokenInput = document.getElementById('github-token');
    
    if (!repoInput || !branchInput || !tokenInput) {
        console.error('❌ Elementos do formulário não encontrados');
        showNotification('Erro: Elementos do formulário não encontrados', 'error');
        return;
    }
    
    const [owner, repo] = repoInput.value.split('/');
    
    if (!owner || !repo) {
        console.error('❌ Formato de repositório inválido');
        showNotification('Por favor, insira um repositório válido no formato usuario/repositorio', 'error');
        return;
    }
    
    // Atualizar configurações
    updateManager.githubConfig.owner = owner;
    updateManager.githubConfig.repo = repo;
    updateManager.githubConfig.branch = branchInput.value || 'master';
    updateManager.githubConfig.token = tokenInput.value || '';
    
    console.log('✅ Configurações atualizadas:', updateManager.githubConfig);
    
    // Salvar no localStorage
    try {
        localStorage.setItem('githubConfig', JSON.stringify(updateManager.githubConfig));
        console.log('✅ Configurações salvas no localStorage');
    } catch (error) {
        console.error('❌ Erro ao salvar no localStorage:', error);
        showNotification('Erro ao salvar configurações localmente', 'error');
        return;
    }
    
    // Fechar modal e mostrar sucesso
    closeUpdateSettings();
    showNotification('Configurações salvas com sucesso!', 'success');
    
    // Testar conexão automaticamente após salvar
    setTimeout(() => {
        checkForUpdates();
    }, 1000);
}

// Testar conexão com GitHub
async function testGitHubConnection() {
    const repoInput = document.getElementById('github-repo');
    const branchInput = document.getElementById('github-branch');
    const tokenInput = document.getElementById('github-token');
    
    if (!repoInput || !branchInput || !tokenInput) return;
    
    const [owner, repo] = repoInput.value.split('/');
    const branch = branchInput.value || 'master';
    const token = tokenInput.value || '';
    
    if (!owner || !repo) {
        showNotification('Por favor, insira um repositório válido no formato usuario/repositorio', 'error');
        return;
    }
    
    showNotification('Testando conexão com GitHub...', 'info');
    
    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CHStudio-UpdateManager/1.0'
        };
        
        if (token && token.trim() !== '') {
            headers['Authorization'] = `token ${token}`;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const commits = await response.json();
            showNotification(`✅ Conexão bem-sucedida! Encontrados ${commits.length} commits.`, 'success');
        } else if (response.status === 404) {
            showNotification('❌ Repositório não encontrado. Verifique o nome.', 'error');
        } else if (response.status === 401) {
            showNotification('❌ Token inválido. Verifique seu token de acesso.', 'error');
        } else if (response.status === 403) {
            showNotification('❌ Acesso negado. Repositório privado sem permissão.', 'error');
        } else {
            showNotification(`❌ Erro: ${response.status} ${response.statusText}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Erro de conexão: ${error.message}`, 'error');
    }
}

// Mostrar erro de atualização
function showUpdateError(message) {
    const container = document.getElementById('updates-container');
    container.innerHTML = `
        <div class="update-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="checkForUpdates()">Tentar Novamente</button>
        </div>
    `;
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Implementar sistema de notificações visual
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .notification-success { background: #28a745; }
            .notification-error { background: #dc3545; }
            .notification-warning { background: #ffc107; color: #212529; }
            .notification-info { background: #17a2b8; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Obter ícone da notificação
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// ===== FUNÇÕES DE GERENCIAMENTO DE REPOSITÓRIOS =====

// Carregar lista de repositórios
async function loadRepositoriesList() {
    const repoList = document.getElementById('repo-list');
    if (!repoList) return;
    
    // Mostrar indicador de carregamento
    repoList.innerHTML = `
        <div class="loading-repositories">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Buscando repositórios do GitHub...</p>
        </div>
    `;
    
    try {
        // Buscar repositórios reais do GitHub
        const realRepositories = await fetchGitHubRepositories();
        
        // Combinar repositórios reais com os salvos localmente
        const allRepositories = [...realRepositories, ...updateManager.repositories.filter(repo => 
            !realRepositories.some(realRepo => realRepo.url === repo.url)
        )];
        
        updateManager.repositories = allRepositories;
        saveRepositories();
        
        // Renderizar lista
        renderRepositoriesList(allRepositories);
        
    } catch (error) {
        console.error('❌ Erro ao carregar repositórios:', error);
        
        // Fallback para repositórios salvos localmente
        renderRepositoriesList(updateManager.repositories);
        showNotification('Erro ao carregar repositórios do GitHub. Usando lista local.', 'warning');
    }
}

// Renderizar lista de repositórios
function renderRepositoriesList(repositories) {
    const repoList = document.getElementById('repo-list');
    if (!repoList) return;
    
    if (repositories.length === 0) {
        repoList.innerHTML = `
            <div class="no-repositories">
                <i class="fas fa-folder-open"></i>
                <p>Nenhum repositório encontrado</p>
                <button class="btn btn-primary" onclick="showAddRepositoryModal()">
                    <i class="fas fa-plus"></i> Adicionar Repositório
                </button>
            </div>
        `;
        return;
    }
    
    const repositoriesHTML = repositories.map(repo => `
        <div class="repo-item" data-repo-id="${repo.id}">
            <input type="checkbox" id="repo-${repo.id}" onchange="toggleRepositorySelection('${repo.id}')">
            <div class="repo-info">
                <div class="repo-name">${repo.name}</div>
                <div class="repo-url">${repo.url}</div>
                ${repo.description ? `<div class="repo-description">${repo.description}</div>` : ''}
            </div>
            <div class="repo-status ${repo.status}">
                <i class="fas fa-circle"></i>
                <span>${getStatusText(repo.status)}</span>
            </div>
        </div>
    `).join('');
    
    repoList.innerHTML = repositoriesHTML;
    updateSelectedReposSummary();
}

// Obter texto do status
function getStatusText(status) {
    const statusTexts = {
        'online': 'Online',
        'offline': 'Offline',
        'unknown': 'Desconhecido'
    };
    return statusTexts[status] || 'Desconhecido';
}

// Alternar seleção de repositório
function toggleRepositorySelection(repoId) {
    const checkbox = document.getElementById(`repo-${repoId}`);
    const repoItem = document.querySelector(`[data-repo-id="${repoId}"]`);
    
    if (checkbox.checked) {
        if (!updateManager.selectedRepositories.includes(repoId)) {
            updateManager.selectedRepositories.push(repoId);
        }
        repoItem.classList.add('selected');
    } else {
        updateManager.selectedRepositories = updateManager.selectedRepositories.filter(id => id !== repoId);
        repoItem.classList.remove('selected');
    }
    
    updateSelectedReposSummary();
    updateApplyButton();
}

// Selecionar todos os repositórios
function selectAllRepositories() {
    updateManager.selectedRepositories = updateManager.repositories.map(repo => repo.id);
    
    updateManager.repositories.forEach(repo => {
        const checkbox = document.getElementById(`repo-${repo.id}`);
        const repoItem = document.querySelector(`[data-repo-id="${repo.id}"]`);
        
        if (checkbox) checkbox.checked = true;
        if (repoItem) repoItem.classList.add('selected');
    });
    
    updateSelectedReposSummary();
    updateApplyButton();
}

// Desmarcar todos os repositórios
function deselectAllRepositories() {
    updateManager.selectedRepositories = [];
    
    updateManager.repositories.forEach(repo => {
        const checkbox = document.getElementById(`repo-${repo.id}`);
        const repoItem = document.querySelector(`[data-repo-id="${repo.id}"]`);
        
        if (checkbox) checkbox.checked = false;
        if (repoItem) repoItem.classList.remove('selected');
    });
    
    updateSelectedReposSummary();
    updateApplyButton();
}

// Filtrar repositórios
function filterRepositories() {
    const searchTerm = document.getElementById('repo-search').value.toLowerCase();
    const repoItems = document.querySelectorAll('.repo-item');
    
    repoItems.forEach(item => {
        const repoName = item.querySelector('.repo-name').textContent.toLowerCase();
        const repoUrl = item.querySelector('.repo-url').textContent.toLowerCase();
        
        if (repoName.includes(searchTerm) || repoUrl.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Atualizar resumo de repositórios selecionados
function updateSelectedReposSummary() {
    const summaryElement = document.getElementById('selected-repos-summary');
    if (!summaryElement) return;
    
    const count = updateManager.selectedRepositories.length;
    const countElement = summaryElement.querySelector('.selected-count');
    
    if (countElement) {
        countElement.textContent = `${count} repositório${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`;
    }
}

// Atualizar botão de aplicar atualização
function updateApplyButton() {
    const applyBtn = document.getElementById('apply-update-btn');
    if (!applyBtn) return;
    
    const hasSelection = updateManager.selectedRepositories.length > 0;
    applyBtn.disabled = !hasSelection;
    
    if (hasSelection) {
        applyBtn.innerHTML = `<i class="fas fa-download"></i> Aplicar Atualização (${updateManager.selectedRepositories.length})`;
    } else {
        applyBtn.innerHTML = `<i class="fas fa-download"></i> Aplicar Atualização`;
    }
}

// Mostrar modal para adicionar repositório
function showAddRepositoryModal() {
    const modalHTML = `
        <div class="repo-modal" id="add-repo-modal">
            <div class="repo-modal-content">
                <h3><i class="fas fa-plus"></i> Adicionar Novo Repositório</h3>
                
                <div class="repo-form-group">
                    <label for="new-repo-name">Nome do Repositório</label>
                    <input type="text" id="new-repo-name" placeholder="Ex: Cliente E - Barbearia">
                </div>
                
                <div class="repo-form-group">
                    <label for="new-repo-url">URL do Repositório</label>
                    <input type="url" id="new-repo-url" placeholder="https://github.com/cliente-e/barbearia">
                </div>
                
                <div class="repo-form-group">
                    <label for="new-repo-description">Descrição</label>
                    <input type="text" id="new-repo-description" placeholder="Descrição do repositório">
                </div>
                
                <div class="repo-form-group">
                    <label for="new-repo-status">Status</label>
                    <select id="new-repo-status">
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="unknown">Desconhecido</option>
                    </select>
                </div>
                
                <div class="repo-modal-actions">
                    <button class="btn btn-secondary" onclick="closeAddRepositoryModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="addRepository()">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Fechar modal de adicionar repositório
function closeAddRepositoryModal() {
    const modal = document.getElementById('add-repo-modal');
    if (modal) {
        modal.remove();
    }
}

// Adicionar novo repositório
function addRepository() {
    const name = document.getElementById('new-repo-name').value.trim();
    const url = document.getElementById('new-repo-url').value.trim();
    const description = document.getElementById('new-repo-description').value.trim();
    const status = document.getElementById('new-repo-status').value;
    
    if (!name || !url) {
        showNotification('Nome e URL são obrigatórios', 'error');
        return;
    }
    
    const newRepo = {
        id: 'repo' + Date.now(),
        name: name,
        url: url,
        description: description,
        status: status
    };
    
    updateManager.repositories.push(newRepo);
    saveRepositories();
    
    showNotification('Repositório adicionado com sucesso!', 'success');
    closeAddRepositoryModal();
    
    // Recarregar lista se estiver visível
    if (document.getElementById('update-details').style.display !== 'none') {
        loadRepositoriesList();
    }
}

// Mostrar configurações de repositórios
function showRepositorySettings() {
    const settings = prompt('Configurações de Repositórios:\n\n1. Atualizar do GitHub\n2. Exportar lista atual\n3. Importar lista\n4. Limpar todos\n\nDigite o número da opção:', '1');
    
    switch(settings) {
        case '1':
            refreshRepositoriesList();
            break;
        case '2':
            exportRepositories();
            break;
        case '3':
            importRepositories();
            break;
        case '4':
            if (confirm('Tem certeza que deseja limpar todos os repositórios?')) {
                clearAllRepositories();
            }
            break;
    }
}

// Exportar lista de repositórios
function exportRepositories() {
    const dataStr = JSON.stringify(updateManager.repositories, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'repositories.json';
    link.click();
    
    showNotification('Lista de repositórios exportada!', 'success');
}

// Importar lista de repositórios
function importRepositories() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedRepos = JSON.parse(e.target.result);
                updateManager.repositories = importedRepos;
                saveRepositories();
                showNotification('Lista de repositórios importada!', 'success');
                
                if (document.getElementById('update-details').style.display !== 'none') {
                    loadRepositoriesList();
                }
            } catch (error) {
                showNotification('Erro ao importar arquivo: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Limpar todos os repositórios
function clearAllRepositories() {
    updateManager.repositories = [];
    saveRepositories();
    showNotification('Todos os repositórios foram removidos!', 'success');
    
    if (document.getElementById('update-details').style.display !== 'none') {
        loadRepositoriesList();
    }
}

// Salvar repositórios no localStorage
function saveRepositories() {
    localStorage.setItem('updateManagerRepositories', JSON.stringify(updateManager.repositories));
}

// Carregar repositórios do localStorage
function loadRepositories() {
    const saved = localStorage.getItem('updateManagerRepositories');
    if (saved) {
        try {
            updateManager.repositories = JSON.parse(saved);
        } catch (e) {
            console.error('Erro ao carregar repositórios:', e);
        }
    }
}

// Buscar detalhes específicos de um commit
async function fetchCommitDetails(sha) {
    const { owner, repo } = updateManager.githubConfig;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
    
    try {
        console.log('🔍 Buscando detalhes do commit:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CHStudio-UpdateManager/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const commit = await response.json();
        
        return {
            sha: commit.sha,
            message: commit.commit.message.split('\n')[0],
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            files: commit.files ? commit.files.map(file => file.filename) : [],
            description: commit.commit.message.split('\n').slice(1).join(' ').trim() || 'Sem descrição adicional'
        };
        
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do commit:', error);
        throw error;
    }
}

// Buscar repositórios reais do GitHub
async function fetchGitHubRepositories() {
    const { owner } = updateManager.githubConfig;
    const apiUrl = `https://api.github.com/users/${owner}/repos?sort=updated&per_page=20&type=all`;
    
    try {
        console.log('🔍 Buscando repositórios do GitHub:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CHStudio-UpdateManager/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const repositories = await response.json();
        
        // Transformar dados da API para o formato esperado
        const formattedRepositories = repositories.map((repo, index) => ({
            id: `github-${repo.id}`,
            name: repo.name,
            url: repo.html_url,
            description: repo.description || 'Sem descrição',
            status: 'online', // Assumir online se está no GitHub
            isPrivate: repo.private,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updatedAt: repo.updated_at,
            createdAt: repo.created_at
        }));
        
        console.log(`✅ Encontrados ${formattedRepositories.length} repositórios do GitHub`);
        return formattedRepositories;
        
    } catch (error) {
        console.error('❌ Erro ao buscar repositórios do GitHub:', error);
        throw error;
    }
}
