import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Inicializar Realtime Database
const dbRT = getDatabase();

// Crear un ID de sesión aleatorio único para la pestaña actual del navegador
const sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let currentUserUid = null;

const connectedRef = ref(dbRT, '.info/connected');
const myStatusRef = ref(dbRT, `/status/${sessionId}`);

function setupPresence() {
    onValue(connectedRef, (snapshot) => {
        // Si la conexión es falsa, no hacemos nada
        if (snapshot.val() === false) return;

        // Cuando el usuario cierre la pestaña o pierda internet, elimina su nodo
        onDisconnect(myStatusRef).remove().then(() => {
            // Cuando se conecta, crea el nodo
            set(myStatusRef, {
                state: 'online',
                uid: currentUserUid || 'anonymous',
                timestamp: Date.now()
            });
        });
    });
}

// Detectar si el usuario inicia o cierra sesión para asignarle su UID al nodo
onAuthStateChanged(auth, (user) => {
    currentUserUid = user ? user.uid : null;
    set(myStatusRef, {
        state: 'online',
        uid: currentUserUid || 'anonymous',
        timestamp: Date.now()
    });
});

setupPresence();

// Escuchar en tiempo real a TODAS las conexiones de la base de datos
onValue(ref(dbRT, '/status'), (snapshot) => {
    let onlineCount = 0;
    const onlineUids = new Set();
    
    snapshot.forEach((child) => {
        const data = child.val();
        if (data && data.state === 'online') {
            onlineCount++; // Suma al contador general (Incluye invitados)
            if (data.uid && data.uid !== 'anonymous') {
                onlineUids.add(data.uid); // Guarda UIDs de los pilotos oficiales
            }
        }
    });

    // 1. Actualizar el contador en la barra de navegación
    const counterSpan = document.getElementById('online-count-text');
    if (counterSpan) counterSpan.innerText = `${onlineCount} en línea`;

    // Guardar en variable global para que el roster pueda usarlo
    window.onlineUids = onlineUids;
    if (typeof window.actualizarPresenciaRoster === 'function') window.actualizarPresenciaRoster();
});

window.actualizarPresenciaRoster = function() {
    if (!window.onlineUids) return;
    const pilotCards = document.querySelectorAll('.card-piloto');
    pilotCards.forEach(card => {
        const uid = card.getAttribute('data-uid');
        let badge = card.querySelector('.online-badge');
        
        if (uid && window.onlineUids.has(uid)) {
            card.classList.add('online-glow');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'online-badge';
                badge.innerHTML = '<i class="fa-solid fa-signal"></i> Online';
                card.appendChild(badge);
            }
        } else {
            card.classList.remove('online-glow');
            if (badge) badge.remove();
        }
    });
};