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
    
    // Inicializace výběru typu registrace
    setupRegistrationTypeSelection();
    
    // Debug: Zkontrolovat elementy po načtení
    setTimeout(() => {
        const personForm = document.querySelector('.person-form');
        const companyForm = document.querySelector('.company-form');
        const typeButtons = document.querySelectorAll('.registration-type-btn');
        
        console.log('🔍 Debug po načtení DOM:', {
            personForm: personForm ? 'nalezen' : 'nenalezen',
            companyForm: companyForm ? 'nalezen' : 'nenalezen',
            typeButtons: typeButtons.length,
            personFormDisplay: personForm ? personForm.style.display : 'N/A',
            companyFormDisplay: companyForm ? companyForm.style.display : 'N/A'
        });
    }, 1000);
}

// Nastavení výběru typu registrace
function setupRegistrationTypeSelection() {
    const typeButtons = document.querySelectorAll('.registration-type-btn');
    const personForm = document.querySelector('.person-form');
    const companyForm = document.querySelector('.company-form');
    
    console.log('🔧 Nastavuji registrační typy:', { typeButtons: typeButtons.length, personForm, companyForm });
    
    typeButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('🖱️ Kliknuto na tlačítko:', button.getAttribute('data-type'));
            
            // Odstranit active třídu ze všech tlačítek
            typeButtons.forEach(btn => btn.classList.remove('active'));
            // Přidat active třídu na kliknuté tlačítko
            button.classList.add('active');
            
            const type = button.getAttribute('data-type');
            console.log('📝 Typ registrace:', type);
            
            if (type === 'person') {
                console.log('👤 Zobrazuji formulář pro fyzickou osobu');
                personForm.style.display = 'block';
                personForm.classList.remove('hidden');
                personForm.classList.add('visible');
                companyForm.style.display = 'none';
                companyForm.classList.add('hidden');
                companyForm.classList.remove('visible');
                // required přepínač
                toggleRequired(personForm, true);
                toggleRequired(companyForm, false);
            } else if (type === 'company') {
                console.log('🏢 Zobrazuji formulář pro firmu');
                personForm.style.display = 'none';
                personForm.classList.add('hidden');
                personForm.classList.remove('visible');
                companyForm.style.display = 'block';
                companyForm.classList.remove('hidden');
                companyForm.classList.add('visible');
                // required přepínač
                toggleRequired(personForm, false);
                toggleRequired(companyForm, true);
            }
            
            console.log('📊 Stav formulářů:', {
                personForm: {
                    display: personForm.style.display,
                    classes: personForm.className
                },
                companyForm: {
                    display: companyForm.style.display,
                    classes: companyForm.className
                }
            });
        });
    });
}

// Přepínání required atributů uvnitř kontejneru
function toggleRequired(container, isRequired) {
    if (!container) return;
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((el) => {
        if (isRequired) {
            if (el.getAttribute('data-optional') === 'true') {
                el.required = false;
            } else {
                el.required = true;
            }
        } else {
            el.required = false;
        }
    });
}

