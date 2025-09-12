class StockManager {
    constructor() {
        this.products = [];
        this.stats = {};
        this.chart = null;
        this.currentTab = 'entrada';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProducts();
        this.loadStats();
        this.initChart();
    }

    setupEventListeners() {
        // Botão adicionar produto
        const addBtn = document.getElementById('add-product-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openProductModal());
        }

        // Abas
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Modal de produto
        const productModal = document.getElementById('productModal');
        const closeProductModal = document.getElementById('closeProductModal');
        const cancelProduct = document.getElementById('cancelProduct');
        const productForm = document.getElementById('productForm');

        if (closeProductModal) {
            closeProductModal.addEventListener('click', () => this.closeProductModal());
        }

        if (cancelProduct) {
            cancelProduct.addEventListener('click', () => this.closeProductModal());
        }

        if (productForm) {
            productForm.addEventListener('click', (e) => this.saveProduct(e));
        }

        // Modal de entrada de estoque
        const stockEntryModal = document.getElementById('stockEntryModal');
        const closeStockEntryModal = document.getElementById('closeStockEntryModal');
        const cancelStockEntry = document.getElementById('cancelStockEntry');
        const stockEntryForm = document.getElementById('stockEntryForm');

        if (closeStockEntryModal) {
            closeStockEntryModal.addEventListener('click', () => this.closeStockEntryModal());
        }

        if (cancelStockEntry) {
            cancelStockEntry.addEventListener('click', () => this.closeStockEntryModal());
        }

        if (stockEntryForm) {
            stockEntryForm.addEventListener('click', (e) => this.saveStockEntry(e));
        }

        // Modal de saída de estoque
        const stockExitModal = document.getElementById('stockExitModal');
        const closeStockExitModal = document.getElementById('closeStockExitModal');
        const cancelStockExit = document.getElementById('cancelStockExit');
        const stockExitForm = document.getElementById('stockExitForm');

        if (closeStockExitModal) {
            closeStockExitModal.addEventListener('click', () => this.closeStockExitModal());
        }

        if (cancelStockExit) {
            cancelStockExit.addEventListener('click', () => this.closeStockExitModal());
        }

        if (stockExitForm) {
            stockExitForm.addEventListener('click', (e) => this.saveStockExit(e));
        }

        // Busca de produtos
        const productSearch = document.getElementById('product-search');
        if (productSearch) {
            productSearch.addEventListener('input', (e) => this.searchProducts(e.target.value));
        }

        const stockSearch = document.getElementById('stock-search');
        if (stockSearch) {
            stockSearch.addEventListener('input', (e) => this.searchStock(e.target.value));
        }

        // Upload de foto do produto
        const productPhoto = document.getElementById('productPhoto');
        if (productPhoto) {
            productPhoto.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }

        // Fechar modais clicando fora
        [productModal, stockEntryModal, stockExitModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeAllModals();
                    }
                });
            }
        });
    }

    // Trocar abas
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Atualizar botões das abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Atualizar conteúdo das abas
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Carregar dados específicos da aba
        if (tabName === 'saida') {
            this.loadStockForExit();
        }
    }

    // Abrir modal de produto
    openProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');
        const form = document.getElementById('productForm');

        if (product) {
            // Modo edição
            title.textContent = 'Editar Produto';
            this.fillProductForm(product);
        } else {
            // Modo criação
            title.textContent = 'Novo Produto';
            form.reset();
            this.resetPhotoPreview();
        }

        modal.classList.add('show');
    }

    // Fechar modal de produto
    closeProductModal() {
        const modal = document.getElementById('productModal');
        modal.classList.remove('show');
    }

    // Abrir modal de entrada de estoque
    openStockEntryModal(product) {
        const modal = document.getElementById('stockEntryModal');
        const productInfo = document.getElementById('stockEntryProductInfo');
        const productId = document.getElementById('stockEntryProductId');

        productId.value = product._id;
        productInfo.innerHTML = `
            <div class="product-photo">
                ${product.photo ? 
                    `<img src="${product.photo}" alt="${product.name}">` : 
                    `<i class="fas fa-image"></i>`
                }
            </div>
            <div class="product-details">
                <h4>${product.name}</h4>
                <p class="product-category">${product.category || 'Sem categoria'}</p>
                <div class="stock-info">Estoque atual: ${product.quantity} ${product.unit}</div>
            </div>
        `;

        modal.classList.add('show');
    }

    // Fechar modal de entrada de estoque
    closeStockEntryModal() {
        const modal = document.getElementById('stockEntryModal');
        modal.classList.remove('show');
    }

    // Abrir modal de saída de estoque
    openStockExitModal(product) {
        const modal = document.getElementById('stockExitModal');
        const productInfo = document.getElementById('stockExitProductInfo');
        const productId = document.getElementById('stockExitProductId');

        productId.value = product._id;
        productInfo.innerHTML = `
            <div class="product-photo">
                ${product.photo ? 
                    `<img src="${product.photo}" alt="${product.name}">` : 
                    `<i class="fas fa-image"></i>`
                }
            </div>
            <div class="product-details">
                <h4>${product.name}</h4>
                <p class="product-category">${product.category || 'Sem categoria'}</p>
                <div class="stock-info">Estoque atual: ${product.quantity} ${product.unit}</div>
            </div>
        `;

        modal.classList.add('show');
    }

    // Fechar modal de saída de estoque
    closeStockExitModal() {
        const modal = document.getElementById('stockExitModal');
        modal.classList.remove('show');
    }

    // Fechar todos os modais
    closeAllModals() {
        this.closeProductModal();
        this.closeStockEntryModal();
        this.closeStockExitModal();
    }

    // Preencher formulário de produto para edição
    fillProductForm(product) {
        document.getElementById('productId').value = product._id || '';
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productQuantity').value = product.quantity || 0;
        document.getElementById('productUnit').value = product.unit || 'unidade';
        document.getElementById('productMinQuantity').value = product.minQuantity || 0;
        document.getElementById('productMaxQuantity').value = product.maxQuantity || 1000;
        document.getElementById('productStatus').value = product.status || 'active';

        // Atualizar preview da foto
        if (product.photo) {
            const preview = document.getElementById('productPhotoPreview');
            preview.innerHTML = `<img src="${product.photo}" alt="${product.name}">`;
        } else {
            this.resetPhotoPreview();
        }
    }

    // Resetar preview da foto
    resetPhotoPreview() {
        const preview = document.getElementById('productPhotoPreview');
        preview.innerHTML = `
            <i class="fas fa-image"></i>
            <span>Clique para adicionar foto</span>
        `;
    }

    // Lidar com upload de foto
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('productPhotoPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // Salvar produto
    async saveProduct(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const productId = formData.get('id');
        const isEdit = productId !== '';

        try {
            const token = localStorage.getItem('authToken');
            const url = isEdit ? `/api/products/${productId}` : '/api/products';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.closeProductModal();
                this.loadProducts();
                this.loadStats();
                this.updateChart();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            this.showNotification('Erro ao salvar produto', 'error');
        }
    }

    // Salvar entrada de estoque
    async saveStockEntry(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const productId = formData.get('productId');
        const amount = formData.get('amount');
        const reason = formData.get('reason');

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${productId}/add-stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: parseInt(amount), reason })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.closeStockEntryModal();
                this.loadProducts();
                this.loadStats();
                this.updateChart();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao adicionar estoque:', error);
            this.showNotification('Erro ao adicionar estoque', 'error');
        }
    }

    // Salvar saída de estoque
    async saveStockExit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const productId = formData.get('productId');
        const amount = formData.get('amount');
        const reason = formData.get('reason');

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${productId}/remove-stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: parseInt(amount), reason })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.closeStockExitModal();
                this.loadProducts();
                this.loadStats();
                this.updateChart();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao remover estoque:', error);
            this.showNotification('Erro ao remover estoque', 'error');
        }
    }

    // Carregar produtos
    async loadProducts() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/products', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.products = data.products || [];
                this.renderProducts();
                this.updateStats();
            } else {
                console.error('Erro ao carregar produtos');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    // Carregar estatísticas
    async loadStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/products/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats || {};
                this.updateStats();
            } else {
                console.error('Erro ao carregar estatísticas');
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Carregar produtos para saída
    loadStockForExit() {
        this.renderStockForExit();
    }

    // Renderizar lista de produtos
    renderProducts(products = this.products) {
        const container = document.getElementById('products-list');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Adicione o primeiro produto para começar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product._id}">
                <div class="product-header">
                    <div class="product-photo">
                        ${product.photo ? 
                            `<img src="${product.photo}" alt="${product.name}">` : 
                            `<i class="fas fa-image"></i>`
                        }
                    </div>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="product-category">${product.category || 'Sem categoria'}</p>
                        <p class="product-description">${product.description || 'Sem descrição'}</p>
                    </div>
                    <div class="product-status">
                        <span class="status-badge status-${this.getStockStatus(product)}">
                            ${this.getStockStatusText(product)}
                        </span>
                    </div>
                </div>

                <div class="product-details">
                    <div class="product-detail">
                        <div class="product-detail-label">Quantidade</div>
                        <div class="product-detail-value">
                            <i class="fas fa-boxes"></i>
                            ${product.quantity} ${product.unit}
                        </div>
                    </div>
                    <div class="product-detail">
                        <div class="product-detail-label">Mínimo</div>
                        <div class="product-detail-value">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${product.minQuantity || 0}
                        </div>
                    </div>
                    <div class="product-detail">
                        <div class="product-detail-label">Máximo</div>
                        <div class="product-detail-value">
                            <i class="fas fa-arrow-up"></i>
                            ${product.maxQuantity || 1000}
                        </div>
                    </div>
                    <div class="product-detail">
                        <div class="product-detail-label">Status</div>
                        <div class="product-detail-value">
                            <i class="fas fa-${product.status === 'active' ? 'check' : 'times'}-circle"></i>
                            ${product.status === 'active' ? 'Ativo' : 'Inativo'}
                        </div>
                    </div>
                </div>

                <div class="product-actions">
                    <button class="btn btn-success" onclick="stockManager.openStockEntryModal('${product._id}')">
                        <i class="fas fa-plus"></i>
                        Adicionar
                    </button>
                    <button class="btn btn-warning" onclick="stockManager.openStockExitModal('${product._id}')">
                        <i class="fas fa-minus"></i>
                        Retirar
                    </button>
                    <button class="btn btn-primary" onclick="stockManager.editProduct('${product._id}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="stockManager.deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Renderizar lista de produtos para saída
    renderStockForExit(products = this.products.filter(p => p.quantity > 0)) {
        const container = document.getElementById('stock-list');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <h3>Nenhum produto disponível</h3>
                    <p>Não há produtos com estoque para retirar.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product._id}">
                <div class="product-header">
                    <div class="product-photo">
                        ${product.photo ? 
                            `<img src="${product.photo}" alt="${product.name}">` : 
                            `<i class="fas fa-image"></i>`
                        }
                    </div>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p class="product-category">${product.category || 'Sem categoria'}</p>
                        <p class="product-description">${product.description || 'Sem descrição'}</p>
                    </div>
                    <div class="product-status">
                        <span class="status-badge status-${this.getStockStatus(product)}">
                            ${this.getStockStatusText(product)}
                        </span>
                    </div>
                </div>

                <div class="product-details">
                    <div class="product-detail">
                        <div class="product-detail-label">Disponível</div>
                        <div class="product-detail-value">
                            <i class="fas fa-boxes"></i>
                            ${product.quantity} ${product.unit}
                        </div>
                    </div>
                    <div class="product-detail">
                        <div class="product-detail-label">Mínimo</div>
                        <div class="product-detail-value">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${product.minQuantity || 0}
                        </div>
                    </div>
                </div>

                <div class="product-actions">
                    <button class="btn btn-warning" onclick="stockManager.openStockExitModal('${product._id}')">
                        <i class="fas fa-minus"></i>
                        Retirar Estoque
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Buscar produtos
    searchProducts(query) {
        const filtered = this.products.filter(product => {
            const name = product.name.toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const searchQuery = query.toLowerCase();
            
            return name.includes(searchQuery) || 
                   category.includes(searchQuery) || 
                   description.includes(searchQuery);
        });
        
        this.renderProducts(filtered);
    }

    // Buscar produtos para saída
    searchStock(query) {
        const availableProducts = this.products.filter(p => p.quantity > 0);
        const filtered = availableProducts.filter(product => {
            const name = product.name.toLowerCase();
            const category = (product.category || '').toLowerCase();
            const description = (product.description || '').toLowerCase();
            const searchQuery = query.toLowerCase();
            
            return name.includes(searchQuery) || 
                   category.includes(searchQuery) || 
                   description.includes(searchQuery);
        });
        
        this.renderStockForExit(filtered);
    }

    // Editar produto
    editProduct(id) {
        const product = this.products.find(p => p._id === id);
        if (product) {
            this.openProductModal(product);
        }
    }

    // Excluir produto
    async deleteProduct(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(result.message, 'success');
                this.loadProducts();
                this.loadStats();
                this.updateChart();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            this.showNotification('Erro ao excluir produto', 'error');
        }
    }

    // Abrir modal de entrada de estoque
    openStockEntryModal(id) {
        const product = this.products.find(p => p._id === id);
        if (product) {
            this.openStockEntryModal(product);
        }
    }

    // Abrir modal de saída de estoque
    openStockExitModal(id) {
        const product = this.products.find(p => p._id === id);
        if (product) {
            this.openStockExitModal(product);
        }
    }

    // Atualizar estatísticas
    updateStats() {
        const total = this.products.length;
        const active = this.products.filter(p => p.status === 'active').length;
        const lowStock = this.products.filter(p => p.quantity <= (p.minQuantity || 0) && p.quantity > 0).length;
        const outOfStock = this.products.filter(p => p.quantity <= 0).length;

        document.getElementById('total-products').textContent = total;
        document.getElementById('active-products').textContent = active;
        document.getElementById('low-stock-products').textContent = lowStock;
        document.getElementById('out-of-stock-products').textContent = outOfStock;
    }

    // Obter status do estoque
    getStockStatus(product) {
        if (product.quantity <= 0) {
            return 'out-of-stock';
        } else if (product.quantity <= (product.minQuantity || 0)) {
            return 'low-stock';
        } else if (product.quantity >= (product.maxQuantity || 1000)) {
            return 'overstock';
        }
        return 'normal';
    }

    // Obter texto do status do estoque
    getStockStatusText(product) {
        const status = this.getStockStatus(product);
        const statusMap = {
            'out-of-stock': 'Sem Estoque',
            'low-stock': 'Estoque Baixo',
            'normal': 'Normal',
            'overstock': 'Estoque Alto'
        };
        return statusMap[status] || 'Desconhecido';
    }

    // Inicializar gráfico
    initChart() {
        const ctx = document.getElementById('stockChart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Quantidade em Estoque',
                    data: [],
                    backgroundColor: 'rgba(151, 87, 86, 0.8)',
                    borderColor: 'rgba(151, 87, 86, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#975756',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Estoque: ${context.parsed.y} unidades`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(151, 87, 86, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#7f8c8d',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#7f8c8d',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            maxRotation: 45
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        this.updateChart();
    }

    // Atualizar gráfico
    updateChart() {
        if (!this.chart) return;

        // Pegar os 10 produtos com maior estoque
        const topProducts = this.products
            .filter(p => p.status === 'active')
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        this.chart.data.labels = topProducts.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name);
        this.chart.data.datasets[0].data = topProducts.map(p => p.quantity);

        // Atualizar cores baseadas no status
        this.chart.data.datasets[0].backgroundColor = topProducts.map(p => {
            const status = this.getStockStatus(p);
            const colorMap = {
                'out-of-stock': 'rgba(231, 76, 60, 0.8)',
                'low-stock': 'rgba(243, 156, 18, 0.8)',
                'normal': 'rgba(39, 174, 96, 0.8)',
                'overstock': 'rgba(52, 152, 219, 0.8)'
            };
            return colorMap[status] || 'rgba(151, 87, 86, 0.8)';
        });

        this.chart.data.datasets[0].borderColor = topProducts.map(p => {
            const status = this.getStockStatus(p);
            const colorMap = {
                'out-of-stock': 'rgba(231, 76, 60, 1)',
                'low-stock': 'rgba(243, 156, 18, 1)',
                'normal': 'rgba(39, 174, 96, 1)',
                'overstock': 'rgba(52, 152, 219, 1)'
            };
            return colorMap[status] || 'rgba(151, 87, 86, 1)';
        });

        this.chart.update();
    }

    // Mostrar notificação
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.stockManager = new StockManager();
});
