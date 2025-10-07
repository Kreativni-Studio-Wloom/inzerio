// Chat JavaScript - Real-time chat mezi zákazníkem a inzerentem

let currentConversationId = null;
let currentUserId = null;
let conversations = [];
let messages = [];

// Globální proměnné pro profil
let currentChatUser = null;
let currentChatUserAds = [];
let currentPinnedAd = null;

// Inicializace chatu
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat DOMContentLoaded');
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
            console.log('Firebase nalezen v Chat, inicializuji');
            initChat();
            clearInterval(checkFirebase);
        } else {
            console.log('Čekám na Firebase v Chat...');
        }
    }, 100);
});

// Inicializace chatu
function initChat() {
    console.log('🚀 Inicializuji Chat stránku v chat okně');
    
    // Import Firebase funkcí dynamicky
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
        console.log('✅ Firebase Auth importován pro Chat');
        // Sledování stavu přihlášení
        onAuthStateChanged(window.firebaseAuth, (user) => {
            console.log('🔐 Chat Auth state changed:', user);
            if (user) {
                console.log('✅ Uživatel přihlášen v Chat, načítám konverzace');
                currentUserId = user.uid;
                loadConversations();
                setupChatEventListeners();
            } else {
                console.log('❌ Uživatel není přihlášen v Chat, přesměrovávám');
                window.location.href = 'index.html';
            }
        });
    }).catch(error => {
        console.error('❌ Chyba při importu Firebase Auth:', error);
        showMessage('Chyba při inicializaci chatu: ' + error.message, 'error');
    });
}

// Zkontrolovat URL parametry pro automatické otevření konverzace
function checkUrlParams() {
    console.log('🔗 Kontroluji URL parametry v chat okně...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId) {
        console.log('🔗 URL parametr conversation nalezen v chat okně:', conversationId);
        // Počkat na načtení konverzací a pak otevřít
        setTimeout(() => {
            openConversationFromUrl(conversationId);
        }, 1000);
    } else {
        console.log('🔗 Žádný URL parametr conversation v chat okně');
    }
}

// Otevření konverzace z URL parametru
async function openConversationFromUrl(conversationId) {
    try {
        console.log('🎯 Otevírám konverzaci z URL v chat okně:', conversationId);
        
        // Zkontrolovat, jestli konverzace existuje v načtených konverzacích
        const conversation = conversations.find(c => c.id === conversationId);
        
        if (conversation) {
            console.log('✅ Konverzace nalezena v seznamu, otevírám v chat okně...');
            await openConversation(conversationId);
        } else {
            console.log('⚠️ Konverzace nenalezena v seznamu, zkouším načíst přímo v chat okně...');
            // Zkusit načíst konverzaci přímo z Firebase
            await loadConversationDirectly(conversationId);
        }
        
        // Vyčistit URL parametr
        const url = new URL(window.location);
        url.searchParams.delete('conversation');
        window.history.replaceState({}, '', url);
        console.log('✅ URL parametr vyčištěn v chat okně');
        
    } catch (error) {
        console.error('❌ Chyba při otevírání konverzace z URL:', error);
        showMessage('Nepodařilo se otevřít konverzaci: ' + error.message, 'error');
    }
}

