// Lokální databáze pro služby (bez Firebase)
let localServices = [];
let filteredServices = [];

// Inicializace lokální databáze
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializace lokální databáze...');
    initLocalServices();
    setupEventListeners();
});

// Inicializace lokálních služeb
function initLocalServices() {
    // Načtení služeb z localStorage nebo vytvoření testovacích
    const savedServices = localStorage.getItem('inzerio-services');
    
    if (savedServices) {
        localServices = JSON.parse(savedServices);
        console.log('Načteny služby z localStorage:', localServices.length);
    } else {
        console.log('Žádné uložené služby, vytvářím testovací...');
        createTestServices();
    }
    
    filteredServices = [...localServices];
    displayServices();
    updateStats();
    updateConnectionStatus(true); // Lokální DB je vždy dostupná
}

// Vytvoření testovacích služeb
function createTestServices() {
    localServices = [
        {
            id: '1',
            title: "Oprava počítačů a notebooků",
            category: "it",
            description: "Profesionální oprava počítačů, notebooků a tabletů. Diagnostika problémů, výměna komponentů, instalace operačních systémů. Rychlé a spolehlivé služby.",
            price: "500 Kč/hod",
            location: "Praha",
            userId: "test-user-1",
            userEmail: "opravy@example.com",
            createdAt: new Date(),
            status: "active"
        },
        {
            id: '2',
            title: "Instalace nábytku",
            category: "technical",
            description: "Montáž a instalace nábytku všech typů. IKEA nábytek, kuchyňské linky, skříně, postele. Zkušený montér s vlastním nářadím.",
            price: "800 Kč/hod",
            location: "Brno",
            userId: "test-user-2",
            userEmail: "montaz@example.com",
            createdAt: new Date(),
            status: "active"
        },
        {
            id: '3',
            title: "Doučování matematiky",
            category: "education",
            description: "Doučování matematiky pro základní a střední školy. Příprava na přijímací zkoušky, maturitu. Individuální přístup, trpělivost.",
            price: "400 Kč/hod",
            location: "Ostrava",
            userId: "test-user-3",
            userEmail: "doucovani@example.com",
            createdAt: new Date(),
            status: "active"
        },
        {
            id: '4',
            title: "Grafický design",
            category: "design",
            description: "Tvorba log, vizitek, bannerů, letáků. Branding a corporate identity. Moderní design, rychlé dodání, konkurenční ceny.",
            price: "1200 Kč/projekt",
            location: "Plzeň",
            userId: "test-user-4",
            userEmail: "design@example.com",
            createdAt: new Date(),
            status: "active"
        },
        {
            id: '5',
            title: "Úklidové služby",
            category: "home",
            description: "Profesionální úklid domácností a kanceláří. Jednorázový i pravidelný úklid. Ekologické prostředky, spolehlivost.",
            price: "300 Kč/hod",
            location: "České Budějovice",
            userId: "test-user-5",
            userEmail: "uklid@example.com",
            createdAt: new Date(),
            status: "active"
        },
        {
            id: '6',
            title: "Stěhování",
            category: "transport",
            description: "Kompletní stěhovací služby. Stěhování bytů, domů, kanceláří. Zabalené služby, pojištění, rychlé a šetrné stěhování.",
            price: "1500 Kč/hod",
            location: "Liberec",
            userId: "test-user-6",
            userEmail: "stehovani@example.com",
            createdAt: new Date(),
            status: "active"
        }
    ];
    
    saveServicesToLocalStorage();
}

// Uložení služeb do localStorage
function saveServicesToLocalStorage() {
    localStorage.setItem('inzerio-services', JSON.stringify(localServices));
    console.log('Služby uloženy do localStorage');
}

// Zobrazení služeb v gridu
function displayServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    const noServices = document.getElementById('noServices');
    
    if (filteredServices.length === 0) {
        servicesGrid.innerHTML = '';
        noServices.style.display = 'block';
        return;
    }
    
    noServices.style.display = 'none';
    
    servicesGrid.innerHTML = filteredServices.map(service => `
        <div class="service-item" data-category="${service.category}">
            <div class="service-item-header">
                <h3 class="service-title">${service.title}</h3>
                <span class="service-category">${getCategoryName(service.category)}</span>
            </div>
            <div class="service-content">
                <p class="service-description">${service.description}</p>
                <div class="service-details">
                    <div class="service-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${service.location}</span>
                    </div>
                    ${service.price ? `
                    <div class="service-detail">
                        <i class="fas fa-tag"></i>
                        <span>${service.price}</span>
                    </div>
                    ` : ''}
                    <div class="service-detail">
                        <i class="fas fa-user"></i>
                        <span>${service.userEmail}</span>
                    </div>
                    <div class="service-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(service.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-primary" onclick="contactService('${service.id}')">
                    <i class="fas fa-envelope"></i> Kontaktovat
                </button>
                <button class="btn btn-outline" onclick="showServiceDetails('${service.id}')">
                    <i class="fas fa-info-circle"></i> Více info
                </button>
            </div>
        </div>
    `).join('');
}

