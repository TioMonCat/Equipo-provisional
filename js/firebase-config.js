import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 1. FUNCIONES DE INTERFAZ (Las cargamos primero para evitar bloqueos)
// ==========================================
let modoRegistro = false;

window.cambiarModoAuth = function() {
    modoRegistro = !modoRegistro;
    document.getElementById('auth-titulo').innerText = modoRegistro ? "Registrar Nuevo Piloto" : "Iniciar Sesión";
    document.getElementById('btn-accion-auth').innerText = modoRegistro ? "CREAR CUENTA" : "ENTRAR AL PIT LANE";
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
};

// ==========================================
// 2. CONFIGURACIÓN DE FIREBASE (¡Pega tus llaves aquí!)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC5TAQqe8BnKb6-72jO6cMhON9jCw0fzDA",
    authDomain: "paginaequipo-44b7a.firebaseapp.com",
    projectId: "paginaequipo-44b7a",
    storageBucket: "paginaequipo-44b7a.firebasestorage.app",
    messagingSenderId: "701179395550",
    appId: "1:701179395550:web:4e52577f8eac5b91d8714f"
};

// Inicializamos servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 3. LÓGICA DE BASE DE DATOS
// ==========================================
window.procesarAuth = async function() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const nombre = document.getElementById('auth-nombre').value;
    const apellido = document.getElementById('auth-apellido').value;

    if (!email || !pass) {
        alert("El correo y la contraseña son obligatorios.");
        return;
    }

    try {
        if (modoRegistro) {
            if (!nombre || !apellido) { alert("Ingresa tu nombre y apellido."); return; }
            const credencial = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "pilotos", credencial.user.uid), {
                correo: email, nombre: nombre, apellido: apellido, rol: "piloto", fechaRegistro: new Date()
            });
            alert("Registro exitoso.");
            mostrarPanelPrivado(`${nombre} ${apellido}`);
        } else {
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            const pilotoDoc = await getDoc(doc(db, "pilotos", credencial.user.uid));
            if (pilotoDoc.exists()) {
                mostrarPanelPrivado(`${pilotoDoc.data().nombre} ${pilotoDoc.data().apellido}`);
            } else {
                mostrarPanelPrivado(email);
            }
        }
    } catch (error) {
        console.error("Error en Firebase:", error);
        alert("Error de acceso. Revisa la consola para más detalles.");
    }
};

function mostrarPanelPrivado(nombreCompleto) {
    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('panel-privado').style.display = "block";
    document.getElementById('nombre-piloto-activo').innerText = nombreCompleto;
}

window.cerrarSesion = function() {
    signOut(auth).then(() => {
        document.getElementById('panel-auth').style.display = "block";
        document.getElementById('panel-privado').style.display = "none";
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-pass').value = "";
        document.getElementById('auth-nombre').value = "";
        document.getElementById('auth-apellido').value = "";
        if(modoRegistro) window.cambiarModoAuth();
    });
};