// Načtení konverzace přímo z Firebase
async function loadConversationDirectly(conversationId) {
    try {
        console.log('🔍 Načítám konverzaci přímo z Firebase v chat okně:', conversationId);
        
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const conversationRef = doc(window.firebaseDb, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (conversationSnap.exists()) {
            const conversationData = conversationSnap.data();
            console.log('📄 Konverzace nalezena:', conversationData);
            
            // Zkontrolovat, jestli je uživatel účastník
            if (conversationData.participants.includes(currentUserId)) {
                console.log('✅ Uživatel je účastník konverzace, otevírám...');
                
                // Přidat konverzaci do seznamu pokud tam není
                const existingConv = conversations.find(c => c.id === conversationId);
                if (!existingConv) {
                    conversations.unshift({
                        id: conversationId,
                        ...conversationData,
                        updatedAt: conversationData.updatedAt?.toDate?.() || conversationData.updatedAt
                    });
                    console.log('✅ Konverzace přidána do seznamu');
                    displayConversations();
                }
                
                await openConversation(conversationId);
            } else {
                console.error('❌ Uživatel není účastník konverzace');
                showMessage('Nemáte přístup k této konverzaci', 'error');
            }
        } else {
            console.error('❌ Konverzace neexistuje');
            showMessage('Konverzace neexistuje', 'error');
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání konverzace:', error);
        showMessage('Nepodařilo se načíst konverzaci: ' + error.message, 'error');
    }
}

// Načtení konverzací uživatele
async function loadConversations() {
    try {
        console.log('📋 Načítám konverzace pro uživatele v chat okně:', currentUserId);
        console.log('🔗 Firebase DB:', !!window.firebaseDb);
        
        if (!window.firebaseDb) {
            throw new Error('Firebase DB není dostupný');
        }
        
        const { getDocs, collection, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst všechny konverzace kde je uživatel účastník
        const conversationsRef = collection(window.firebaseDb, 'conversations');
        const q = query(
            conversationsRef,
            where('participants', 'array-contains', currentUserId)
        );
        
        console.log('🔍 Provádím dotaz na Firestore...');
        const querySnapshot = await getDocs(q);
        console.log('📊 Dotaz dokončen, počet konverzací:', querySnapshot.size);
        
        conversations = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📄 Konverzace:', doc.id, data);
            conversations.push({
                id: doc.id,
                ...data,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
            });
        });
        
        // Seřadit lokálně podle updatedAt
        conversations.sort((a, b) => {
            const aTime = a.updatedAt?.getTime?.() || 0;
            const bTime = b.updatedAt?.getTime?.() || 0;
            return bTime - aTime; // Descending order
        });
        
        console.log('✅ Načteny konverzace:', conversations);
        displayConversations();
        
        // Pokud jsou konverzace, zkontrolovat URL parametr
        if (conversations.length > 0) {
            console.log('🔗 Zkontroluji URL parametry v chat okně...');
            checkUrlParams();
        } else {
            console.log('📭 Žádné konverzace, URL parametry se nekontrolují');
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání konverzací:', error);
        showMessage('Nepodařilo se načíst konverzace: ' + error.message, 'error');
        
        // Zobrazit prázdný stav
        const conversationsList = document.getElementById('conversationsList');
        if (conversationsList) {
            conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Chyba při načítání konverzací</p>
                    <p>${error.message}</p>
                    <button onclick="loadConversations()" class="btn btn-primary">Zkusit znovu</button>
                </div>
            `;
        }
    }
}

// Zobrazení seznamu konverzací
function displayConversations() {
    console.log('📋 Zobrazuji konverzace:', conversations.length);
    
    const conversationsList = document.getElementById('conversationsList');
    if (!conversationsList) {
        console.error('❌ Container pro konverzace nenalezen');
        return;
    }
    
    if (conversations.length === 0) {
        console.log('📭 Žádné konverzace k zobrazení');
        conversationsList.innerHTML = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <p>Zatím nemáte žádné konverzace</p>
                <p>Začněte kontaktováním inzerentů na stránce služeb</p>
            </div>
        `;
        return;
    }
    
    conversationsList.innerHTML = conversations.map(conv => {
        console.log('📄 Zobrazuji konverzaci:', conv);
        const otherParticipant = conv.participants.find(p => p !== currentUserId);
        const unreadCount = conv.unread?.[currentUserId] || 0;
        
        return `
            <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
                 onclick="openConversation('${conv.id}')">
                <div class="conversation-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="conversation-content">
                    <div class="conversation-header">
                        <h4 class="conversation-title">${conv.listingTitle || 'Konverzace'}</h4>
                        <span class="conversation-time">${formatTime(conv.updatedAt)}</span>
                    </div>
                    <div class="conversation-preview">
                        <p class="last-message">${conv.lastMessage?.text || 'Žádné zprávy'}</p>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Konverzace zobrazeny v chat okně');
}

// Otevření konverzace
async function openConversation(conversationId) {
    console.log('🔓 Otevírám konverzaci:', conversationId);
    console.log('📋 Dostupné konverzace:', conversations.map(c => c.id));
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
        console.error('❌ Konverzace nenalezena v seznamu');
        showMessage('Konverzace nenalezena', 'error');
        return;
    }
    
    console.log('✅ Konverzace nalezena:', conversation);
    
    currentConversationId = conversationId;
    
    // Aktualizovat UI
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[onclick="openConversation('${conversationId}')"]`)?.classList.add('active');
    
    // Zobrazit chat okno
    const chatWindow = document.getElementById('chatWindow');
    const conversationsSidebar = document.querySelector('.conversations-sidebar');
    
    if (chatWindow && conversationsSidebar) {
        chatWindow.style.display = 'flex';
        chatWindow.classList.add('active');
        conversationsSidebar.classList.add('hidden');
        console.log('✅ Chat okno zobrazeno, sidebar skryt');
    } else {
        console.error('❌ Chat okno nebo sidebar nenalezen');
    }
    
    console.log('✅ UI aktualizováno');
    
    // Načíst zprávy
    console.log('📨 Načítám zprávy pro konverzaci...');
    await loadMessages(conversationId);
    
    // Označit jako přečtené
    console.log('✅ Označuji jako přečtené...');
    await markAsRead(conversationId);
    
    // Aktualizovat chat header s informacemi o uživateli
    console.log('🔄 Aktualizuji chat header...');
    const otherParticipant = conversation.participants.find(p => p !== currentUserId);
    if (otherParticipant) {
        // Načíst informace o uživateli
        await loadUserInfo(otherParticipant);
    }
    
    // Načíst pinned inzerát pro chat - s malým zpožděním aby se UI stihlo načíst
    console.log('📌 Načítám pinned inzerát pro chat...');
    setTimeout(async () => {
        await loadChatPinnedAd();
    }, 200);
    
    console.log('✅ Konverzace otevřena');
}

// Načtení zpráv konverzace
async function loadMessages(conversationId) {
    try {
        console.log('📨 Načítám zprávy pro konverzaci v chat okně:', conversationId);
        
        const { getDocs, collection, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const messagesRef = collection(window.firebaseDb, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
        
        console.log('🔍 Provádím dotaz na zprávy...');
        const querySnapshot = await getDocs(q);
        console.log('📊 Nalezeno zpráv:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            console.log('📭 Žádné zprávy v databázi');
        }
        
        messages = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📄 Zpráva:', doc.id, data);
            const message = {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || data.createdAt
            };
            messages.push(message);
            console.log('➕ Přidána zpráva do pole:', message);
        });
        
        console.log('✅ Načteny zprávy:', messages.length);
        console.log('📋 Finální pole messages:', messages);
        
        // Zobrazit zprávy v chat okně
        displayMessages();
        
        // Scroll na konec
        setTimeout(() => {
            scrollToBottom();
        }, 200);
        
        // Nastavit real-time listener
        console.log('🔄 Nastavuji real-time listener...');
        setupMessagesListener(conversationId);
        
    } catch (error) {
        console.error('❌ Chyba při načítání zpráv:', error);
        showMessage('Nepodařilo se načíst zprávy: ' + error.message, 'error');
    }
}

// Real-time listener pro zprávy
function setupMessagesListener(conversationId) {
        console.log('🔄 Nastavuji real-time listener pro zprávy v chat okně:', conversationId);
    
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(({ onSnapshot, collection, query, orderBy, limit }) => {
        const messagesRef = collection(window.firebaseDb, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));
        
        console.log('🔍 Nastavuji onSnapshot listener...');
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('📨 Real-time update zpráv:', snapshot.size);
            console.log('📊 Snapshot docs:', snapshot.docs.length);
            
            if (snapshot.empty) {
                console.log('📭 Žádné zprávy v real-time listeneru');
                messages = [];
                displayMessages();
                return;
            }
            
            messages = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('📄 Real-time zpráva:', doc.id, data);
                const message = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt
                };
                messages.push(message);
                console.log('➕ Přidána zpráva do pole:', message);
            });
            
            console.log('✅ Zprávy aktualizovány:', messages.length);
            console.log('📋 Finální pole messages:', messages);
            
            // Zobrazit zprávy v chat okně
            displayMessages();
            
            // Scroll na konec
            setTimeout(() => {
                scrollToBottom();
            }, 200);
        }, (error) => {
            console.error('❌ Chyba v real-time listener:', error);
            showMessage('Chyba při sledování zpráv: ' + error.message, 'error');
        });
        
        // Uložit unsubscribe funkci
        if (window.messageUnsubscribe) {
            window.messageUnsubscribe();
        }
        window.messageUnsubscribe = unsubscribe;
        
        console.log('✅ Real-time listener nastaven');
    }).catch(error => {
        console.error('❌ Chyba při importu Firebase funkcí:', error);
        showMessage('Chyba při nastavování sledování zpráv: ' + error.message, 'error');
    });
}