// Získání názvu kategorie
function getCategoryName(category) {
    const categories = {
        'technical': 'Technické služby',
        'it': 'IT služby',
        'design': 'Design a kreativita',
        'education': 'Vzdělávání',
        'home': 'Domácí služby',
        'transport': 'Doprava a logistika'
    };
    return categories[category] || category;
}

// Formátování data
function formatDate(date) {
    if (!date) return 'Neznámé datum';
    
    const now = new Date();
    const serviceDate = date instanceof Date ? date : new Date(date);
    const diffTime = Math.abs(now - serviceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Včera';
    if (diffDays < 7) return `Před ${diffDays} dny`;
    if (diffDays < 30) return `Před ${Math.ceil(diffDays / 7)} týdny`;
    return serviceDate.toLocaleDateString('cs-CZ');
}

// Aktualizace statistik
function updateStats() {
    document.getElementById('totalServices').textContent = localServices.length;
    document.getElementById('activeServices').textContent = filteredServices.length;
}

// Aktualizace stavu připojení
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        const icon = statusElement.querySelector('i');
        if (isConnected) {
            icon.style.color = '#28a745';
            icon.title = 'Lokální databáze aktivní';
        } else {
            icon.style.color = '#dc3545';
            icon.title = 'Databáze nedostupná';
        }
    }
}

// Nastavení event listenerů
function setupEventListeners() {
    // Vyhledávání
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterServices);
    }
    
    // Filtrování podle kategorie
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterServices);
    }
    
    // Řazení
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', sortServices);
    }
}

// Filtrování služeb
function filterServices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    filteredServices = localServices.filter(service => {
        const matchesSearch = service.title.toLowerCase().includes(searchTerm) ||
                             service.description.toLowerCase().includes(searchTerm) ||
                             service.location.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || service.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    displayServices();
    updateStats();
}

// Řazení služeb
function sortServices() {
    const sortBy = document.getElementById('sortSelect').value;
    
    filteredServices.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'price-low':
                return extractPrice(a.price) - extractPrice(b.price);
            case 'price-high':
                return extractPrice(b.price) - extractPrice(a.price);
            default:
                return 0;
        }
    });
    
    displayServices();
}

// Extrakce ceny z textu
function extractPrice(priceText) {
    if (!priceText) return 0;
    const match = priceText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// Kontaktování služby
function contactService(serviceId) {
    const service = localServices.find(s => s.id === serviceId);
    if (!service) return;
    
    // Zde byste mohli implementovat kontaktní formulář nebo přesměrování na email
    const emailSubject = `Dotaz k službě: ${service.title}`;
    const emailBody = `Dobrý den,\n\nzajímá mě vaše služba "${service.title}".\n\nPopis: ${service.description}\n\nDěkuji za odpověď.`;
    
    const mailtoLink = `mailto:${service.userEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
}

// Zobrazení detailů služby
function showServiceDetails(serviceId) {
    const service = localServices.find(s => s.id === serviceId);
    if (!service) return;
    
    // Vytvoření modalu s detaily služby
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content service-details-modal">
            <div class="modal-header">
                <h2>${service.title}</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="service-details-content">
                <div class="service-detail-section">
                    <h3>Popis služby</h3>
                    <p>${service.description}</p>
                </div>
                <div class="service-detail-section">
                    <h3>Detaily</h3>
                    <div class="service-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Lokalita:</strong> ${service.location}</span>
                        </div>
                        ${service.price ? `
                        <div class="detail-item">
                            <i class="fas fa-tag"></i>
                            <span><strong>Cena:</strong> ${service.price}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <span><strong>Poskytovatel:</strong> ${service.userEmail}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span><strong>Přidáno:</strong> ${formatDate(service.createdAt)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tags"></i>
                            <span><strong>Kategorie:</strong> ${getCategoryName(service.category)}</span>
                        </div>
                    </div>
                </div>
                <div class="service-actions">
                    <button class="btn btn-primary" onclick="contactService('${service.id}'); this.closest('.modal').remove();">
                        <i class="fas fa-envelope"></i> Kontaktovat
                    </button>
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        Zavřít
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Zavření při kliknutí mimo modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });
}

// Přidání nové služby
function addService(serviceData) {
    const newService = {
        id: Date.now().toString(),
        ...serviceData,
        userId: 'local-user',
        userEmail: 'local@example.com',
        createdAt: new Date(),
        status: 'active'
    };
    
    localServices.unshift(newService);
    filteredServices = [...localServices];
    saveServicesToLocalStorage();
    displayServices();
    updateStats();
    
    console.log('Nová služba přidána:', newService);
}

// Přidání testovacích služeb
function addTestServices() {
    createTestServices();
    filteredServices = [...localServices];
    displayServices();
    updateStats();
    console.log('Testovací služby přidány');
}

// Test připojení (vždy úspěšný pro lokální DB)
function testFirebaseConnection() {
    console.log('Test lokální databáze - vždy úspěšný');
    updateConnectionStatus(true);
    return true;
}

// Export funkcí pro globální použití
window.contactService = contactService;
window.showServiceDetails = showServiceDetails;
window.addTestServices = addTestServices;
window.testFirebaseConnection = testFirebaseConnection;
window.addService = addService;
