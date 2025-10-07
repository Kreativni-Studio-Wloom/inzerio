// My Ads JavaScript - Správa vlastních inzerátů

let userAds = [];
let currentEditingAdId = null;

// Inicializace po načtení Firebase
document.addEventListener('DOMContentLoaded', () => {
    console.log('My Ads DOMContentLoaded');
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
            console.log('Firebase nalezen v My Ads, inicializuji');
            initMyAds();
            clearInterval(checkFirebase);
        } else {
            console.log('Čekám na Firebase v My Ads...');
        }
    }, 100);
});

// Inicializace stránky
function initMyAds() {
    console.log('Inicializuji My Ads stránku');
    // Import Firebase funkcí dynamicky
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
        console.log('Firebase Auth importován');
        // Sledování stavu přihlášení
        onAuthStateChanged(window.firebaseAuth, (user) => {
            console.log('Auth state changed:', user);
            if (user) {
                console.log('Uživatel přihlášen, načítám UI a inzeráty');
                updateUI(user);
                loadUserAds();
                // Spustit periodickou kontrolu expirace TOP inzerátů
                startTopExpirationCheck();
            } else {
                console.log('Uživatel není přihlášen, přesměrovávám');
                // Zastavit periodickou kontrolu při odhlášení
                stopTopExpirationCheck();
                // Přesměrovat na přihlášení, pokud není uživatel přihlášen
                window.location.href = 'index.html';
            }
        });
    });

    // Event listenery pro filtry a vyhledávání
    setupEventListeners();
}

// Aktualizace UI podle stavu přihlášení
function updateUI(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const userInfo = document.querySelector('.user-info');
    
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            
            // Zobrazit email v navbaru
            const userNameSpan = userInfo.querySelector('.user-name');
            if (userNameSpan) {
                userNameSpan.textContent = user.email;
            }
            
            // Zobrazit jméno a email v dropdown menu
            const displayName = userInfo.querySelector('.user-display-name');
            const userEmail = userInfo.querySelector('.user-email');
            
            if (displayName && userEmail) {
                loadUserProfile(user.uid).then(userProfile => {
                    if (userProfile && userProfile.name) {
                        displayName.textContent = userProfile.name;
                    } else {
                        const emailName = user.email.split('@')[0];
                        displayName.textContent = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                    }
                    
                    // Zobrazit zůstatek
                    const balanceAmount = document.querySelector('.balance-amount');
                    if (balanceAmount && userProfile) {
                        const balance = userProfile.balance || 0;
                        balanceAmount.textContent = `${balance.toLocaleString('cs-CZ')} Kč`;
                    }
                });
                userEmail.textContent = user.email;
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// Načtení uživatelského profilu z Firestore (users/{uid}/profile/profile)
async function loadUserProfile(uid) {
    try {
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const profileRef = doc(window.firebaseDb, 'users', uid, 'profile', 'profile');
        const snap = await getDoc(profileRef);
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Chyba při načítání uživatelského profilu:', error);
        return null;
    }
}

// Načtení vlastních inzerátů uživatele
async function loadUserAds() {
    try {
        const currentUser = window.firebaseAuth.currentUser;
        console.log('Načítám inzeráty pro uživatele:', currentUser?.uid);
        if (!currentUser) {
            console.log('Uživatel není přihlášen');
            return;
        }

        const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Nejdříve zkontrolovat a zrušit expirované TOP inzeráty
        await checkAndExpireTopAds();
        
        const adsCollection = collection(window.firebaseDb, 'users', currentUser.uid, 'inzeraty');
        console.log('Provádím dotaz na Firestore (users/{uid}/inzeraty)...');
        const querySnapshot = await getDocs(adsCollection);
        console.log('Dotaz dokončen, počet dokumentů:', querySnapshot.size);
        
        userAds = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Načtený inzerát:', doc.id, data);
            userAds.push({ id: doc.id, ...data });
        });
        
        // Seřadit podle data vytvoření (nejnovější první)
        userAds.sort((a, b) => {
            const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt);
            const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt);
            return dateB - dateA;
        });
        
        console.log('Celkem načteno inzerátů:', userAds.length);
        updateStats();
        displayAds(userAds);
        
    } catch (error) {
        console.error('Chyba při načítání inzerátů:', error);
        showError('Nepodařilo se načíst vaše inzeráty: ' + error.message);
    }
}

// Aktualizace statistik
function updateStats() {
    const totalAds = userAds.length;
    const activeAds = userAds.filter(ad => ad.status === 'active').length;
    
    document.getElementById('totalAds').textContent = totalAds;
    document.getElementById('activeAds').textContent = activeAds;
}