// Vytvoření elementu zprávy
function createMessageElement(message) {
    console.log('🔨 Vytvářím element zprávy:', message);
    
    const isOwn = message.senderUid === currentUserId;
    const time = formatTime(message.createdAt);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${message.type === 'image' ? 
                `<img src="${message.imageURL}" alt="Obrázek" class="message-image">` : 
                `<p>${message.text}</p>`
            }
            <span class="message-time">${time}</span>
        </div>
    `;
    
    console.log('✅ Element zprávy vytvořen');
    return messageDiv;
}

// Zobrazení zpráv
function displayMessages() {
    console.log('🖼️ Zobrazuji zprávy v chat okně:', messages.length);
    console.log('📋 Pole messages:', messages);
    
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        console.error('❌ Container pro zprávy nenalezen');
        return;
    }
    
    console.log('✅ Container pro zprávy nalezen:', messagesContainer);
    
    if (messages.length === 0) {
        console.log('📭 Žádné zprávy k zobrazení');
        messagesContainer.innerHTML = '<div class="no-messages">Žádné zprávy<br><small>Napište první zprávu!</small></div>';
        return;
    }
    
    console.log('🔄 Generuji HTML pro zprávy...');
    const html = messages.map(msg => {
        console.log('📄 Zobrazuji zprávu:', msg);
        const isOwn = msg.senderUid === currentUserId;
        const time = formatTime(msg.createdAt);
        
        return `
            <div class="message ${isOwn ? 'own' : 'other'}">
                <div class="message-content">
                    ${msg.type === 'image' ? 
                        `<img src="${msg.imageURL}" alt="Obrázek" class="message-image">` : 
                        `<p>${msg.text}</p>`
                    }
                    <span class="message-time">${time}</span>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('📝 HTML generován:', html);
    messagesContainer.innerHTML = html;
    console.log('✅ Zprávy zobrazeny v chat okně');
    
    // Scroll na konec
    setTimeout(() => {
        scrollToBottom();
    }, 100);
}

// Odeslání zprávy
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    console.log('📤 Odesílám zprávu v chat okně:', { text, currentConversationId, currentUserId });
    
    if (!text || !currentConversationId) {
        console.log('⚠️ Chybí text nebo konverzace');
        return;
    }
    
    try {
        const { addDoc, collection, updateDoc, doc, serverTimestamp, runTransaction } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        console.log('✅ Firebase funkce importovány');
        
        // Přidat zprávu
        const messagesRef = collection(window.firebaseDb, 'conversations', currentConversationId, 'messages');
        const messageData = {
            senderUid: currentUserId,
            text: text,
            type: 'text',
            createdAt: serverTimestamp()
        };
        
        console.log('📝 Přidávám zprávu:', messageData);
        const messageDoc = await addDoc(messagesRef, messageData);
        console.log('✅ Zpráva přidána s ID:', messageDoc.id);
        
        // Aktualizovat konverzaci
        const conversationRef = doc(window.firebaseDb, 'conversations', currentConversationId);
        const conversation = conversations.find(c => c.id === currentConversationId);
        
        if (!conversation) {
            console.error('❌ Konverzace nenalezena v lokálních datech');
            showMessage('Chyba: Konverzace nenalezena', 'error');
            return;
        }
        
        const otherParticipant = conversation.participants.find(p => p !== currentUserId);
        
        console.log('🔄 Aktualizuji konverzaci:', { conversationId: currentConversationId, otherParticipant });
        
        await updateDoc(conversationRef, {
            lastMessage: {
                text: text,
                senderUid: currentUserId,
                type: 'text',
                at: serverTimestamp()
            },
            updatedAt: serverTimestamp(),
            [`unread.${otherParticipant}`]: (conversation.unread?.[otherParticipant] || 0) + 1
        });
        
        console.log('✅ Konverzace aktualizována');
        
        // Vyčistit input
        messageInput.value = '';
        
        // Zobrazit úspěch pouze v konzoli, ne jako notifikaci
        console.log('✅ Zpráva úspěšně odeslána v chat okně!');
        
        // Zpráva se automaticky zobrazí díky real-time listeneru
        
    } catch (error) {
        console.error('❌ Chyba při odesílání zprávy:', error);
        showMessage('Nepodařilo se odeslat zprávu', 'error');
    }
}

