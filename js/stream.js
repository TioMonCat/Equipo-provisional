import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

export function initStreamListener() {
    const banner = document.getElementById('live-stream-banner');
    const link = document.getElementById('stream-link');
    
    // Elementos del panel de administrador
    const adminUrlInput = document.getElementById('admin-stream-url'); 
    const btnToggle = document.getElementById('btn-toggle-stream'); 

    if (!banner) return;

    // Se crea un "listener" al documento "streamStatus" dentro de la colección "teamSettings"
    onSnapshot(doc(db, "teamSettings", "streamStatus"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isStreaming && data.streamUrl) {
                banner.style.display = "block";
                link.href = data.streamUrl;
                
                if (btnToggle) {
                    btnToggle.innerHTML = '<i class="fa-solid fa-power-off"></i> Finalizar Transmisión';
                    btnToggle.className = 'btn-peligro'; // Cambia botón a rojo
                }
                if (adminUrlInput) adminUrlInput.value = data.streamUrl;
            } else {
                banner.style.display = "none";
                if (btnToggle) {
                    btnToggle.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Activar Transmisión';
                    btnToggle.className = 'btn-secundario'; // Regresa al estilo por defecto
                }
            }
        } else {
            banner.style.display = "none";
        }
    });
}

// Iniciar la escucha tan pronto cargue este módulo
initStreamListener();