// Zobrazení inzerátů
function displayAds(ads) {
    const grid = document.getElementById('myAdsGrid');
    
    if (ads.length === 0) {
        grid.innerHTML = `
            <div class="no-services">
                <i class="fas fa-plus-circle"></i>
                <h3>Zatím nemáte žádné inzeráty</h3>
                <p>Začněte tím, že přidáte svou první službu!</p>
                <div class="no-services-actions">
                    <a href="index.html" class="btn btn-primary">Přidat službu</a>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = ads.map(ad => createAdCard(ad)).join('');
}

// Vytvoření karty inzerátu
function createAdCard(ad) {
    const categoryNames = {
        'technical': 'Technické služby',
        'it': 'IT služby',
        'design': 'Design a kreativita',
        'education': 'Vzdělávání',
        'home': 'Domácí služby',
        'transport': 'Doprava a logistika'
    };
    
    const statusColors = {
        'active': '#28a745',
        'inactive': '#dc3545',
        'paused': '#ffc107'
    };
    
    const statusTexts = {
        'active': 'Aktivní',
        'inactive': 'Neaktivní',
        'paused': 'Pozastaveno'
    };
    
    return `
        <div class="service-item${ad.isTop ? ' top' : ''}">
            <div class="service-item-header">
                <div class="service-title">${ad.title}</div>
                <div class="service-category">${categoryNames[ad.category] || ad.category}</div>
                ${ad.isTop ? `<div class="top-badge"><i class="fas fa-crown"></i> TOP ${getTopTimeRemaining(ad)}</div>` : ''}
                <div class="service-status" style="background-color: ${statusColors[ad.status]}; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-top: 0.5rem;">
                    ${statusTexts[ad.status] || ad.status}
                </div>
            </div>
            <div class="service-content">
                <div class="service-description">${ad.description}</div>
                <div class="service-details">
                    <div class="service-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${ad.location}</span>
                    </div>
                    ${ad.price ? `
                    <div class="service-detail">
                        <i class="fas fa-tag"></i>
                        <span>${ad.price}</span>
                    </div>
                    ` : ''}
                    <div class="service-detail">
                        <i class="fas fa-eye"></i>
                        <span>${ad.views || 0} zobrazení</span>
                    </div>
                    <div class="service-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Vytvořeno: ${new Date(ad.createdAt?.toDate?.() || ad.createdAt).toLocaleDateString('cs-CZ')}</span>
                    </div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-outline" onclick="editAd('${ad.id}')">
                    <i class="fas fa-edit"></i> Upravit
                </button>
                <button class="btn btn-outline" onclick="toggleAdStatus('${ad.id}', '${ad.status}')">
                    <i class="fas fa-${ad.status === 'active' ? 'pause' : 'play'}"></i> 
                    ${ad.status === 'active' ? 'Pozastavit' : 'Aktivovat'}
                </button>
                ${ad.isTop ? '' : `<button class="btn btn-outline btn-top" onclick="purchaseTop('${ad.id}')">
                    <i class="fas fa-star"></i> TOP za 500 Kč
                </button>`}
                <button class="btn btn-outline" onclick="deleteAd('${ad.id}')" style="color: #dc3545;">
                    <i class="fas fa-trash"></i> Smazat
                </button>
            </div>
        </div>
    `;
}

// Nastavení event listenerů
function setupEventListeners() {
    // Vyhledávání
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterAds);
    }
    
    // Filtry
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAds);
    }
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', sortAds);
    }
    
    // Edit service form
    const editServiceForm = document.getElementById('editServiceForm');
    if (editServiceForm) {
        console.log('Edit service form nalezen, nastavuji event listener');
        editServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Edit service form odeslán');
            await updateAd();
        });
    } else {
        console.log('Edit service form NENALEZEN');
    }
}

// Filtrování inzerátů
function filterAds() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredAds = userAds.filter(ad => {
        const matchesSearch = ad.title.toLowerCase().includes(searchTerm) || 
                             ad.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || ad.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    // TOP inzeráty vždy první
    filteredAds.sort((a, b) => {
        if (a.isTop && !b.isTop) return -1;
        if (!a.isTop && b.isTop) return 1;
        return 0;
    });
    displayAds(filteredAds);
}

// Řazení inzerátů
function sortAds() {
    const sortBy = document.getElementById('sortSelect').value;
    let sortedAds = [...userAds];
    
    switch (sortBy) {
        case 'newest':
            sortedAds.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
            break;
        case 'oldest':
            sortedAds.sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
            break;
        case 'title':
            sortedAds.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    // TOP inzeráty vždy první bez ohledu na vybrané řazení
    sortedAds.sort((a, b) => {
        if (a.isTop && !b.isTop) return -1;
        if (!a.isTop && b.isTop) return 1;
        return 0;
    });
    displayAds(sortedAds);
}

// Funkce pro získání zbývajícího času TOP
function getTopTimeRemaining(ad) {
    if (!ad.isTop || !ad.topExpiresAt) return '';
    
    const expiresAt = ad.topExpiresAt.toDate ? ad.topExpiresAt.toDate() : new Date(ad.topExpiresAt);
    const now = new Date();
    const remainingMs = expiresAt - now;
    
    if (remainingMs <= 0) return '(vypršel)';
    
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return `(${remainingMinutes}min)`;
}

// Kontrola a automatické zrušení expirovaných TOP inzerátů
async function checkAndExpireTopAds() {
    try {
        const currentUser = window.firebaseAuth.currentUser;
        if (!currentUser) return;
        
        const { getDocs, collection, updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst všechny inzeráty uživatele
        const adsRef = collection(window.firebaseDb, 'users', currentUser.uid, 'inzeraty');
        const adsSnapshot = await getDocs(adsRef);
        
        const now = new Date();
        let expiredCount = 0;
        
        for (const adDoc of adsSnapshot.docs) {
            const adData = adDoc.data();
            
            // Kontrola zda je TOP a má čas expirace
            if (adData.isTop && adData.topExpiresAt) {
                const expiresAt = adData.topExpiresAt.toDate ? adData.topExpiresAt.toDate() : new Date(adData.topExpiresAt);
                
                if (now > expiresAt) {
                    // TOP vypršel - zrušit TOP status
                    await updateDoc(doc(window.firebaseDb, 'users', currentUser.uid, 'inzeraty', adDoc.id), {
                        isTop: false,
                        topExpiredAt: now
                    });
                    expiredCount++;
                }
            }
        }
        
        if (expiredCount > 0) {
            console.log(`🕒 Automaticky zrušeno ${expiredCount} expirovaných TOP inzerátů`);
            // Aktualizovat zobrazení
            await loadUserAds();
        }
        
    } catch (error) {
        console.error('Chyba při kontrole expirace TOP:', error);
    }
}

// Spustit periodickou kontrolu expirace TOP inzerátů každou minutu
let topExpirationInterval = null;

function startTopExpirationCheck() {
    // Zastavit předchozí interval pokud existuje
    if (topExpirationInterval) {
        clearInterval(topExpirationInterval);
    }
    
    // Spustit kontrolu každou minutu
    topExpirationInterval = setInterval(async () => {
        await checkAndExpireTopAds();
    }, 60000); // 60 sekund
    
    console.log('🕒 Spuštěna periodická kontrola expirace TOP inzerátů');
}

function stopTopExpirationCheck() {
    if (topExpirationInterval) {
        clearInterval(topExpirationInterval);
        topExpirationInterval = null;
        console.log('🕒 Zastavena periodická kontrola expirace TOP inzerátů');
    }
}
async function purchaseTop(adId) {
    try {
        const currentUser = window.firebaseAuth.currentUser;
        if (!currentUser) {
            showMessage('Pro zakoupení TOP se prosím přihlaste.', 'error');
            return;
        }
        
        const { getDoc, getDocs, collection, query, where, updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst profil uživatele kvůli zůstatku (users/{uid}/profile/profile)
        const profileRef = doc(window.firebaseDb, 'users', currentUser.uid, 'profile', 'profile');
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
            showMessage('Uživatelský profil nenalezen.', 'error');
            return;
        }
        const userData = profileSnap.data();
        const currentBalance = userData.balance || 0;
        
        if (currentBalance < 500) {
            showMessage('Nedostatečný zůstatek. Potřebujete 500 Kč.', 'error');
            return;
        }
        
        // Odečíst 500 Kč a nastavit inzerát jako TOP
        await updateDoc(profileRef, {
            balance: currentBalance - 500,
            lastBalanceUpdate: new Date(),
            balanceUpdateReason: 'Nákup TOP inzerátu'
        });
        
        await updateDoc(doc(window.firebaseDb, 'users', currentUser.uid, 'inzeraty', adId), {
            isTop: true,
            topPurchasedAt: new Date(),
            topExpiresAt: new Date(Date.now() + 1 * 60 * 1000) // 1 minuta od nynějška
        });
        
        // Aktualizovat číslo v dropdownu
        const balanceAmount = document.querySelector('.balance-amount');
        if (balanceAmount) {
            balanceAmount.textContent = `${(currentBalance - 500).toLocaleString('cs-CZ')} Kč`;
        }
        
        showMessage('TOP byl úspěšně aktivován na 1 minutu. Váš inzerát se bude zobrazovat první.', 'success');
        await loadUserAds();
        
    } catch (error) {
        console.error('Chyba při nákupu TOP:', error);
        showMessage('Nepodařilo se aktivovat TOP. Zkuste to prosím znovu.', 'error');
    }
}

window.purchaseTop = purchaseTop;

// Úprava inzerátu
function editAd(adId) {
    console.log('EditAd volána s ID:', adId);
    const ad = userAds.find(a => a.id === adId);
    if (!ad) {
        console.log('Inzerát nenalezen:', adId);
        return;
    }
    
    console.log('Našel inzerát:', ad);
    currentEditingAdId = adId;
    
    // Vyplnit formulář
    document.getElementById('editServiceTitle').value = ad.title;
    document.getElementById('editServiceCategory').value = ad.category;
    document.getElementById('editServiceDescription').value = ad.description;
    document.getElementById('editServicePrice').value = ad.price || '';
    document.getElementById('editServiceLocation').value = ad.location;
    document.getElementById('editServiceStatus').value = ad.status;
    
    // Zobrazit modal
    const modal = document.getElementById('editServiceModal');
    console.log('Modal element:', modal);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Aktualizace inzerátu
async function updateAd() {
    try {
        console.log('UpdateAd volána, currentEditingAdId:', currentEditingAdId);
        if (!currentEditingAdId) {
            console.log('Žádné ID pro úpravu');
            return;
        }
        
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const formData = new FormData(document.getElementById('editServiceForm'));
        const updateData = {
            title: formData.get('title'),
            category: formData.get('category'),
            description: formData.get('description'),
            price: formData.get('price'),
            location: formData.get('location'),
            status: formData.get('status'),
            updatedAt: new Date()
        };
        
        console.log('Aktualizuji data:', updateData);
        await updateDoc(doc(window.firebaseDb, 'users', window.firebaseAuth.currentUser.uid, 'inzeraty', currentEditingAdId), updateData);
        
        showMessage('Inzerát byl úspěšně aktualizován!', 'success');
        closeEditServiceModal();
        loadUserAds(); // Obnovit seznam
        
    } catch (error) {
        console.error('Chyba při aktualizaci inzerátu:', error);
        showMessage('Nepodařilo se aktualizovat inzerát.', 'error');
    }
}

// Přepnutí stavu inzerátu
async function toggleAdStatus(adId, currentStatus) {
    try {
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        await updateDoc(doc(window.firebaseDb, 'users', window.firebaseAuth.currentUser.uid, 'inzeraty', adId), {
            status: newStatus,
            updatedAt: new Date()
        });
        
        showMessage(`Inzerát byl ${newStatus === 'active' ? 'aktivován' : 'pozastaven'}!`, 'success');
        loadUserAds(); // Obnovit seznam
        
    } catch (error) {
        console.error('Chyba při změně stavu inzerátu:', error);
        showMessage('Nepodařilo se změnit stav inzerátu.', 'error');
    }
}

// Smazání inzerátu
async function deleteAd(adId) {
    if (!confirm('Opravdu chcete smazat tento inzerát? Tato akce je nevratná.')) {
        return;
    }
    
    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        await deleteDoc(doc(window.firebaseDb, 'users', window.firebaseAuth.currentUser.uid, 'inzeraty', adId));
        
        showMessage('Inzerát byl úspěšně smazán!', 'success');
        loadUserAds(); // Obnovit seznam
        
    } catch (error) {
        console.error('Chyba při mazání inzerátu:', error);
        showMessage('Nepodařilo se smazat inzerát.', 'error');
    }
}

// Zavření edit modalu
function closeEditServiceModal() {
    document.getElementById('editServiceModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditingAdId = null;
    
    // Vyčištění formuláře
    document.getElementById('editServiceForm').reset();
}

// Zobrazení zprávy
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Zobrazení chyby
function showError(message) {
    const grid = document.getElementById('myAdsGrid');
    grid.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Chyba při načítání</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadUserAds()">Zkusit znovu</button>
        </div>
    `;
}

// Přepínání dropdown menu
function toggleUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Zavření dropdown menu při kliknutí mimo něj
function closeUserDropdown() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    // Zavření modalu při kliknutí mimo něj
    window.addEventListener('click', (e) => {
        const editServiceModal = document.getElementById('editServiceModal');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (e.target === editServiceModal) {
            closeEditServiceModal();
        }
        
        if (userDropdown && !userDropdown.contains(e.target)) {
            closeUserDropdown();
        }
    });
});

// Export funkcí pro globální použití
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;
window.closeEditServiceModal = closeEditServiceModal;
window.editAd = editAd;
window.toggleAdStatus = toggleAdStatus;
window.deleteAd = deleteAd;
