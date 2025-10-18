document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const addProductBtn = document.getElementById('add-product-btn');
    const addProductTabBtn = document.getElementById('add-product-tab-btn');
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const closeProductModal = document.getElementById('closeProductModal');
    const cancelProduct = document.getElementById('cancelProduct');
    const saveProduct = document.getElementById('saveProduct');
    const productPhotoUrl = document.getElementById('productPhotoUrl');
    const productPhotoPreview = document.getElementById('productPhotoPreview');
    
    const addItemsModal = document.getElementById('addItemsModal');
    const addItemsForm = document.getElementById('addItemsForm');
    const closeAddItemsModal = document.getElementById('closeAddItemsModal');
    const cancelAddItems = document.getElementById('cancelAddItems');
    const confirmAddItems = document.getElementById('confirmAddItems');
    
    const withdrawalModal = document.getElementById('withdrawalModal');
    const withdrawalForm = document.getElementById('withdrawalForm');
    const closeWithdrawalModal = document.getElementById('closeWithdrawalModal');
    const cancelWithdrawal = document.getElementById('cancelWithdrawal');
    const confirmWithdrawal = document.getElementById('confirmWithdrawal');
    
    const stockTabs = document.querySelectorAll('.stock-tabs .tab-btn');
    const tabPanes = document.querySelectorAll('.stock-tabs .tab-pane');
    
    const productsList = document.getElementById('products-list');
    const withdrawalList = document.getElementById('withdrawal-list');
    const historyList = document.getElementById('history-list');
    
    // Filtros do histórico
    const historyTypeFilter = document.getElementById('history-type-filter');
    const historyProductFilter = document.getElementById('history-product-filter');
    const historyDateFrom = document.getElementById('history-date-from');
    const historyDateTo = document.getElementById('history-date-to');
    const clearHistoryFilters = document.getElementById('clear-history-filters');
    
    const productSearch = document.getElementById('product-search');
    const withdrawalSearch = document.getElementById('withdrawal-search');
    
    // Estatísticas
    const totalProducts = document.getElementById('total-products');
    const inStockProducts = document.getElementById('in-stock-products');
    const lowStockProducts = document.getElementById('low-stock-products');
    const outOfStockProducts = document.getElementById('out-of-stock-products');
    
    // Gráfico
    let stockChart = null;
    
    // Dados dos produtos
    let products = [];
    let filteredProducts = [];
    let filteredWithdrawalProducts = [];
    let historyData = [];
    let filteredHistory = [];

    // Inicializar
    init();

    function init() {
        // Event listeners
        addProductBtn.addEventListener('click', () => openProductModal());
        addProductTabBtn.addEventListener('click', () => openProductModal());
        closeProductModal.addEventListener('click', () => closeProductModalFunc());
        cancelProduct.addEventListener('click', () => closeProductModalFunc());
        saveProduct.addEventListener('click', (e) => {
            e.preventDefault();
            saveProductFunc();
        });
        
        closeAddItemsModal.addEventListener('click', () => closeAddItemsModalFunc());
        cancelAddItems.addEventListener('click', () => closeAddItemsModalFunc());
        confirmAddItems.addEventListener('click', (e) => {
            e.preventDefault();
            confirmAddItemsFunc();
        });
        
        closeWithdrawalModal.addEventListener('click', () => closeWithdrawalModalFunc());
        cancelWithdrawal.addEventListener('click', () => closeWithdrawalModalFunc());
        confirmWithdrawal.addEventListener('click', (e) => {
            e.preventDefault();
            confirmWithdrawalFunc();
        });
        
        // URL de foto
        productPhotoUrl.addEventListener('input', handlePhotoUrlChange);
        
        // Abas
        stockTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
        
        // Filtros do histórico
        if (historyTypeFilter) {
            historyTypeFilter.addEventListener('change', filterHistory);
        }
        if (historyProductFilter) {
            historyProductFilter.addEventListener('change', filterHistory);
        }
        if (historyDateFrom) {
            historyDateFrom.addEventListener('change', filterHistory);
        }
        if (historyDateTo) {
            historyDateTo.addEventListener('change', filterHistory);
        }
        if (clearHistoryFilters) {
            clearHistoryFilters.addEventListener('click', clearHistoryFiltersFunc);
        }
        
        // Busca
        productSearch.addEventListener('input', (e) => filterProducts(e.target.value));
        withdrawalSearch.addEventListener('input', (e) => filterWithdrawalProducts(e.target.value));
        
        // Fechar modais ao clicar fora
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) closeProductModalFunc();
        });
        
        withdrawalModal.addEventListener('click', (e) => {
            if (e.target === withdrawalModal) closeWithdrawalModalFunc();
        });
        
        // Carregar dados iniciais
        loadProducts();
        loadHistory();
    }

    // Carregar produtos
    async function loadProducts() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/products', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                products = result.products || [];
                filteredProducts = [...products];
                filteredWithdrawalProducts = [...products];
                updateStatistics();
                renderProducts();
                renderWithdrawalProducts();
                updateChart();
            } else {
                console.error('Erro ao carregar produtos:', response.statusText);
                showNotification('Erro ao carregar produtos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showNotification('Erro ao carregar produtos', 'error');
        }
    }

    // Atualizar estatísticas
    function updateStatistics() {
        const total = products.length;
        const inStock = products.filter(p => p.quantity > p.minQuantity).length;
        const lowStock = products.filter(p => p.quantity <= p.minQuantity && p.quantity > 0).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        totalProducts.textContent = total;
        inStockProducts.textContent = inStock;
        lowStockProducts.textContent = lowStock;
        outOfStockProducts.textContent = outOfStock;
    }

    // Carregar histórico
    async function loadHistory() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/products/history', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                historyData = result.history || [];
                filteredHistory = [...historyData];
                
                // Expor dados de histórico globalmente para uso em relatórios
                window.historyData = historyData;
                console.log('📦 Dados de histórico expostos globalmente:', historyData.length, 'movimentações');
                
                renderHistory();
                populateProductFilter();
            } else {
                console.error('Erro ao carregar histórico:', response.statusText);
                showNotification('Erro ao carregar histórico', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            showNotification('Erro ao carregar histórico', 'error');
        }
    }

    // Renderizar histórico
    function renderHistory() {
        if (!historyList) return;

        if (filteredHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <h3>Nenhum histórico encontrado</h3>
                    <p>As movimentações de estoque aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = filteredHistory.map(item => `
            <div class="history-item ${item.type}">
                <div class="history-item-header">
                    <div class="history-item-type ${item.type}">
                        <i class="fas fa-${item.type === 'entrada' ? 'plus' : 'minus'}"></i>
                        ${item.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </div>
                    <div class="history-item-date">
                        ${formatDateTime(item.date)}
                    </div>
                </div>
                
                <div class="history-item-content">
                    <div class="history-item-info">
                        <h4>${item.productName}</h4>
                        <p>Categoria: ${item.productCategory || 'N/A'}</p>
                    </div>
                    
                    <div class="history-item-quantity">
                        ${item.type === 'entrada' ? '+' : '-'}${item.quantity}
                    </div>
                    
                    <div class="history-item-user">
                        <i class="fas fa-user"></i>
                        ${item.userName || 'Usuário'}
                    </div>
                </div>
                
                <div class="history-item-reason">
                    <strong>Motivo:</strong> ${item.reason}
                </div>
                
                ${item.notes ? `
                    <div class="history-item-notes">
                        <strong>Observações:</strong> ${item.notes}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Popular filtro de produtos
    function populateProductFilter() {
        if (!historyProductFilter) return;
        
        const uniqueProducts = [...new Set(historyData.map(item => item.productName))];
        historyProductFilter.innerHTML = '<option value="">Todos os produtos</option>' +
            uniqueProducts.map(product => `<option value="${product}">${product}</option>`).join('');
    }

    // Filtrar histórico
    function filterHistory() {
        if (!historyData) return;

        const typeFilter = historyTypeFilter?.value || '';
        const productFilter = historyProductFilter?.value || '';
        const dateFrom = historyDateFrom?.value || '';
        const dateTo = historyDateTo?.value || '';

        filteredHistory = historyData.filter(item => {
            const matchesType = !typeFilter || item.type === typeFilter;
            const matchesProduct = !productFilter || item.productName === productFilter;
            
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

            return matchesType && matchesProduct && matchesDate;
        });

        renderHistory();
    }

    // Limpar filtros do histórico
    function clearHistoryFiltersFunc() {
        if (historyTypeFilter) historyTypeFilter.value = '';
        if (historyProductFilter) historyProductFilter.value = '';
        if (historyDateFrom) historyDateFrom.value = '';
        if (historyDateTo) historyDateTo.value = '';
        
        filteredHistory = [...historyData];
        renderHistory();
    }

    // Formatar data e hora
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

    // Renderizar produtos
    function renderProducts() {
        if (!productsList) return;

        productsList.innerHTML = '';

        if (filteredProducts.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Adicione produtos para começar a gerenciar seu estoque.</p>
                </div>
            `;
            return;
        }

        filteredProducts.forEach(product => {
            const productCard = createProductCard(product);
            productsList.appendChild(productCard);
        });
    }

    // Renderizar produtos para retirada
    function renderWithdrawalProducts() {
        if (!withdrawalList) return;

        withdrawalList.innerHTML = '';

        if (filteredWithdrawalProducts.length === 0) {
            withdrawalList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-minus-circle"></i>
                    <h3>Nenhum produto disponível</h3>
                    <p>Não há produtos em estoque para retirar.</p>
                </div>
            `;
            return;
        }

        filteredWithdrawalProducts.forEach(product => {
            const withdrawalCard = createWithdrawalCard(product);
            withdrawalList.appendChild(withdrawalCard);
        });
    }

    // Criar card de produto
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const stockLevel = getStockLevel(product.quantity, product.minQuantity);
        const stockLevelClass = stockLevel.toLowerCase().replace(' ', '-');
        
        // Verificar se estamos na aba de entrada ou saída
        const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const isEntradaTab = currentTab === 'entrada';
        
        card.innerHTML = `
            <div class="product-icon">
                ${product.photo ? 
                    `<img src="${product.photo}" alt="${product.name}">` : 
                    '<i class="fas fa-box"></i>'
                }
            </div>
            <div class="product-info">
                <h4>${product.name}</h4>
                <p class="product-category">${product.category || 'Sem categoria'}</p>
                <div class="product-details">
                    <span class="product-supplier">
                        <i class="fas fa-tag"></i>
                        ${product.supplier || 'Sem fornecedor'}
                    </span>
                    <span class="product-price">
                        <i class="fas fa-dollar-sign"></i>
                        R$ ${product.price || '0,00'}
                    </span>
                    <span class="product-date">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(product.createdAt)}
                    </span>
                </div>
            </div>
            <div class="product-status">
                <span class="status-badge ${stockLevelClass}">${stockLevel}</span>
                <span class="stock-quantity">${product.quantity} unidades</span>
            </div>
            <div class="product-actions">
                <button class="btn btn-sm btn-primary" onclick="editProduct('${product._id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm ${isEntradaTab ? 'btn-success' : 'btn-warning'}" 
                        onclick="${isEntradaTab ? 'openAddItemsModal' : 'withdrawProduct'}('${product._id}')" 
                        title="${isEntradaTab ? 'Adicionar itens' : 'Retirar'}" 
                        ${!isEntradaTab && product.quantity === 0 ? 'disabled' : ''}>
                    <i class="fas fa-${isEntradaTab ? 'plus' : 'minus'}"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    // Criar card de retirada
    function createWithdrawalCard(product) {
        const card = document.createElement('div');
        card.className = 'withdrawal-card';
        
        const stockLevel = getStockLevel(product.quantity, product.minQuantity);
        const stockLevelClass = stockLevel.toLowerCase().replace(' ', '-');
        
        card.innerHTML = `
            <div class="product-icon">
                ${product.photo ? 
                    `<img src="${product.photo}" alt="${product.name}">` : 
                    '<i class="fas fa-box"></i>'
                }
            </div>
            <div class="product-info">
                <h4>${product.name}</h4>
                <p class="product-category">${product.category || 'Sem categoria'}</p>
                <div class="product-details">
                    <span class="product-supplier">
                        <i class="fas fa-tag"></i>
                        ${product.supplier || 'Sem fornecedor'}
                    </span>
                    <span class="product-price">
                        <i class="fas fa-dollar-sign"></i>
                        R$ ${product.price || '0,00'}
                    </span>
                </div>
            </div>
            <div class="product-status">
                <span class="status-badge ${stockLevelClass}">${stockLevel}</span>
                <span class="stock-quantity">${product.quantity} unidades</span>
            </div>
            <div class="product-actions">
                <button class="btn btn-sm btn-warning" onclick="withdrawProduct('${product._id}')" title="Retirar" ${product.quantity === 0 ? 'disabled' : ''}>
                    <i class="fas fa-minus"></i> Retirar
                </button>
            </div>
        `;
        
        return card;
    }

    // Determinar nível de estoque
    function getStockLevel(quantity, minQuantity) {
        if (quantity === 0) return 'Sem Estoque';
        if (quantity <= minQuantity) return 'Estoque Baixo';
        return 'Em Estoque';
    }

    // Filtrar produtos
    function filterProducts(searchTerm) {
        filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.supplier && product.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        renderProducts();
    }

    // Filtrar produtos para retirada
    function filterWithdrawalProducts(searchTerm) {
        filteredWithdrawalProducts = products.filter(product => 
            product.quantity > 0 && (
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (product.supplier && product.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        );
        renderWithdrawalProducts();
    }

    // Alternar abas
    function switchTab(tabName) {
        // Remover active de todos os botões
        stockTabs.forEach(tab => tab.classList.remove('active'));
        
        // Adicionar active ao botão clicado
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Esconder todas as abas
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Mostrar aba correspondente
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Renderizar conteúdo específico da aba
        if (tabName === 'entrada') {
            renderProducts();
        } else if (tabName === 'saida') {
            renderWithdrawalProducts();
        } else if (tabName === 'historico') {
            renderHistory();
        }
    }

    // Abrir modal de produto
    function openProductModal(productId = null) {
        const modalTitle = document.getElementById('productModalTitle');
        const productIdInput = document.getElementById('productId');
        
        if (productId) {
            // Modo edição
            modalTitle.textContent = 'Editar Produto';
            productIdInput.value = productId;
            loadProductData(productId);
        } else {
            // Modo criação
            modalTitle.textContent = 'Novo Produto';
            productIdInput.value = '';
            productForm.reset();
            productPhotoPreview.innerHTML = '<i class="fas fa-image"></i><span>Digite o link da imagem</span>';
        }
        
        productModal.classList.add('show');
    }

    // Fechar modal de produto
    function closeProductModalFunc() {
        productModal.classList.remove('show');
    }

    // Carregar dados do produto para edição
    async function loadProductData(productId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const product = result.product || result;
                
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productQuantity').value = product.quantity || 0;
                document.getElementById('productMinQuantity').value = product.minQuantity || 0;
                document.getElementById('productPrice').value = product.price || 0;
                document.getElementById('productSupplier').value = product.supplier || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productStatus').value = product.status || 'active';
                
                // Atualizar preview da foto
                if (product.photo) {
                    productPhotoPreview.innerHTML = `<img src="${product.photo}" alt="Produto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    productPhotoUrl.value = product.photo;
                } else {
                    productPhotoPreview.innerHTML = '<i class="fas fa-image"></i><span>Digite o link da imagem</span>';
                    productPhotoUrl.value = '';
                }
            } else {
                showNotification('Erro ao carregar dados do produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            showNotification('Erro ao carregar dados do produto', 'error');
        }
    }

    // Salvar produto
    async function saveProductFunc() {
        const productId = document.getElementById('productId').value;
        
        // Coletar dados do formulário
        const productData = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value,
            quantity: parseInt(document.getElementById('productQuantity').value),
            minQuantity: parseInt(document.getElementById('productMinQuantity').value),
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            supplier: document.getElementById('productSupplier').value,
            status: document.getElementById('productStatus').value,
            photo: document.getElementById('productPhotoUrl').value
        };
        
        // Validar campos obrigatórios
        if (!productData.name || !productData.quantity || !productData.minQuantity) {
            showNotification('Nome, quantidade e quantidade mínima são obrigatórios', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const url = productId ? `/api/products/${productId}` : '/api/products';
            const method = productId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                closeProductModalFunc();
                loadProducts(); // Recarregar lista
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showNotification('Erro ao salvar produto', 'error');
        }
    }

    // Abrir modal de adicionar itens
    window.openAddItemsModal = function(productId) {
        const product = products.find(p => p._id === productId);
        if (!product) return;

        document.getElementById('addItemsProductId').value = productId;
        document.getElementById('addItemsProductName').textContent = product.name;
        document.getElementById('addItemsProductCategory').textContent = product.category || 'Sem categoria';
        document.getElementById('addItemsCurrentStock').textContent = product.quantity;
        
        // Atualizar foto do produto
        const photo = document.getElementById('addItemsProductPhoto');
        if (product.photo) {
            photo.src = product.photo;
            photo.style.display = 'block';
        } else {
            photo.style.display = 'none';
        }

        // Limpar campos
        document.getElementById('addItemsQuantity').value = '';
        document.getElementById('addItemsReason').value = '';
        document.getElementById('addItemsNotes').value = '';

        document.getElementById('addItemsModal').classList.add('show');
    }

    // Abrir modal de retirada
    function openWithdrawalModal(productId) {
        const product = products.find(p => p._id === productId);
        if (!product) return;

        document.getElementById('withdrawalProductId').value = productId;
        document.getElementById('withdrawalProductName').textContent = product.name;
        document.getElementById('withdrawalProductCategory').textContent = product.category || 'Sem categoria';
        document.getElementById('withdrawalCurrentStock').textContent = product.quantity;
        
        // Atualizar foto do produto
        const photo = document.getElementById('withdrawalProductPhoto');
        if (product.photo) {
            photo.src = product.photo;
            photo.style.display = 'block';
        } else {
            photo.style.display = 'none';
        }
        
        // Limpar formulário
        withdrawalForm.reset();
        document.getElementById('withdrawalQuantity').max = product.quantity;
        
        withdrawalModal.classList.add('show');
    }

    // Fechar modal de adicionar itens
    function closeAddItemsModalFunc() {
        addItemsModal.classList.remove('show');
    }

    // Confirmar adição de itens
    async function confirmAddItemsFunc() {
        const productId = document.getElementById('addItemsProductId').value;
        const quantity = parseInt(document.getElementById('addItemsQuantity').value);
        const reason = document.getElementById('addItemsReason').value;
        const notes = document.getElementById('addItemsNotes').value;

        if (!quantity || quantity <= 0) {
            showNotification('Quantidade deve ser maior que zero', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${productId}/add-items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quantity,
                    reason,
                    notes
                })
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                closeAddItemsModalFunc();
                loadProducts(); // Recarregar lista
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao adicionar itens:', error);
            showNotification('Erro ao adicionar itens', 'error');
        }
    }

    // Fechar modal de retirada
    function closeWithdrawalModalFunc() {
        withdrawalModal.classList.remove('show');
    }

    // Confirmar retirada
    async function confirmWithdrawalFunc() {
        const productId = document.getElementById('withdrawalProductId').value;
        const quantity = parseInt(document.getElementById('withdrawalQuantity').value);
        const reason = document.getElementById('withdrawalReason').value;
        const notes = document.getElementById('withdrawalNotes').value;

        if (!quantity || !reason) {
            showNotification('Quantidade e motivo são obrigatórios', 'error');
            return;
        }

        const product = products.find(p => p._id === productId);
        if (quantity > product.quantity) {
            showNotification('Quantidade solicitada maior que o estoque disponível', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/products/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId,
                    quantity,
                    reason,
                    notes
                })
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                closeWithdrawalModalFunc();
                loadProducts(); // Recarregar lista
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao retirar produto:', error);
            showNotification('Erro ao retirar produto', 'error');
        }
    }

    // Lidar com mudança de URL de foto
    function handlePhotoUrlChange(event) {
        const url = event.target.value.trim();
        
        if (url) {
            // Validar se é uma URL válida
            try {
                new URL(url);
                
                // Criar uma nova imagem para testar se carrega
                const img = new Image();
                img.onload = function() {
                    productPhotoPreview.innerHTML = `<img src="${url}" alt="Produto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                };
                img.onerror = function() {
                    productPhotoPreview.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Imagem não encontrada</span>';
                };
                img.src = url;
            } catch (error) {
                productPhotoPreview.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>URL inválida</span>';
            }
        } else {
            productPhotoPreview.innerHTML = '<i class="fas fa-image"></i><span>Digite o link da imagem</span>';
        }
    }

    // Atualizar gráfico
    function updateChart() {
        const ctx = document.getElementById('stockChart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (stockChart) {
            stockChart.destroy();
        }

        const productNames = products.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name);
        const quantities = products.map(p => p.quantity);
        const minQuantities = products.map(p => p.minQuantity);

        stockChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: productNames,
                datasets: [{
                    label: 'Quantidade em Estoque',
                    data: quantities,
                    backgroundColor: quantities.map((q, i) => {
                        if (q === 0) return 'rgba(231, 76, 60, 0.8)'; // Vermelho para sem estoque
                        if (q <= minQuantities[i]) return 'rgba(243, 156, 18, 0.8)'; // Laranja para estoque baixo
                        return 'rgba(39, 174, 96, 0.8)'; // Verde para em estoque
                    }),
                    borderColor: quantities.map((q, i) => {
                        if (q === 0) return 'rgba(231, 76, 60, 1)';
                        if (q <= minQuantities[i]) return 'rgba(243, 156, 18, 1)';
                        return 'rgba(39, 174, 96, 1)';
                    }),
                    borderWidth: 2
                }, {
                    label: 'Quantidade Mínima',
                    data: minQuantities,
                    type: 'line',
                    borderColor: 'rgba(151, 87, 86, 1)',
                    backgroundColor: 'rgba(151, 87, 86, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const product = products[context.dataIndex];
                                return [
                                    `Fornecedor: ${product.supplier || 'N/A'}`,
                                    `Preço: R$ ${product.price || '0,00'}`,
                                    `Status: ${product.status === 'active' ? 'Ativo' : 'Inativo'}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // Formatar data
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Expor funções globalmente
    window.editProduct = function(productId) {
        openProductModal(productId);
    };

    window.deleteProduct = async function(productId) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message, 'success');
                loadProducts(); // Recarregar lista
            } else {
                const error = await response.json();
                showNotification(error.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            showNotification('Erro ao deletar produto', 'error');
        }
    };

    window.withdrawProduct = function(productId) {
        openWithdrawalModal(productId);
    };
});
