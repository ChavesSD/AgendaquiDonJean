document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const financeDateFrom = document.getElementById('finance-date-from');
    const financeDateTo = document.getElementById('finance-date-to');
    const filterFinanceDates = document.getElementById('filter-finance-dates');
    const clearDateFilters = document.getElementById('clear-date-filters');
    
    // Cards de estatísticas
    const totalRevenue = document.getElementById('total-revenue');
    const totalExpenses = document.getElementById('total-expenses');
    const totalProfit = document.getElementById('total-profit');
    
    // Abas
    const financeTabs = document.querySelectorAll('.finance-tabs .tab-btn');
    const tabPanes = document.querySelectorAll('.finance-tabs .tab-pane');
    
    // Botões de ação
    const addRevenueBtn = document.getElementById('add-revenue-btn');
    const addPosBtn = document.getElementById('add-pos-btn');
    const addSaleBtn = document.getElementById('add-sale-btn');
    
    // Listas
    const revenueList = document.getElementById('revenue-list');
    const expensesList = document.getElementById('expenses-list');
    const posList = document.getElementById('pos-list');
    const financeHistoryList = document.getElementById('finance-history-list');
    
    // Filtros de busca
    const revenueSearch = document.getElementById('revenue-search');
    const expensesSearch = document.getElementById('expenses-search');
    
    // Filtros do histórico
    const financeHistoryTypeFilter = document.getElementById('finance-history-type-filter');
    const financeHistoryDateFrom = document.getElementById('finance-history-date-from');
    const financeHistoryDateTo = document.getElementById('finance-history-date-to');
    const clearFinanceHistoryFilters = document.getElementById('clear-finance-history-filters');
    
    // Gráfico
    let financeChart = null;
    
    // Dados
    let revenues = [];
    let expenses = [];
    let posMachines = [];
    let sales = [];
    let financeHistory = [];
    
    // Filtros aplicados
    let currentDateFrom = '';
    let currentDateTo = '';
    let filteredRevenues = [];
    let filteredExpenses = [];
    let filteredFinanceHistory = [];

    // Inicializar
    init();

    function init() {
        // Event listeners
        if (filterFinanceDates) {
            filterFinanceDates.addEventListener('click', handleDateFilter);
        }
        if (clearDateFilters) {
            clearDateFilters.addEventListener('click', clearDateFiltersFunc);
        }
        
        // Abas
        financeTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
        
        // Botões de ação
        if (addRevenueBtn) {
            addRevenueBtn.addEventListener('click', () => openRevenueModal());
        }
        if (addPosBtn) {
            addPosBtn.addEventListener('click', () => openPosModal());
        }
        if (addSaleBtn) {
            addSaleBtn.addEventListener('click', () => openSaleModal());
        }
        
        // Adicionar botões de gastos quando a aba for ativada
        const gastosTab = document.querySelector('[data-tab="gastos"]');
        if (gastosTab) {
            gastosTab.addEventListener('click', () => {
                // Adicionar botão de novo gasto se não existir
                if (!document.getElementById('add-expense-btn')) {
                    const addExpenseBtn = document.createElement('button');
                    addExpenseBtn.id = 'add-expense-btn';
                    addExpenseBtn.className = 'btn btn-primary';
                    addExpenseBtn.innerHTML = '<i class="fas fa-plus"></i><span>Novo Gasto</span>';
                    addExpenseBtn.addEventListener('click', () => openExpenseModal());
                    
                    const tabButtons = document.querySelector('.finance-tabs .tab-buttons');
                    if (tabButtons) {
                        tabButtons.appendChild(addExpenseBtn);
                    }
                }
            });
        }
        
        // Busca
        if (revenueSearch) {
            revenueSearch.addEventListener('input', (e) => filterRevenues(e.target.value));
        }
        if (expensesSearch) {
            expensesSearch.addEventListener('input', (e) => filterExpenses(e.target.value));
        }
        
        // Filtros do histórico
        if (financeHistoryTypeFilter) {
            financeHistoryTypeFilter.addEventListener('change', filterFinanceHistory);
        }
        if (financeHistoryDateFrom) {
            financeHistoryDateFrom.addEventListener('change', filterFinanceHistory);
        }
        if (financeHistoryDateTo) {
            financeHistoryDateTo.addEventListener('change', filterFinanceHistory);
        }
        if (clearFinanceHistoryFilters) {
            clearFinanceHistoryFilters.addEventListener('click', clearFinanceHistoryFiltersFunc);
        }
        
        // Carregar dados iniciais
        loadFinanceData();
        updateFinanceChart();
    }

    // Carregar dados financeiros
    async function loadFinanceData() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/finance', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                revenues = result.revenues || [];
                expenses = result.expenses || [];
                posMachines = result.posMachines || [];
                sales = result.sales || [];
                financeHistory = result.history || [];
                
                filteredRevenues = [...revenues];
                filteredExpenses = [...expenses];
                filteredFinanceHistory = [...financeHistory];
                
                updateStatistics();
                renderRevenues();
                renderExpenses();
                renderPosMachines();
                renderFinanceHistory();
                updateFinanceChart();
            } else {
                console.error('Erro ao carregar dados financeiros:', response.statusText);
                showNotification('Erro ao carregar dados financeiros', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
            showNotification('Erro ao carregar dados financeiros', 'error');
        }
    }

    // Atualizar estatísticas
    function updateStatistics() {
        let filteredRevenues = revenues;
        let filteredExpenses = expenses;
        
        // Aplicar filtros de data se definidos
        if (currentDateFrom || currentDateTo) {
            filteredRevenues = revenues.filter(r => {
                const revenueDate = new Date(r.date);
                let matches = true;
                
                if (currentDateFrom) {
                    const fromDate = new Date(currentDateFrom);
                    matches = matches && revenueDate >= fromDate;
                }
                
                if (currentDateTo) {
                    const toDate = new Date(currentDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    matches = matches && revenueDate <= toDate;
                }
                
                return matches;
            });
            
            filteredExpenses = expenses.filter(e => {
                const expenseDate = new Date(e.date);
                let matches = true;
                
                if (currentDateFrom) {
                    const fromDate = new Date(currentDateFrom);
                    matches = matches && expenseDate >= fromDate;
                }
                
                if (currentDateTo) {
                    const toDate = new Date(currentDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    matches = matches && expenseDate <= toDate;
                }
                
                return matches;
            });
        }
        
        const totalRev = filteredRevenues.reduce((sum, r) => sum + (r.value || 0), 0);
        const totalExp = filteredExpenses.reduce((sum, e) => sum + (e.value || 0), 0);
        const profit = totalRev - totalExp;
        
        if (totalRevenue) totalRevenue.textContent = formatCurrency(totalRev);
        if (totalExpenses) totalExpenses.textContent = formatCurrency(totalExp);
        if (totalProfit) totalProfit.textContent = formatCurrency(profit);
    }

    // Formatar moeda
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Trocar aba
    function switchTab(tabName) {
        // Remover active de todos os botões
        financeTabs.forEach(tab => tab.classList.remove('active'));
        
        // Adicionar active ao botão clicado
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Esconder todas as abas
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Mostrar aba correspondente
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Renderizar conteúdo específico da aba
        if (tabName === 'receitas') {
            renderRevenues();
        } else if (tabName === 'gastos') {
            renderExpenses();
        } else if (tabName === 'maquininha') {
            renderPosMachines();
        } else if (tabName === 'historico-financeiro') {
            renderFinanceHistory();
        }
    }

    // Renderizar receitas
    function renderRevenues() {
        if (!revenueList) return;

        if (filteredRevenues.length === 0) {
            revenueList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle"></i>
                    <h3>Nenhuma receita encontrada</h3>
                    <p>Adicione receitas para começar a controlar suas finanças.</p>
                </div>
            `;
            return;
        }

        revenueList.innerHTML = filteredRevenues.map(revenue => `
            <div class="revenue-item">
                <div class="item-content">
                    <div class="item-info">
                        <h4>${revenue.name}</h4>
                        <div class="item-details">
                            <span class="item-type">${revenue.type === 'unique' ? 'Única' : 'Fixa'}</span>
                            <div class="item-value">
                                <strong>${formatCurrency(revenue.value)}</strong>
                            </div>
                            <div class="item-date">
                                <i class="fas fa-calendar"></i>
                                ${formatDate(revenue.date)}
                            </div>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-sm" onclick="editRevenue('${revenue._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRevenue('${revenue._id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Renderizar gastos
    function renderExpenses() {
        if (!expensesList) return;

        if (filteredExpenses.length === 0) {
            expensesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-minus-circle"></i>
                    <h3>Nenhum gasto encontrado</h3>
                    <p>Adicione gastos para começar a controlar suas finanças.</p>
                </div>
            `;
            return;
        }

        expensesList.innerHTML = filteredExpenses.map(expense => `
            <div class="expense-item">
                <div class="item-content">
                    <div class="item-info">
                        <h4>${expense.name}</h4>
                        <div class="item-details">
                            <span class="item-type">${getExpenseTypeLabel(expense.type)}</span>
                            <div class="item-value">
                                <strong>${formatCurrency(expense.value)}</strong>
                            </div>
                            <div class="item-date">
                                <i class="fas fa-calendar"></i>
                                ${formatDate(expense.date)}
                            </div>
                            ${expense.installments ? `
                                <div class="item-installments">
                                    <i class="fas fa-credit-card"></i>
                                    ${expense.currentInstallment}/${expense.totalInstallments} parcelas
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-sm" onclick="editExpense('${expense._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteExpense('${expense._id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Renderizar maquininhas
    function renderPosMachines() {
        if (!posList) return;

        if (posMachines.length === 0) {
            posList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <h3>Nenhuma maquininha cadastrada</h3>
                    <p>Adicione maquininhas para começar a registrar vendas.</p>
                </div>
            `;
            return;
        }

        posList.innerHTML = posMachines.map(pos => `
            <div class="pos-item">
                <div class="item-content">
                    <div class="item-info">
                        <div class="item-photo">
                            ${pos.photo ? 
                                `<img src="${pos.photo}" alt="${pos.name}">` : 
                                '<i class="fas fa-credit-card"></i>'
                            }
                        </div>
                        <div class="item-details">
                            <h4>${pos.name}</h4>
                            <p><strong>Taxa:</strong> ${pos.rate}%</p>
                            <p><strong>Cadastrada em:</strong> ${formatDate(pos.createdAt)}</p>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-sm" onclick="editPos('${pos._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deletePos('${pos._id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Renderizar histórico financeiro
    function renderFinanceHistory() {
        if (!financeHistoryList) return;

        if (filteredFinanceHistory.length === 0) {
            financeHistoryList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <h3>Nenhum histórico encontrado</h3>
                    <p>As movimentações financeiras aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        financeHistoryList.innerHTML = filteredFinanceHistory.map(item => `
            <div class="history-item ${item.type}">
                <div class="history-item-header">
                    <div class="history-item-type ${item.type}">
                        <i class="fas fa-${getHistoryIcon(item.type)}"></i>
                        ${getHistoryTypeLabel(item.type)}
                    </div>
                    <div class="history-item-date">
                        ${formatDateTime(item.date)}
                    </div>
                </div>
                
                <div class="history-item-content">
                    <div class="history-item-info">
                        <h4>${item.name}</h4>
                        <p>Valor: ${formatCurrency(item.value)}</p>
                    </div>
                    
                    <div class="history-item-user">
                        <i class="fas fa-user"></i>
                        ${item.userName || 'Usuário'}
                    </div>
                </div>
                
                ${item.description ? `
                    <div class="history-item-reason">
                        <strong>Descrição:</strong> ${item.description}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Atualizar gráfico financeiro
    function updateFinanceChart() {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (financeChart) {
            financeChart.destroy();
        }

        // Preparar dados dos últimos 12 meses
        const months = [];
        const revenueData = [];
        const expenseData = [];

        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            
            months.push(monthName);
            
            // Calcular receitas do mês
            let monthRevenues = revenues.filter(r => {
                const revenueDate = new Date(r.date);
                const revenueMonth = revenueDate.getFullYear() + '-' + String(revenueDate.getMonth() + 1).padStart(2, '0');
                return revenueMonth === monthKey;
            });
            
            // Aplicar filtros de data se definidos
            if (currentDateFrom || currentDateTo) {
                monthRevenues = monthRevenues.filter(r => {
                    const revenueDate = new Date(r.date);
                    let matches = true;
                    
                    if (currentDateFrom) {
                        const fromDate = new Date(currentDateFrom);
                        matches = matches && revenueDate >= fromDate;
                    }
                    
                    if (currentDateTo) {
                        const toDate = new Date(currentDateTo);
                        toDate.setHours(23, 59, 59, 999);
                        matches = matches && revenueDate <= toDate;
                    }
                    
                    return matches;
                });
            }
            
            const monthRevenueTotal = monthRevenues.reduce((sum, r) => sum + (r.value || 0), 0);
            revenueData.push(monthRevenueTotal);
            
            // Calcular gastos do mês
            let monthExpenses = expenses.filter(e => {
                const expenseDate = new Date(e.date);
                const expenseMonth = expenseDate.getFullYear() + '-' + String(expenseDate.getMonth() + 1).padStart(2, '0');
                return expenseMonth === monthKey;
            });
            
            // Aplicar filtros de data se definidos
            if (currentDateFrom || currentDateTo) {
                monthExpenses = monthExpenses.filter(e => {
                    const expenseDate = new Date(e.date);
                    let matches = true;
                    
                    if (currentDateFrom) {
                        const fromDate = new Date(currentDateFrom);
                        matches = matches && expenseDate >= fromDate;
                    }
                    
                    if (currentDateTo) {
                        const toDate = new Date(currentDateTo);
                        toDate.setHours(23, 59, 59, 999);
                        matches = matches && expenseDate <= toDate;
                    }
                    
                    return matches;
                });
            }
            
            const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + (e.value || 0), 0);
            expenseData.push(monthExpenseTotal);
        }

        financeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Receitas',
                    data: revenueData,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Gastos',
                    data: expenseData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Filtrar receitas
    function filterRevenues(searchTerm) {
        filteredRevenues = revenues.filter(revenue => 
            revenue.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderRevenues();
    }

    // Filtrar gastos
    function filterExpenses(searchTerm) {
        filteredExpenses = expenses.filter(expense => 
            expense.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderExpenses();
    }

    // Filtrar histórico financeiro
    function filterFinanceHistory() {
        const typeFilter = financeHistoryTypeFilter?.value || '';
        const dateFrom = financeHistoryDateFrom?.value || '';
        const dateTo = financeHistoryDateTo?.value || '';

        filteredFinanceHistory = financeHistory.filter(item => {
            const matchesType = !typeFilter || item.type === typeFilter;
            
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const itemDate = new Date(item.date);
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    matchesDate = matchesDate && itemDate >= fromDate;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    matchesDate = matchesDate && itemDate <= toDate;
                }
            }

            return matchesType && matchesDate;
        });

        renderFinanceHistory();
    }

    // Limpar filtros de data
    function clearDateFiltersFunc() {
        if (financeDateFrom) {
            financeDateFrom.value = '';
        }
        if (financeDateTo) {
            financeDateTo.value = '';
        }
        currentDateFrom = '';
        currentDateTo = '';
        loadFinanceData();
    }

    // Limpar filtros do histórico
    function clearFinanceHistoryFiltersFunc() {
        if (financeHistoryTypeFilter) financeHistoryTypeFilter.value = '';
        if (financeHistoryDateFrom) financeHistoryDateFrom.value = '';
        if (financeHistoryDateTo) financeHistoryDateTo.value = '';
        
        filteredFinanceHistory = [...financeHistory];
        renderFinanceHistory();
    }

    // Manipular filtro de data
    function handleDateFilter() {
        currentDateFrom = financeDateFrom ? financeDateFrom.value : '';
        currentDateTo = financeDateTo ? financeDateTo.value : '';
        
        // Validar datas
        if (currentDateFrom && currentDateTo) {
            const fromDate = new Date(currentDateFrom);
            const toDate = new Date(currentDateTo);
            
            if (fromDate > toDate) {
                showNotification('A data de início deve ser anterior à data de fim', 'error');
                return;
            }
        }
        
        updateStatistics();
        updateFinanceChart();
        renderRevenues();
        renderExpenses();
        renderFinanceHistory();
    }

    // Funções auxiliares
    function getExpenseTypeLabel(type) {
        const labels = {
            'unique': 'Única',
            'installment': 'Parcelado',
            'fixed': 'Fixo'
        };
        return labels[type] || type;
    }

    function getHistoryIcon(type) {
        const icons = {
            'receita': 'plus',
            'gasto': 'minus',
            'venda': 'shopping-cart'
        };
        return icons[type] || 'circle';
    }

    function getHistoryTypeLabel(type) {
        const labels = {
            'receita': 'Receita',
            'gasto': 'Gasto',
            'venda': 'Venda'
        };
        return labels[type] || type;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Funções globais para os botões
    window.editRevenue = function(revenueId) {
        openRevenueModal(revenueId);
    };

    window.deleteRevenue = async function(revenueId) {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/revenues/${revenueId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showNotification('Receita excluída com sucesso!', 'success');
                    loadFinanceData();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Erro ao excluir receita', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir receita:', error);
                showNotification('Erro ao excluir receita', 'error');
            }
        }
    };

    window.editExpense = function(expenseId) {
        openExpenseModal(expenseId);
    };

    window.deleteExpense = async function(expenseId) {
        if (confirm('Tem certeza que deseja excluir este gasto?')) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/expenses/${expenseId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showNotification('Gasto excluído com sucesso!', 'success');
                    loadFinanceData();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Erro ao excluir gasto', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir gasto:', error);
                showNotification('Erro ao excluir gasto', 'error');
            }
        }
    };

    window.editPos = function(posId) {
        openPosModal(posId);
    };

    window.deletePos = async function(posId) {
        if (confirm('Tem certeza que deseja excluir esta maquininha?')) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/pos-machines/${posId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showNotification('Maquininha excluída com sucesso!', 'success');
                    loadFinanceData();
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Erro ao excluir maquininha', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir maquininha:', error);
                showNotification('Erro ao excluir maquininha', 'error');
            }
        }
    };

    // ==================== FUNÇÕES DOS MODAIS ====================

    // Modal de Receita
    function openRevenueModal(revenueId = null) {
        const modal = document.getElementById('revenue-modal');
        const form = document.getElementById('revenue-form');
        const title = document.getElementById('revenue-modal-title');
        
        if (revenueId) {
            // Editar receita existente
            const revenue = revenues.find(r => r._id === revenueId);
            if (revenue) {
                title.textContent = 'Editar Receita';
                document.getElementById('revenue-name').value = revenue.name;
                document.getElementById('revenue-type').value = revenue.type;
                document.getElementById('revenue-value').value = revenue.value;
                document.getElementById('revenue-description').value = revenue.description || '';
                form.dataset.revenueId = revenueId;
            }
        } else {
            // Nova receita
            title.textContent = 'Nova Receita';
            form.reset();
            delete form.dataset.revenueId;
        }
        
        modal.style.display = 'flex';
    }

    function closeRevenueModal() {
        document.getElementById('revenue-modal').style.display = 'none';
    }

    async function saveRevenue() {
        const form = document.getElementById('revenue-form');
        const formData = new FormData(form);
        const revenueId = form.dataset.revenueId;
        
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            value: formData.get('value'),
            description: formData.get('description')
        };
        
        try {
            const token = localStorage.getItem('authToken');
            const url = revenueId ? `/api/revenues/${revenueId}` : '/api/revenues';
            const method = revenueId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showNotification(
                    revenueId ? 'Receita atualizada com sucesso!' : 'Receita criada com sucesso!', 
                    'success'
                );
                closeRevenueModal();
                loadFinanceData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Erro ao salvar receita', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar receita:', error);
            showNotification('Erro ao salvar receita', 'error');
        }
    }

    // Modal de Gasto
    function openExpenseModal(expenseId = null) {
        const modal = document.getElementById('expense-modal');
        const form = document.getElementById('expense-form');
        const title = document.getElementById('expense-modal-title');
        
        if (expenseId) {
            // Editar gasto existente
            const expense = expenses.find(e => e._id === expenseId);
            if (expense) {
                title.textContent = 'Editar Gasto';
                document.getElementById('expense-name').value = expense.name;
                document.getElementById('expense-type').value = expense.type;
                document.getElementById('expense-value').value = expense.value;
                document.getElementById('expense-description').value = expense.description || '';
                if (expense.totalInstallments) {
                    document.getElementById('expense-installments').value = expense.totalInstallments;
                }
                form.dataset.expenseId = expenseId;
                toggleInstallments();
            }
        } else {
            // Novo gasto
            title.textContent = 'Novo Gasto';
            form.reset();
            delete form.dataset.expenseId;
            toggleInstallments();
        }
        
        modal.style.display = 'flex';
    }

    function closeExpenseModal() {
        document.getElementById('expense-modal').style.display = 'none';
    }

    function toggleInstallments() {
        const type = document.getElementById('expense-type').value;
        const installmentsGroup = document.getElementById('installments-group');
        
        if (type === 'installment') {
            installmentsGroup.style.display = 'block';
            installmentsGroup.classList.add('show');
        } else {
            installmentsGroup.style.display = 'none';
            installmentsGroup.classList.remove('show');
        }
    }

    async function saveExpense() {
        const form = document.getElementById('expense-form');
        const formData = new FormData(form);
        const expenseId = form.dataset.expenseId;
        
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            value: formData.get('value'),
            description: formData.get('description'),
            totalInstallments: formData.get('totalInstallments')
        };
        
        try {
            const token = localStorage.getItem('authToken');
            const url = expenseId ? `/api/expenses/${expenseId}` : '/api/expenses';
            const method = expenseId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showNotification(
                    expenseId ? 'Gasto atualizado com sucesso!' : 'Gasto criado com sucesso!', 
                    'success'
                );
                closeExpenseModal();
                loadFinanceData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Erro ao salvar gasto', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar gasto:', error);
            showNotification('Erro ao salvar gasto', 'error');
        }
    }

    // Modal de Maquininha
    function openPosModal(posId = null) {
        const modal = document.getElementById('pos-modal');
        const form = document.getElementById('pos-form');
        const title = document.getElementById('pos-modal-title');
        
        if (posId) {
            // Editar maquininha existente
            const pos = posMachines.find(p => p._id === posId);
            if (pos) {
                title.textContent = 'Editar Maquininha';
                document.getElementById('pos-name').value = pos.name;
                document.getElementById('pos-photo').value = pos.photo || '';
                document.getElementById('pos-rate').value = pos.rate;
                document.getElementById('pos-description').value = pos.description || '';
                form.dataset.posId = posId;
            }
        } else {
            // Nova maquininha
            title.textContent = 'Nova Maquininha';
            form.reset();
            delete form.dataset.posId;
        }
        
        modal.style.display = 'flex';
    }

    function closePosModal() {
        document.getElementById('pos-modal').style.display = 'none';
    }

    async function savePos() {
        const form = document.getElementById('pos-form');
        const formData = new FormData(form);
        const posId = form.dataset.posId;
        
        const data = {
            name: formData.get('name'),
            photo: formData.get('photo'),
            rate: formData.get('rate'),
            description: formData.get('description')
        };
        
        try {
            const token = localStorage.getItem('authToken');
            const url = posId ? `/api/pos-machines/${posId}` : '/api/pos-machines';
            const method = posId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showNotification(
                    posId ? 'Maquininha atualizada com sucesso!' : 'Maquininha criada com sucesso!', 
                    'success'
                );
                closePosModal();
                loadFinanceData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Erro ao salvar maquininha', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar maquininha:', error);
            showNotification('Erro ao salvar maquininha', 'error');
        }
    }

    // Modal de Venda
    function openSaleModal() {
        const modal = document.getElementById('sale-modal');
        const form = document.getElementById('sale-form');
        
        // Limpar formulário
        form.reset();
        document.getElementById('sale-result').style.display = 'none';
        
        // Popular dropdowns
        populatePosDropdown();
        populateProfessionalDropdown();
        
        modal.style.display = 'flex';
    }

    function closeSaleModal() {
        document.getElementById('sale-modal').style.display = 'none';
    }

    function populatePosDropdown() {
        const select = document.getElementById('sale-pos');
        select.innerHTML = '<option value="">Selecione a maquininha</option>';
        
        posMachines.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos._id;
            option.textContent = `${pos.name} (${pos.rate}%)`;
            select.appendChild(option);
        });
    }

    function populateProfessionalDropdown() {
        const select = document.getElementById('sale-professional');
        select.innerHTML = '<option value="">Selecione o profissional</option>';
        
        // Buscar profissionais via API
        fetch('/api/professionals', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.professionals.forEach(professional => {
                    const option = document.createElement('option');
                    option.value = professional._id;
                    option.textContent = `${professional.firstName} ${professional.lastName}`;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar profissionais:', error);
        });
    }

    function calculateProfit() {
        const saleValue = parseFloat(document.getElementById('sale-value').value) || 0;
        const commission = parseFloat(document.getElementById('sale-commission').value) || 0;
        const posSelect = document.getElementById('sale-pos');
        const selectedPos = posMachines.find(p => p._id === posSelect.value);
        
        if (saleValue > 0 && selectedPos) {
            const posFee = (saleValue * selectedPos.rate) / 100;
            const professionalCommission = (saleValue * commission) / 100;
            const netProfit = saleValue - posFee - professionalCommission;
            
            // Atualizar exibição
            document.getElementById('result-sale-value').textContent = formatCurrency(saleValue);
            document.getElementById('result-pos-fee').textContent = formatCurrency(posFee);
            document.getElementById('result-professional-commission').textContent = formatCurrency(professionalCommission);
            document.getElementById('result-net-profit').textContent = formatCurrency(netProfit);
            
            document.getElementById('sale-result').style.display = 'block';
        } else {
            document.getElementById('sale-result').style.display = 'none';
        }
    }

    async function saveSale() {
        const form = document.getElementById('sale-form');
        const formData = new FormData(form);
        
        const data = {
            posMachineId: formData.get('posMachineId'),
            value: formData.get('value'),
            professionalId: formData.get('professionalId'),
            professionalCommission: formData.get('professionalCommission'),
            description: formData.get('description')
        };
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showNotification('Venda registrada com sucesso!', 'success');
                closeSaleModal();
                loadFinanceData();
            } else {
                const error = await response.json();
                showNotification(error.message || 'Erro ao registrar venda', 'error');
            }
        } catch (error) {
            console.error('Erro ao registrar venda:', error);
            showNotification('Erro ao registrar venda', 'error');
        }
    }

    // Funções globais para os botões
    window.openRevenueModal = openRevenueModal;
    window.closeRevenueModal = closeRevenueModal;
    window.saveRevenue = saveRevenue;
    window.openExpenseModal = openExpenseModal;
    window.closeExpenseModal = closeExpenseModal;
    window.saveExpense = saveExpense;
    window.toggleInstallments = toggleInstallments;
    window.openPosModal = openPosModal;
    window.closePosModal = closePosModal;
    window.savePos = savePos;
    window.openSaleModal = openSaleModal;
    window.closeSaleModal = closeSaleModal;
    window.saveSale = saveSale;
    window.calculateProfit = calculateProfit;
});
