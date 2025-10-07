// Auth.js - Firebase Authentication funkcionality

// Globální proměnné
let currentUser = null;
let firebaseAuth = null;
let firebaseDb = null;

// Inicializace po načtení Firebase
document.addEventListener('DOMContentLoaded', () => {
    // Počkat na inicializaci Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
            firebaseAuth = window.firebaseAuth;
            firebaseDb = window.firebaseDb;
            initAuth();
            clearInterval(checkFirebase);
        }
    }, 100);
});

// Inicializace autentifikace
function initAuth() {
    // Import Firebase funkcí dynamicky
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
        // Sledování stavu přihlášení
        onAuthStateChanged(firebaseAuth, (user) => {
            currentUser = user;
            updateUI(user);
        });
    });
}

// Registrace nového uživatele
async function register(email, password, name) {
    try {
        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        // Vytvořit root dokument uživatele a profil subdokument
        const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await setDoc(doc(firebaseDb, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            createdAt: new Date()
        });
        await setDoc(doc(firebaseDb, 'users', user.uid, 'profile', 'profile'), {
            name: name,
            email: user.email,
            balance: 1000,
            createdAt: new Date()
        });

        showMessage('Úspěšně jste se zaregistrovali!', 'success');
        closeAuthModal();
        return user;
    } catch (error) {
        handleAuthError(error);
    }
}

// Přihlášení uživatele
async function login(email, password) {
    try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        showMessage('Úspěšně jste se přihlásili!', 'success');
        closeAuthModal();
        return userCredential.user;
    } catch (error) {
        handleAuthError(error);
    }
}

// Odhlášení uživatele
async function logout() {
    try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        await signOut(firebaseAuth);
        showMessage('Úspěšně jste se odhlásili!', 'success');
    } catch (error) {
        handleAuthError(error);
    }
}

