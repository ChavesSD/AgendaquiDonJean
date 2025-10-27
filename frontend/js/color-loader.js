// ===== CARREGADOR DE CORES PERSONALIZADAS =====
// Este script carrega as cores personalizadas do sistema para páginas que não têm acesso ao dashboard

// Carregar cores salvas do localStorage
function loadCustomColors() {
    console.log('🎨 Carregando cores personalizadas...');
    
    const savedColors = JSON.parse(localStorage.getItem('systemColors') || '{}');
    
    // Aplicar cores se existirem
    if (savedColors.primary) {
        document.documentElement.style.setProperty('--primary-color', savedColors.primary);
        applyColorVariations(savedColors.primary, 'primary');
    }
    
    if (savedColors.secondary) {
        document.documentElement.style.setProperty('--secondary-color', savedColors.secondary);
        applyColorVariations(savedColors.secondary, 'secondary');
    }
    
    if (savedColors.success) {
        document.documentElement.style.setProperty('--success-color', savedColors.success);
    }
    
    if (savedColors.warning) {
        document.documentElement.style.setProperty('--warning-color', savedColors.warning);
    }
    
    if (savedColors.danger) {
        document.documentElement.style.setProperty('--danger-color', savedColors.danger);
    }
    
    if (savedColors.info) {
        document.documentElement.style.setProperty('--info-color', savedColors.info);
    }
    
    if (savedColors.light) {
        document.documentElement.style.setProperty('--light-color', savedColors.light);
    }
    
    if (savedColors.dark) {
        document.documentElement.style.setProperty('--dark-color', savedColors.dark);
    }
    
    console.log('✅ Cores personalizadas carregadas com sucesso!');
}

// Aplicar variações de opacidade para uma cor
function applyColorVariations(color, type) {
    if (!color) return;
    
    // Converter hex para RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Aplicar variações de opacidade
    const variations = [
        { suffix: '05', opacity: 0.05 },
        { suffix: '10', opacity: 0.1 },
        { suffix: '15', opacity: 0.15 },
        { suffix: '20', opacity: 0.2 },
        { suffix: '30', opacity: 0.3 },
        { suffix: '40', opacity: 0.4 },
        { suffix: '50', opacity: 0.5 }
    ];
    
    variations.forEach(variation => {
        const rgba = `rgba(${r}, ${g}, ${b}, ${variation.opacity})`;
        document.documentElement.style.setProperty(`--${type}-color-${variation.suffix}`, rgba);
    });
}

// Carregar cores quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadCustomColors();
});

// Também carregar quando a página estiver totalmente carregada
window.addEventListener('load', function() {
    loadCustomColors();
});

// Escutar mudanças no localStorage (para quando as cores são alteradas no dashboard)
window.addEventListener('storage', function(e) {
    if (e.key === 'systemColors') {
        console.log('🔄 Cores atualizadas, recarregando...');
        loadCustomColors();
    }
});
