/**
 * Service Worker - CH Studio
 * Cache de recursos estáticos para melhor performance
 */

const CACHE_NAME = 'ch-studio-v1.0.0';
const STATIC_CACHE = 'ch-studio-static-v1.0.0';
const DYNAMIC_CACHE = 'ch-studio-dynamic-v1.0.0';

// Recursos estáticos para cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/public-booking.html',
    '/styles/variables.css',
    '/styles/dashboard.css',
    '/styles/login.css',
    '/styles/public-booking.css',
    '/js/utils/common.js',
    '/js/utils/minify.js',
    '/js/utils/notifications.js',
    '/js/utils/validation.js',
    '/js/utils/loading.js',
    '/js/utils/cache.js',
    '/js/utils/logger.js',
    '/js/color-loader.js',
    '/js/login.js',
    '/js/dashboard.js',
    '/js/agenda.js',
    '/js/backup.js',
    '/js/professionals.js',
    '/js/services.js',
    '/js/stock.js',
    '/js/finance.js',
    '/js/whatsapp.js',
    '/js/public-booking.js',
    '/assets/Logo.png',
    '/assets/Favicon.png',
    '/assets/Background Login.png',
    '/assets/Background Dashboard.jpg',
    '/assets/LogoSiderBarAberta.png',
    '/assets/LogoSiderBarFechada.png',
    '/assets/default-avatar.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Cacheando recursos estáticos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Instalação concluída');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Erro na instalação:', error);
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Ativação concluída');
                return self.clients.claim();
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Estratégia de cache baseada no tipo de recurso
    if (request.method === 'GET') {
        if (isStaticAsset(request.url)) {
            // Cache First para recursos estáticos
            event.respondWith(cacheFirst(request));
        } else if (isApiRequest(request.url)) {
            // Network First para APIs
            event.respondWith(networkFirst(request));
        } else {
            // Stale While Revalidate para outros recursos
            event.respondWith(staleWhileRevalidate(request));
        }
    }
});

// Verificar se é recurso estático
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.includes(asset)) ||
           url.includes('/assets/') ||
           url.includes('/styles/') ||
           url.includes('/js/') ||
           url.endsWith('.css') ||
           url.endsWith('.js') ||
           url.endsWith('.png') ||
           url.endsWith('.jpg') ||
           url.endsWith('.jpeg') ||
           url.endsWith('.gif') ||
           url.endsWith('.svg');
}

// Verificar se é requisição de API
function isApiRequest(url) {
    return url.includes('/api/');
}

// Estratégia Cache First
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache First error:', error);
        return new Response('Recurso não disponível offline', { status: 503 });
    }
}

// Estratégia Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network First: Tentando cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Recurso não disponível offline', { status: 503 });
    }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('Stale While Revalidate: Erro na rede:', error);
    });
    
    return cachedResponse || fetchPromise;
}

// Limpar cache antigo periodicamente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAN_CACHE') {
        cleanOldCache();
    }
});

async function cleanOldCache() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => 
        name !== STATIC_CACHE && name !== DYNAMIC_CACHE
    );
    
    await Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
    );
    
    console.log('Service Worker: Cache antigo limpo');
}

// Notificar sobre atualizações
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