// Aktualizace UI podle stavu přihlášení
function updateUI(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const userInfo = document.querySelector('.user-info');
    
    if (user) {
        // Uživatel je přihlášen
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
                // Zkusit načíst jméno z Firestore
                loadUserProfile(user.uid).then(userProfile => {
                    if (userProfile && userProfile.name) {
                        displayName.textContent = userProfile.name;
                    } else {
                        // Pokud není jméno, použít část emailu před @
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
        
        // Zobrazit tlačítko pro přidání služby
        showAddServiceButton();
    } else {
        // Uživatel není přihlášen
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        
        hideAddServiceButton();
    }
}

// Zobrazení tlačítka pro přidání služby
function showAddServiceButton() {
    let addServiceBtn = document.querySelector('.add-service-btn');
    if (!addServiceBtn) {
        addServiceBtn = document.createElement('a');
        addServiceBtn.href = '#add-service';
        addServiceBtn.className = 'btn btn-primary add-service-btn';
        addServiceBtn.innerHTML = '<i class="fas fa-plus"></i> Přidat službu';
        addServiceBtn.onclick = (e) => {
            e.preventDefault();
            showAddServiceModal();
        };
        
        const heroButtons = document.querySelector('.hero-buttons');
        if (heroButtons) {
            heroButtons.appendChild(addServiceBtn);
        }
    }
}

// Skrytí tlačítka pro přidání služby
function hideAddServiceButton() {
    const addServiceBtn = document.querySelector('.add-service-btn');
    if (addServiceBtn) {
        addServiceBtn.remove();
    }
}

// Zobrazení auth modalu
function showAuthModal(type = 'login') {
    const modal = document.getElementById('authModal');
    const modalTitle = document.querySelector('.modal-title');
    const submitBtn = document.querySelector('.auth-submit-btn');
    const switchBtn = document.querySelector('.auth-switch-btn');
    const nameField = document.querySelector('.name-field');
    const nameInput = document.querySelector('#name');

    if (type === 'login') {
        modalTitle.textContent = 'Přihlášení';
        submitBtn.textContent = 'Přihlásit se';
        switchBtn.textContent = 'Nemáte účet? Zaregistrujte se';
        switchBtn.setAttribute('data-type', 'register');
        nameField.style.display = 'none';
        nameInput.removeAttribute('required');
    } else {
        modalTitle.textContent = 'Registrace';
        submitBtn.textContent = 'Zaregistrovat se';
        switchBtn.textContent = 'Již máte účet? Přihlaste se';
        switchBtn.setAttribute('data-type', 'login');
        nameField.style.display = 'block';
        nameInput.setAttribute('required', 'required');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Zavření auth modalu
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Vyčištění formuláře
    const form = document.getElementById('authForm');
    form.reset();
}

// Zobrazení modalu pro přidání služby
function showAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Zavření modalu pro přidání služby
function closeAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Vyčištění formuláře
    const form = document.getElementById('addServiceForm');
    form.reset();
}

// Zpracování chyb autentifikace
function handleAuthError(error) {
    let message = 'Došlo k chybě při autentifikaci.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Tento email je již používán.';
            break;
        case 'auth/weak-password':
            message = 'Heslo je příliš slabé.';
            break;
        case 'auth/invalid-email':
            message = 'Neplatný email.';
            break;
        case 'auth/user-not-found':
            message = 'Uživatel s tímto emailem neexistuje.';
            break;
        case 'auth/wrong-password':
            message = 'Nesprávné heslo.';
            break;
        case 'auth/too-many-requests':
            message = 'Příliš mnoho pokusů. Zkuste to později.';
            break;
    }
    
    showMessage(message, 'error');
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

// Přidání služby
async function addService(serviceData) {
    try {
        if (!currentUser) {
            showMessage('Musíte být přihlášeni pro přidání služby.', 'error');
            return;
        }

        const { addDoc, collection, setDoc, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Zkontrolovat, zda uživatel existuje, pokud ne, vytvořit ho
        const userRef = doc(firebaseDb, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            // Vytvořit root dokument uživatele
            await setDoc(userRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                createdAt: new Date()
            });
            
            // Vytvořit profil uživatele
            await setDoc(doc(firebaseDb, 'users', currentUser.uid, 'profile', 'profile'), {
                name: currentUser.email.split('@')[0],
                email: currentUser.email,
                balance: 1000,
                createdAt: new Date()
            });
        }

        await addDoc(collection(firebaseDb, 'users', currentUser.uid, 'inzeraty'), {
            ...serviceData,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: new Date(),
            status: 'active'
        });

        showMessage('Služba byla úspěšně přidána!', 'success');
        closeAddServiceModal();
        
        // Real-time listener automaticky aktualizuje seznam
    } catch (error) {
        console.error('Chyba při přidávání služby:', error);
        showMessage('Došlo k chybě při přidávání služby.', 'error');
    }
}

// Načtení uživatelského profilu z Firestore (users/{uid}/profile/profile)
async function loadUserProfile(uid) {
    try {
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const profileRef = doc(firebaseDb, 'users', uid, 'profile', 'profile');
        const snap = await getDoc(profileRef);
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error('Chyba při načítání uživatelského profilu:', error);
        return null;
    }
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

// Načtení služeb z databáze
async function loadServices() {
    try {
        const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const servicesSnapshot = await getDocs(collection(firebaseDb, 'services'));
        const services = [];
        
        servicesSnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() });
        });
        
        // Zde můžete aktualizovat UI se seznamem služeb
        console.log('Načtené služby:', services);
        
        return services;
    } catch (error) {
        console.error('Chyba při načítání služeb:', error);
    }
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    // Auth formulář
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(authForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const name = formData.get('name');
            
            const isLogin = document.querySelector('.modal-title').textContent === 'Přihlášení';
            
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
        });
    }
    
    // Přepínání mezi přihlášením a registrací
    const authSwitchBtn = document.querySelector('.auth-switch-btn');
    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', () => {
            const type = authSwitchBtn.getAttribute('data-type');
            showAuthModal(type);
        });
    }
    
    // Formulář pro přidání služby
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(addServiceForm);
            const serviceData = {
                title: formData.get('title'),
                category: formData.get('category'),
                description: formData.get('description'),
                price: formData.get('price'),
                location: formData.get('location')
            };
            
            await addService(serviceData);
        });
    }
    
    // Zavření modalu při kliknutí mimo něj
    window.addEventListener('click', (e) => {
        const authModal = document.getElementById('authModal');
        const addServiceModal = document.getElementById('addServiceModal');
        const userDropdown = document.querySelector('.user-dropdown');
        
        if (e.target === authModal) {
            closeAuthModal();
        }
        if (e.target === addServiceModal) {
            closeAddServiceModal();
        }
        
        // Zavření dropdown menu při kliknutí mimo něj
        if (userDropdown && !userDropdown.contains(e.target)) {
            closeUserDropdown();
        }
    });
});

// Export funkcí pro globální použití
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.showAddServiceModal = showAddServiceModal;
window.closeAddServiceModal = closeAddServiceModal;
window.logout = logout;
window.addService = addService;
window.loadServices = loadServices;
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;