// Registrace nového uživatele
async function register(email, password, userData) {
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
            createdAt: new Date(),
            userType: userData.type
        });
        
        // Vytvořit profil podle typu uživatele
        const profileData = {
            email: user.email,
            balance: 1000,
            createdAt: new Date(),
            userType: userData.type
        };
        
        if (userData.type === 'person') {
            profileData.firstName = userData.firstName;
            profileData.lastName = userData.lastName;
            profileData.phone = userData.phone;
            profileData.birthDate = userData.birthDate;
            profileData.name = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.type === 'company') {
            profileData.name = userData.companyName || 'Firma';
            profileData.company = {
                companyName: userData.companyName || null,
                ico: userData.ico || null,
                dic: userData.dic || null,
                phone: userData.companyPhone || null,
                address: userData.companyAddress || null
            };
        }
        
        await setDoc(doc(firebaseDb, 'users', user.uid, 'profile', 'profile'), profileData);

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
    const registrationType = document.querySelector('.registration-type');
    const personForm = document.querySelector('.person-form');
    const companyForm = document.querySelector('.company-form');

    if (type === 'login') {
        modalTitle.textContent = 'Přihlášení';
        submitBtn.textContent = 'Přihlásit se';
        switchBtn.textContent = 'Nemáte účet? Zaregistrujte se';
        switchBtn.setAttribute('data-type', 'register');
        registrationType.style.display = 'none';
        personForm.style.display = 'none';
        companyForm.style.display = 'none';
    } else {
        modalTitle.textContent = 'Registrace';
        submitBtn.textContent = 'Zaregistrovat se';
        switchBtn.textContent = 'Již máte účet? Přihlaste se';
        switchBtn.setAttribute('data-type', 'login');
        registrationType.style.display = 'block';
        
        // Zobrazit formulář pro fyzickou osobu jako výchozí
        personForm.style.display = 'block';
        personForm.classList.add('visible');
        personForm.classList.remove('hidden');
        companyForm.style.display = 'none';
        companyForm.classList.add('hidden');
        companyForm.classList.remove('visible');
        
        console.log('🎯 Inicializace registrace - výchozí stav:', {
            personForm: {
                display: personForm.style.display,
                classes: personForm.className
            },
            companyForm: {
                display: companyForm.style.display,
                classes: companyForm.className
            }
        });
        
        // Aktivovat tlačítko pro fyzickou osobu
        const typeButtons = document.querySelectorAll('.registration-type-btn');
        typeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.registration-type-btn[data-type="person"]').classList.add('active');
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
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');

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

        // Nahrát obrázky do Firebase Storage
        const storage = getStorage();
        const uploadedImages = [];
        
        // Nahrát náhledový obrázek
        if (serviceData.previewImage) {
            console.log('📸 Nahrávám náhledový obrázek...');
            const previewRef = ref(storage, `services/${currentUser.uid}/${Date.now()}_preview.jpg`);
            const previewSnapshot = await uploadBytes(previewRef, serviceData.previewImage);
            const previewUrl = await getDownloadURL(previewSnapshot.ref);
            uploadedImages.push({
                url: previewUrl,
                isPreview: true,
                name: serviceData.previewImage.name
            });
            console.log('✅ Náhledový obrázek nahrán:', previewUrl);
        }
        
        // Nahrát další obrázky
        if (serviceData.additionalImages && serviceData.additionalImages.length > 0) {
            console.log('📸 Nahrávám další obrázky...', serviceData.additionalImages.length);
            for (let i = 0; i < serviceData.additionalImages.length; i++) {
                const image = serviceData.additionalImages[i];
                const imageRef = ref(storage, `services/${currentUser.uid}/${Date.now()}_${i}.jpg`);
                const imageSnapshot = await uploadBytes(imageRef, image);
                const imageUrl = await getDownloadURL(imageSnapshot.ref);
                uploadedImages.push({
                    url: imageUrl,
                    isPreview: false,
                    name: image.name
                });
            }
            console.log('✅ Všechny další obrázky nahrány');
        }

        // Vytvořit službu s URL obrázků
        const serviceToSave = {
            ...serviceData,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: new Date(),
            status: 'active',
            images: uploadedImages
        };
        
        // Odstranit File objekty před uložením do Firestore
        delete serviceToSave.previewImage;
        delete serviceToSave.additionalImages;

        await addDoc(collection(firebaseDb, 'users', currentUser.uid, 'inzeraty'), serviceToSave);

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
            
            const isLogin = document.querySelector('.modal-title').textContent === 'Přihlášení';
            
            if (isLogin) {
                await login(email, password);
            } else {
                // Zpracování registrace podle typu
                const activeTypeBtn = document.querySelector('.registration-type-btn.active');
                const userType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'person';
                
                let userData = { type: userType };
                
                if (userType === 'person') {
                    userData.firstName = formData.get('firstName');
                    userData.lastName = formData.get('lastName');
                    userData.phone = formData.get('phone');
                    userData.birthDate = formData.get('birthDate');
                } else if (userType === 'company') {
                    userData.companyName = formData.get('companyName');
                    userData.ico = formData.get('ico');
                    userData.dic = formData.get('dic');
                    userData.companyPhone = formData.get('companyPhone');
                    userData.companyAddress = formData.get('companyAddress');
                }
                
                await register(email, password, userData);
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
    
    // Inicializace náhledů obrázků
    setupImagePreviews();
    
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
            
            // Zpracovat obrázky
            const previewImageInput = document.getElementById('previewImage');
            const additionalImagesInput = document.getElementById('additionalImages');
            
            // Validace náhledového obrázku
            if (!previewImageInput.files[0]) {
                showMessage('Náhledový obrázek je povinný!', 'error');
                return;
            }
            
            serviceData.previewImage = previewImageInput.files[0];
            
            // Zpracovat další obrázky
            if (additionalImagesInput.files.length > 0) {
                if (additionalImagesInput.files.length > 10) {
                    showMessage('Můžete nahrát maximálně 10 dalších fotek!', 'error');
                    return;
                }
                serviceData.additionalImages = Array.from(additionalImagesInput.files);
            }
            
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

// Funkce pro náhled obrázků při nahrávání
function setupImagePreviews() {
    const previewImageInput = document.getElementById('previewImage');
    const additionalImagesInput = document.getElementById('additionalImages');
    const previewImagePreview = document.getElementById('previewImagePreview');
    const additionalImagesPreview = document.getElementById('additionalImagesPreview');
    
    if (previewImageInput && previewImagePreview) {
        previewImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImagePreview.innerHTML = `<img src="${e.target.result}" alt="Náhled">`;
                    previewImagePreview.classList.remove('empty');
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (additionalImagesInput && additionalImagesPreview) {
        additionalImagesInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 10) {
                showMessage('Můžete nahrát maximálně 10 dalších fotek!', 'error');
                return;
            }
            
            additionalImagesPreview.innerHTML = '';
            
            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item';
                    imageItem.innerHTML = `
                        <img src="${e.target.result}" alt="Obrázek ${index + 1}">
                        <button class="remove-btn" onclick="removeImage(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    additionalImagesPreview.appendChild(imageItem);
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

// Funkce pro odstranění obrázku z náhledu
function removeImage(index) {
    const additionalImagesInput = document.getElementById('additionalImages');
    const additionalImagesPreview = document.getElementById('additionalImagesPreview');
    
    if (additionalImagesInput && additionalImagesPreview) {
        const dt = new DataTransfer();
        const files = Array.from(additionalImagesInput.files);
        
        files.forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });
        
        additionalImagesInput.files = dt.files;
        
        // Aktualizovat náhled
        additionalImagesInput.dispatchEvent(new Event('change'));
    }
}

// Instagram-like prohlížeč obrázků
function openImageViewer(images, startIndex = 0) {
    console.log('🖼️ Otevírám prohlížeč obrázků:', images.length, 'obrázků');
    
    if (!images || images.length === 0) {
        showMessage('Žádné obrázky k zobrazení', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal image-viewer-modal';
    modal.style.display = 'flex';
    
    let currentIndex = startIndex;
    
    function updateImage() {
        const mainImage = modal.querySelector('.image-viewer-main');
        const counter = modal.querySelector('.image-viewer-counter');
        const thumbnails = modal.querySelectorAll('.image-viewer-thumbnail');
        
        if (mainImage && images[currentIndex]) {
            mainImage.src = images[currentIndex].url;
            mainImage.alt = images[currentIndex].name || `Obrázek ${currentIndex + 1}`;
        }
        
        if (counter) {
            counter.textContent = `${currentIndex + 1} / ${images.length}`;
        }
        
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentIndex);
        });
        
        // Skrýt/zobrazit navigační tlačítka
        const prevBtn = modal.querySelector('.image-viewer-prev');
        const nextBtn = modal.querySelector('.image-viewer-next');
        
        if (prevBtn) prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
    }
    
    modal.innerHTML = `
        <div class="image-viewer-content">
            <div class="image-viewer-header">
                <button class="image-viewer-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-viewer-counter">${currentIndex + 1} / ${images.length}</div>
            </div>
            
            <div class="image-viewer-body">
                <img class="image-viewer-main" src="${images[currentIndex].url}" alt="${images[currentIndex].name || `Obrázek ${currentIndex + 1}`}">
                
                <button class="image-viewer-nav image-viewer-prev" onclick="navigateImage(-1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <button class="image-viewer-nav image-viewer-next" onclick="navigateImage(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="image-viewer-thumbnails">
                ${images.map((img, index) => `
                    <div class="image-viewer-thumbnail ${index === currentIndex ? 'active' : ''}" onclick="goToImage(${index})">
                        <img src="${img.url}" alt="${img.name || `Obrázek ${index + 1}`}">
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Přidat navigační funkce
    window.navigateImage = function(direction) {
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = images.length - 1;
        if (currentIndex >= images.length) currentIndex = 0;
        updateImage();
    };
    
    window.goToImage = function(index) {
        currentIndex = index;
        updateImage();
    };
    
    // Klávesové zkratky
    const handleKeydown = (e) => {
        if (e.key === 'ArrowLeft') navigateImage(-1);
        if (e.key === 'ArrowRight') navigateImage(1);
        if (e.key === 'Escape') modal.remove();
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Vyčistit event listener při zavření
    const originalRemove = modal.remove;
    modal.remove = function() {
        document.removeEventListener('keydown', handleKeydown);
        delete window.navigateImage;
        delete window.goToImage;
        originalRemove.call(this);
    };
    
    document.body.appendChild(modal);
    updateImage();
}

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
window.setupImagePreviews = setupImagePreviews;
window.removeImage = removeImage;
window.openImageViewer = openImageViewer;