// Zavření konverzace
function closeConversation() {
    console.log('🔒 Zavírám konverzaci');
    
    // Zobrazit seznam konverzací
    const chatWindow = document.getElementById('chatWindow');
    const conversationsSidebar = document.querySelector('.conversations-sidebar');
    
    if (chatWindow && conversationsSidebar) {
        chatWindow.style.display = 'none';
        chatWindow.classList.remove('active');
        conversationsSidebar.classList.remove('hidden');
        console.log('✅ Chat okno zavřeno, sidebar zobrazen');
    } else {
        console.error('❌ Chat okno nebo sidebar nenalezen');
    }
    
    // Vyčistit aktuální konverzaci
    currentConversationId = null;
    
    // Vyčistit zprávy
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        console.log('✅ Zprávy vyčištěny');
    }
    
    console.log('✅ Konverzace zavřena');
}

// Označit konverzaci jako přečtenou
async function markAsRead(conversationId) {
    try {
        console.log('✅ Označuji konverzaci jako přečtenou v chat okně:', conversationId);
        
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const conversationRef = doc(window.firebaseDb, 'conversations', conversationId);
        await updateDoc(conversationRef, {
            [`unread.${currentUserId}`]: 0
        });
        
        console.log('✅ Konverzace označena jako přečtená v Firebase');
        
        // Aktualizovat lokální data
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.unread = conversation.unread || {};
            conversation.unread[currentUserId] = 0;
            console.log('✅ Lokální data aktualizována');
        } else {
            console.warn('⚠️ Konverzace nenalezena v lokálních datech');
        }
        
    } catch (error) {
        console.error('❌ Chyba při označování jako přečtené:', error);
        showMessage('Chyba při označování jako přečtené: ' + error.message, 'error');
    }
}

// Vytvoření nebo nalezení konverzace
async function getOrCreateConversation(listingId, sellerUid, buyerUid) {
    try {
        console.log('🔍 Hledám konverzaci v chat okně:', { listingId, sellerUid, buyerUid });
        
        const { getDocs, collection, query, where, addDoc, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Najít existující konverzaci
        const conversationsRef = collection(window.firebaseDb, 'conversations');
        const q = query(
            conversationsRef,
            where('participants', 'array-contains', buyerUid)
        );
        
        console.log('🔍 Provádím dotaz na existující konverzace...');
        const querySnapshot = await getDocs(q);
        console.log('📊 Nalezeno konverzací:', querySnapshot.size);
        
        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data();
            console.log('📄 Kontroluji konverzaci:', docSnapshot.id, data);
            if (data.participants.includes(sellerUid) && data.listingId === listingId) {
                console.log('✅ Nalezena existující konverzace:', docSnapshot.id);
                return docSnapshot.id;
            }
        }
        
        // Vytvořit novou konverzaci
        console.log('🆕 Vytvářím novou konverzaci...');
        const conversationData = {
            listingId: listingId,
            participants: [sellerUid, buyerUid],
            unread: {
                [sellerUid]: 0,
                [buyerUid]: 0
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        console.log('📝 Data konverzace:', conversationData);
        const docRef = await addDoc(conversationsRef, conversationData);
        console.log('✅ Nová konverzace vytvořena:', docRef.id);
        
        return docRef.id;
        
    } catch (error) {
        console.error('Chyba při vytváření/nalezení konverzace:', error);
        throw error;
    }
}

// Kontaktování inzerenta
async function contactSeller(listingId, sellerUid, listingTitle) {
    try {
        console.log('📞 Kontaktuji prodejce v chat okně:', { listingId, sellerUid, listingTitle });
        
        const currentUser = window.firebaseAuth.currentUser;
        if (!currentUser) {
            showMessage('Pro kontaktování se prosím přihlaste', 'error');
            return;
        }
        
        if (currentUser.uid === sellerUid) {
            showMessage('Nemůžete kontaktovat sami sebe', 'error');
            return;
        }
        
        console.log('✅ Kontrola přihlášení prošla, vytvářím/vyhledávám konverzaci...');
        // Vytvořit nebo najít konverzaci
        const conversationId = await getOrCreateConversation(listingId, sellerUid, currentUser.uid);
        
        console.log('✅ Konverzace připravena:', conversationId);
        
        // Aktualizovat název konverzace pokud je nová
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await updateDoc(doc(window.firebaseDb, 'conversations', conversationId), {
            listingTitle: listingTitle
        });
        
        console.log('✅ Název inzerátu aktualizován');
        
        // Přesměrovat na chat
        console.log('🔄 Přesměrovávám na chat...');
        window.location.href = `chat.html?conversation=${conversationId}`;
        
    } catch (error) {
        console.error('❌ Chyba při kontaktování:', error);
        showMessage('Nepodařilo se kontaktovat inzerenta: ' + error.message, 'error');
    }
}

// Event listenery pro chat
function setupChatEventListeners() {
    console.log('🔧 Nastavuji event listenery pro chat v chat okně...');
    
    // Odeslání zprávy na Enter
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('⌨️ Enter stisknut, odesílám zprávu...');
                sendMessage();
            }
        });
        console.log('✅ Enter listener nastaven');
    } else {
        console.warn('⚠️ messageInput nenalezen');
    }
    
    // Tlačítko odeslat
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            console.log('🖱️ Send tlačítko kliknuto, odesílám zprávu...');
            sendMessage();
        });
        console.log('✅ Send button listener nastaven');
    } else {
        console.warn('⚠️ sendButton nenalezen');
    }
    
    // Tlačítko zpět
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            console.log('🖱️ Back tlačítko kliknuto, zavírám konverzaci...');
            document.getElementById('chatWindow').style.display = 'none';
            document.getElementById('conversationsList').style.display = 'block';
            currentConversationId = null;
        });
        console.log('✅ Back button listener nastaven');
    } else {
        console.warn('⚠️ backButton nenalezen');
    }
    
    console.log('✅ Všechny event listenery nastaveny');
}

