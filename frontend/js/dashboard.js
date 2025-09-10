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
            pages: ['dashboard', 'agenda', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
        },
        manager: {
            canCreateUsers: true,
            canCreateAdmin: false,
            canAccessBackup: false,
            canAccessAllPages: true,
            pages: ['dashboard', 'agenda', 'financeiro', 'profissionais', 'servicos', 'relatorios', 'configuracoes']
        },
        user: {
            canCreateUsers: false,
            canCreateAdmin: false,
            canAccessBackup: false,
            canAccessAllPages: false,
            pages: ['dashboard', 'agenda']
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
        const userEmailInput = document.getElementById('userEmail');
        const userPasswordInput = document.getElementById('userPassword');
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
                document.getElementById('userEmail').value = user.email || '';
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
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
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
            
            // Permite editar se for o próprio usuário (independente de ser admin ou não)
            const canEdit = isCurrentUser;
            
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
        
        // Permite editar apenas se for o próprio usuário
        if (!isCurrentUser) {
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
});
