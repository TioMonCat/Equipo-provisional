import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
      apiKey: "AIzaSyC5TAQqe8BnKb6-72jO6cMhON9jCw0fzDA",
      authDomain: "paginaequipo-44b7a.firebaseapp.com",
      projectId: "paginaequipo-44b7a",
      storageBucket: "paginaequipo-44b7a.firebasestorage.app",
      messagingSenderId: "701179395550",
      appId: "1:701179395550:web:4e52577f8eac5b91d8714f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LÓGICA DE INTERFAZ ---
let modoRegistro = false;

window.cambiarModoAuth = function() {
    modoRegistro = !modoRegistro;
    document.getElementById('auth-titulo').innerText = modoRegistro ? "Registrar Nuevo Piloto" : "Iniciar Sesión";
    document.getElementById('btn-accion-auth').innerText = modoRegistro ? "CREAR CUENTA" : "INGRESAR AL SISTEMA";
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
};

// --- LÓGICA DE PROCESAMIENTO ---
window.procesarAuth = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const nombre = document.getElementById('auth-nombre').value;
    const apellido = document.getElementById('auth-apellido').value;

    if (!email || !pass) {
        alert("Completa los datos de acceso.");
        return;
    }

    try {
        if (modoRegistro) {
            if (!nombre || !apellido) { alert("Ingresa nombre y apellido."); return; }
            const credencial = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "pilotos", credencial.user.uid), {
                correo: email, nombre: nombre, apellido: apellido, rol: "piloto", fechaRegistro: new Date()
            });
            mostrarPanelPrivado(`${nombre} ${apellido}`);
        } else {
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            const pilotoDoc = await getDoc(doc(db, "pilotos", credencial.user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                mostrarPanelPrivado(`${d.nombre} ${d.apellido}`);
            } else {
                mostrarPanelPrivado(email);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Error de acceso. Revisa tus credenciales.");
    }
};

// --- FUNCIÓN DE REDIRECCIÓN CORREGIDA ---
function mostrarPanelPrivado(nombreCompleto) {
    // 1. Actualizar elementos visuales
    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('acceso-rapido').style.display = "none";
    document.getElementById('panel-privado').style.display = "block";
    document.getElementById('nombre-piloto-activo').innerText = nombreCompleto;

    // 2. Redirección con pequeño retraso para estabilidad
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('inicio');
        } else {
            // Fallback si la función global no responde
            const sections = document.querySelectorAll('.tab-content');
            sections.forEach(s => s.style.display = 'none');
            document.getElementById('inicio').style.display = 'block';
        }
    }, 100);
}

window.cerrarSesion = function() {
    signOut(auth).then(() => {
        document.getElementById('panel-auth').style.display = "block";
        document.getElementById('acceso-rapido').style.display = "block";
        document.getElementById('panel-privado').style.display = "none";
        // Limpiar campos
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-pass').value = "";
        document.getElementById('auth-nombre').value = "";
        document.getElementById('auth-apellido').value = "";
        if(modoRegistro) window.cambiarModoAuth();
    });
};