// Pomocné funkce
function formatTime(date) {
    if (!date) {
        console.log('⚠️ Prázdné datum pro formatTime');
        return 'právě teď';
    }
    
    const now = new Date();
    let diff;
    
    if (date.toDate && typeof date.toDate === 'function') {
        diff = now - date.toDate();
    } else if (date instanceof Date) {
        diff = now - date;
    } else {
        console.log('⚠️ Neplatné datum:', date);
        return 'právě teď';
    }
    
    console.log('🕒 Formátuji čas pro chat zprávu v chat okně:', { date, now, diff });
    
    if (diff < 60000) return 'právě teď';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('cs-CZ');
}

function scrollToBottom() {
    console.log('📜 Scrolluji na konec zpráv v chat okně');
    
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        console.log('✅ Container pro zprávy nalezen pro scroll');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        console.log('✅ Scroll dokončen:', messagesContainer.scrollTop, messagesContainer.scrollHeight);
    } else {
        console.error('❌ Container pro zprávy nenalezen pro scroll');
    }
}

function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Pro chat zprávy se nepoužívají notifikace, pouze logování
    if (type === 'success' && message.includes('Zpráva')) {
        console.log('✅ Zpráva odeslána - zobrazí se v chat okně');
        return;
    }
    
    // Vytvořit zprávu pouze pro chyby
    if (type === 'error') {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Scroll na konec
        setTimeout(() => {
            messageDiv.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Testovací funkce pro vytvoření konverzace
async function testCreateConversation() {
    try {
        console.log('🧪 Testování vytvoření konverzace v chat okně...');
        
        const currentUser = window.firebaseAuth?.currentUser;
        if (!currentUser) {
            console.error('❌ Uživatel není přihlášen');
            showMessage('Pro testování se prosím přihlaste', 'error');
            return;
        }
        
        console.log('✅ Uživatel přihlášen:', currentUser.uid);
        console.log('✅ Firebase DB:', !!window.firebaseDb);
        
        // Vytvořit testovací konverzaci
        const testListingId = 'test-listing-' + Date.now();
        const testSellerUid = 'test-seller-' + Date.now();
        
        console.log('🎯 Vytvářím testovací konverzaci...');
        const conversationId = await getOrCreateConversation(testListingId, testSellerUid, currentUser.uid);
        
        console.log('✅ Konverzace vytvořena:', conversationId);
        
        // Aktualizovat název
        const { updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await updateDoc(doc(window.firebaseDb, 'conversations', conversationId), {
            listingTitle: 'Testovací konverzace'
        });
        
        console.log('✅ Název aktualizován');
        
        // Přesměrovat na chat
        console.log('🔄 Přesměrovávám na chat...');
        window.location.href = `chat.html?conversation=${conversationId}`;
        
        // Zobrazit úspěch pouze v konzoli, ne jako notifikaci
        console.log('✅ Testovací konverzace vytvořena v chat okně!');
        
    } catch (error) {
        console.error('❌ Chyba při testování:', error);
        showMessage('Test selhal: ' + error.message, 'error');
    }
}

// Otevření profilu uživatele
function openUserProfile() {
    console.log('👤 Otevírám profil uživatele v chat okně');
    
    if (!currentChatUser) {
        console.error('❌ Žádný uživatel není vybrán pro profil');
        showMessage('Žádný uživatel není vybrán', 'error');
        return;
    }
    
    console.log('✅ Zobrazuji profil pro uživatele:', currentChatUser);
    
    // Naplnit profil modal
    fillUserProfile(currentChatUser);
    
    // Načíst inzeráty uživatele
    loadUserAds(currentChatUser.uid);
    
    // Načíst pinned inzerát
    loadPinnedAd();
    
    // Zobrazit modal
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('✅ Profil modal zobrazen');
    } else {
        console.error('❌ Profil modal nenalezen');
    }
}

// Zavření profilu uživatele
function closeUserProfile() {
    console.log('🔒 Zavírám profil uživatele');
    
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Profil modal zavřen');
    }
}

// Naplnění profilu uživatele
function fillUserProfile(user) {
    console.log('📝 Naplňuji profil uživatele:', user);
    
    // Základní informace
    const userName = document.getElementById('profileUserName');
    const userEmail = document.getElementById('profileUserEmail');
    const userStatus = document.getElementById('profileUserStatus');
    const userBio = document.getElementById('profileUserBio');
    
    if (userName) userName.textContent = user.name || user.displayName || 'Uživatel';
    if (userEmail) userEmail.textContent = user.email || 'N/A';
    if (userStatus) userStatus.textContent = 'Online';
    if (userBio) userBio.textContent = user.bio || 'Žádné informace o uživateli.';
    
    // Statistiky
    const adsCount = document.getElementById('profileAdsCount');
    const rating = document.getElementById('profileRating');
    const joined = document.getElementById('profileJoined');
    
    if (adsCount) adsCount.textContent = currentChatUserAds.length;
    if (rating) rating.textContent = user.rating || '5.0';
    if (joined) joined.textContent = user.createdAt ? new Date(user.createdAt).getFullYear() : '2024';
    
    // Avatar
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (avatarLarge) {
        avatarLarge.innerHTML = `<i class="fas fa-user"></i>`;
    }
    
    console.log('✅ Profil naplněn pro uživatele:', user.name || user.displayName);
}

// Načtení inzerátů uživatele
async function loadUserAds(userId) {
    try {
        console.log('📋 Načítám inzeráty uživatele:', userId);
        
        if (!window.firebaseDb) {
            throw new Error('Firebase DB není dostupný');
        }
        
        const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst inzeráty z users/{userId}/inzeraty
        const adsRef = collection(window.firebaseDb, 'users', userId, 'inzeraty');
        const q = query(adsRef, where('status', '==', 'active'));
        
        console.log('🔍 Provádím dotaz na inzeráty...');
        const querySnapshot = await getDocs(q);
        console.log('📊 Nalezeno inzerátů:', querySnapshot.size);
        
        currentChatUserAds = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📄 Inzerát:', doc.id, data);
            currentChatUserAds.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log('✅ Načteny inzeráty:', currentChatUserAds.length);
        
        // Zobrazit inzeráty
        displayUserAds();
        
    } catch (error) {
        console.error('❌ Chyba při načítání inzerátů:', error);
        showMessage('Nepodařilo se načíst inzeráty: ' + error.message, 'error');
    }
}

// Zobrazení inzerátů uživatele
function displayUserAds() {
    console.log('🖼️ Zobrazuji inzeráty uživatele:', currentChatUserAds.length);
    
    const adsList = document.getElementById('userAdsList');
    if (!adsList) {
        console.error('❌ Container pro inzeráty nenalezen');
        return;
    }
    
    if (currentChatUserAds.length === 0) {
        adsList.innerHTML = '<div class="no-ads">Uživatel nemá žádné aktivní inzeráty</div>';
        return;
    }
    
    const html = currentChatUserAds.map(ad => {
        return `
            <div class="user-ad-item" onclick="viewAd('${ad.id}')">
                <h5>${ad.title}</h5>
                <p>${ad.description}</p>
                <div class="user-ad-price">${ad.price} Kč</div>
            </div>
        `;
    }).join('');
    
    adsList.innerHTML = html;
    console.log('✅ Inzeráty zobrazeny');
}

// Zobrazení inzerátu
function viewAd(adId) {
    console.log('👁️ Zobrazuji inzerát:', adId);
    
    // Najít inzerát
    const ad = currentChatUserAds.find(a => a.id === adId);
    if (!ad) {
        console.error('❌ Inzerát nenalezen');
        return;
    }
    
    // Zobrazit detail inzerátu (můžete implementovat modal nebo přesměrování)
    showMessage(`Zobrazuji inzerát: ${ad.title}`, 'info');
    
    // Zavřít profil modal
    closeUserProfile();
}

// Načtení informací o uživateli
async function loadUserInfo(userId) {
    try {
        console.log('👤 Načítám informace o uživateli:', userId);
        
        if (!window.firebaseDb) {
            throw new Error('Firebase DB není dostupný');
        }
        
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst informace o uživateli z users/{userId}/profile/profile
        const userRef = doc(window.firebaseDb, 'users', userId, 'profile', 'profile');
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log('📄 Uživatel nalezen:', userData);
            
            // Aktualizovat chat header
            updateChatHeader({
                uid: userId,
                ...userData
            });
        } else {
            console.log('⚠️ Uživatel nenalezen, používám základní informace');
            
            // Použít základní informace
            updateChatHeader({
                uid: userId,
                name: 'Uživatel',
                email: 'N/A',
                displayName: 'Uživatel'
            });
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání informací o uživateli:', error);
        
        // Použít základní informace při chybě
        updateChatHeader({
            uid: userId,
            name: 'Uživatel',
            email: 'N/A',
            displayName: 'Uživatel'
        });
    }
}

// Aktualizace chat header s informacemi o uživateli
function updateChatHeader(user) {
    console.log('🔄 Aktualizuji chat header s informacemi o uživateli:', user);
    
    currentChatUser = user;
    
    const chatTitle = document.getElementById('chatTitle');
    const userStatus = document.getElementById('userStatus');
    const userAvatarSmall = document.getElementById('userAvatarSmall');
    
    if (chatTitle) {
        chatTitle.textContent = user.name || user.displayName || 'Uživatel';
    }
    
    if (userStatus) {
        userStatus.textContent = 'Online';
    }
    
    if (userAvatarSmall) {
        userAvatarSmall.innerHTML = `<i class="fas fa-user"></i>`;
    }
    
    console.log('✅ Chat header aktualizován s uživatelem:', user.name || user.displayName);
}

// Načtení pinned inzerátu
async function loadPinnedAd() {
    try {
        console.log('📌 Načítám pinned inzerát pro konverzaci:', currentConversationId);
        
        if (!currentConversationId) {
            console.log('⚠️ Žádná aktivní konverzace');
            displayPinnedAd(null);
            return;
        }
        
        if (!window.firebaseDb) {
            throw new Error('Firebase DB není dostupný');
        }
        
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst informace o konverzaci
        const conversationRef = doc(window.firebaseDb, 'conversations', currentConversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (conversationSnap.exists()) {
            const conversationData = conversationSnap.data();
            console.log('📄 Konverzace nalezena:', conversationData);
            
            if (conversationData.listingId) {
                console.log('🔍 Hledám původní inzerát pro profil:', conversationData.listingId);
                
                // Najít původní inzerát v users/{userId}/inzeraty
                // Nejdříve musíme najít, ve kterém uživateli je inzerát
                const otherParticipant = conversationData.participants.find(p => p !== currentUserId);
                console.log('🔍 Hledám inzerát u uživatele pro profil:', otherParticipant);
                
                if (otherParticipant) {
                    const serviceRef = doc(window.firebaseDb, 'users', otherParticipant, 'inzeraty', conversationData.listingId);
                    const serviceSnap = await getDoc(serviceRef);
                    
                    if (serviceSnap.exists()) {
                        const serviceData = serviceSnap.data();
                        console.log('📄 Původní inzerát nalezen pro profil:', serviceData);
                        
                        currentPinnedAd = {
                            id: conversationData.listingId,
                            ...serviceData
                        };
                        
                        displayPinnedAd(currentPinnedAd);
                    } else {
                        console.log('⚠️ Původní inzerát nenalezen v users/{userId}/inzeraty pro profil');
                        displayPinnedAd(null);
                    }
                } else {
                    console.log('⚠️ Nepodařilo se najít druhého účastníka konverzace pro profil');
                    displayPinnedAd(null);
                }
            } else {
                console.log('⚠️ Konverzace nemá listingId');
                displayPinnedAd(null);
            }
        } else {
            console.log('⚠️ Konverzace nenalezena');
            displayPinnedAd(null);
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání pinned inzerátu:', error);
        displayPinnedAd(null);
    }
}

// Zobrazení pinned inzerátu
function displayPinnedAd(ad) {
    console.log('🖼️ Zobrazuji pinned inzerát:', ad);
    
    const pinnedAdContainer = document.getElementById('pinnedAd');
    if (!pinnedAdContainer) {
        console.error('❌ Container pro pinned inzerát nenalezen');
        return;
    }
    
    if (!ad) {
        pinnedAdContainer.innerHTML = `
            <div class="no-pinned-ad">
                <i class="fas fa-info-circle"></i>
                <p>Původní inzerát není dostupný</p>
            </div>
        `;
        return;
    }
    
    // Získat ikonu podle kategorie
    const categoryIcon = getCategoryIcon(ad.category);
    
    pinnedAdContainer.innerHTML = `
        <div class="pinned-ad-content">
            <div class="pinned-ad-header">
                <div class="pinned-ad-icon">
                    <i class="${categoryIcon}"></i>
                </div>
                <h3 class="pinned-ad-title">${ad.title}</h3>
                <div class="pinned-ad-price">${ad.price}</div>
            </div>
            <p class="pinned-ad-description">${ad.description}</p>
            <div class="pinned-ad-meta">
                <span class="pinned-ad-category">${getCategoryName(ad.category)}</span>
                <span class="pinned-ad-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${ad.location}
                </span>
            </div>
        </div>
    `;
    
    console.log('✅ Pinned inzerát zobrazen');
}

// Získání ikony podle kategorie
function getCategoryIcon(category) {
    const icons = {
        'technical': 'fas fa-tools',
        'education': 'fas fa-graduation-cap',
        'design': 'fas fa-palette',
        'home': 'fas fa-home',
        'transport': 'fas fa-truck',
        'health': 'fas fa-heartbeat',
        'business': 'fas fa-briefcase',
        'other': 'fas fa-ellipsis-h'
    };
    return icons[category] || 'fas fa-tag';
}

// Získání názvu kategorie
function getCategoryName(category) {
    const names = {
        'technical': 'Technické služby',
        'education': 'Vzdělávání',
        'design': 'Design',
        'home': 'Domácnost',
        'transport': 'Doprava',
        'health': 'Zdraví',
        'business': 'Obchod',
        'other': 'Ostatní'
    };
    return names[category] || 'Ostatní';
}

// Načtení pinned inzerátu pro chat
async function loadChatPinnedAd() {
    try {
        console.log('📌 Načítám pinned inzerát pro chat:', currentConversationId);
        console.log('🔍 Aktuální currentConversationId:', currentConversationId);
        
        if (!currentConversationId) {
            console.log('⚠️ Žádná aktivní konverzace');
            displayChatPinnedAd(null);
            return;
        }
        
        if (!window.firebaseDb) {
            throw new Error('Firebase DB není dostupný');
        }
        
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Načíst informace o konverzaci
        const conversationRef = doc(window.firebaseDb, 'conversations', currentConversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (conversationSnap.exists()) {
            const conversationData = conversationSnap.data();
            console.log('📄 Konverzace nalezena:', conversationData);
            
            if (conversationData.listingId) {
                console.log('🔍 Hledám původní inzerát:', conversationData.listingId);
                
                // Najít původní inzerát v users/{userId}/inzeraty
                // Nejdříve musíme najít, ve kterém uživateli je inzerát
                const otherParticipant = conversationData.participants.find(p => p !== currentUserId);
                console.log('🔍 Hledám inzerát u uživatele:', otherParticipant);
                
                if (otherParticipant) {
                    const serviceRef = doc(window.firebaseDb, 'users', otherParticipant, 'inzeraty', conversationData.listingId);
                    const serviceSnap = await getDoc(serviceRef);
                    
                    if (serviceSnap.exists()) {
                        const serviceData = serviceSnap.data();
                        console.log('📄 Původní inzerát nalezen:', serviceData);
                        
                        currentPinnedAd = {
                            id: conversationData.listingId,
                            ...serviceData
                        };
                        
                        console.log('✅ Volám displayChatPinnedAd s inzerátem:', currentPinnedAd);
                        displayChatPinnedAd(currentPinnedAd);
                    } else {
                        console.log('⚠️ Původní inzerát nenalezen v users/{userId}/inzeraty');
                        displayChatPinnedAd(null);
                    }
                } else {
                    console.log('⚠️ Nepodařilo se najít druhého účastníka konverzace');
                    displayChatPinnedAd(null);
                }
            } else {
                console.log('⚠️ Konverzace nemá listingId');
                displayChatPinnedAd(null);
            }
        } else {
            console.log('⚠️ Konverzace nenalezena');
            displayChatPinnedAd(null);
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání pinned inzerátu pro chat:', error);
        displayChatPinnedAd(null);
    }
}

// Zobrazení pinned inzerátu v chatu
function displayChatPinnedAd(ad) {
    console.log('🖼️ Zobrazuji pinned inzerát v chatu:', ad);
    
    const chatPinnedAdContainer = document.getElementById('chatPinnedAd');
    console.log('🔍 Container pro chat pinned inzerát:', chatPinnedAdContainer);
    
    if (!chatPinnedAdContainer) {
        console.error('❌ Container pro chat pinned inzerát nenalezen');
        return;
    }
    
    if (!ad) {
        console.log('⚠️ Žádný inzerát k zobrazení, skrývám container');
        chatPinnedAdContainer.style.display = 'none';
        return;
    }
    
    // Získat ikonu podle kategorie
    const categoryIcon = getCategoryIcon(ad.category);
    
    chatPinnedAdContainer.innerHTML = `
        <div class="chat-pinned-ad-content" onclick="showPinnedAdDetails('${ad.id}')">
            <div class="chat-pinned-ad-icon">
                <i class="${categoryIcon}"></i>
            </div>
            <div class="chat-pinned-ad-info">
                <h4 class="chat-pinned-ad-title">${ad.title}</h4>
                <p class="chat-pinned-ad-price">${ad.price}</p>
            </div>
            <button class="chat-pinned-ad-close" onclick="event.stopPropagation(); closeChatPinnedAd()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    chatPinnedAdContainer.style.display = 'block';
    console.log('✅ Pinned inzerát zobrazen v chatu');
    console.log('🔍 Container display style:', chatPinnedAdContainer.style.display);
    console.log('🔍 Container innerHTML:', chatPinnedAdContainer.innerHTML.substring(0, 100) + '...');
}

// Zavření pinned inzerátu v chatu
function closeChatPinnedAd() {
    console.log('🔒 Zavírám pinned inzerát v chatu');
    
    const chatPinnedAdContainer = document.getElementById('chatPinnedAd');
    if (chatPinnedAdContainer) {
        chatPinnedAdContainer.style.display = 'none';
        console.log('✅ Pinned inzerát zavřen');
    }
}

// Zobrazení detailů pinned inzerátu
function showPinnedAdDetails(adId) {
    console.log('🔍 Zobrazuji detaily pinned inzerátu:', adId);
    
    if (!currentPinnedAd) {
        console.error('❌ Žádný pinned inzerát není načten');
        return;
    }
    
    // Vytvoření modalu s detaily služby (stejné jako v services.js)
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content service-details-modal">
            <div class="modal-header">
                <h2>${currentPinnedAd.title}</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="service-details-content">
                <div class="service-detail-section">
                    <h3>Popis služby</h3>
                    <p>${currentPinnedAd.description}</p>
                </div>
                <div class="service-detail-section">
                    <h3>Detaily</h3>
                    <div class="service-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Lokalita:</strong> ${currentPinnedAd.location}</span>
                        </div>
                        ${currentPinnedAd.price ? `
                        <div class="detail-item">
                            <i class="fas fa-tag"></i>
                            <span><strong>Cena:</strong> ${currentPinnedAd.price}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <span><strong>Poskytovatel:</strong> ${currentPinnedAd.userEmail || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span><strong>Přidáno:</strong> ${currentPinnedAd.createdAt ? formatDate(currentPinnedAd.createdAt) : 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tags"></i>
                            <span><strong>Kategorie:</strong> ${getCategoryName(currentPinnedAd.category)}</span>
                        </div>
                    </div>
                </div>
                <div class="service-actions">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); openUserProfile();">
                        <i class="fas fa-user"></i> Profil prodejce
                    </button>
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        Zavřít
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ Modal s detaily pinned inzerátu zobrazen');
}

// Formátování data (stejné jako v services.js)
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('cs-CZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Export funkcí pro globální použití
window.contactSeller = contactSeller;
window.openConversation = openConversation;
window.sendMessage = sendMessage;
window.testCreateConversation = testCreateConversation;
window.openUserProfile = openUserProfile;
window.closeUserProfile = closeUserProfile;
window.viewAd = viewAd;
window.closeChatPinnedAd = closeChatPinnedAd;
window.showPinnedAdDetails = showPinnedAdDetails;
