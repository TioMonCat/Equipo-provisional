import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// PEGA TUS LLAVES EXACTAS DE FIREBASE AQUÍ
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

let modoRegistro = false;

// 1. Mostrar/Ocultar campos extra para el registro
window.cambiarModoAuth = function() {
    modoRegistro = !modoRegistro;
    document.getElementById('auth-titulo').innerText = modoRegistro ? "Registrar Nuevo Piloto" : "Iniciar Sesión";
    document.getElementById('btn-accion-auth').innerText = modoRegistro ? "CREAR CUENTA" : "ENTRAR AL PIT LANE";
    
    // Muestra u oculta el bloque que contiene Nombre y Apellido
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
};

// 2. Procesar los datos
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
            // Validar campos nuevos
            if (!nombre || !apellido) {
                alert("Por favor, ingresa tu nombre y apellido para el registro.");
                return;
            }
            
            // Crear usuario en Firebase Auth
            const credencial = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = credencial.user.uid;

            // Guardar Nombre y Apellido en Firestore
            await setDoc(doc(db, "pilotos", uid), {
                correo: email,
                nombre: nombre,
                apellido: apellido,
                rol: "piloto",
                fechaRegistro: new Date()
            });

            alert("Registro exitoso.");
            mostrarPanelPrivado(`${nombre} ${apellido}`);

        } else {
            // Iniciar sesión
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            const uid = credencial.user.uid;

            // Recuperar datos desde Firestore
            const pilotoDoc = await getDoc(doc(db, "pilotos", uid));
            if (pilotoDoc.exists()) {
                const datos = pilotoDoc.data();
                mostrarPanelPrivado(`${datos.nombre} ${datos.apellido}`);
            } else {
                mostrarPanelPrivado(email);
            }
        }
    } catch (error) {
        console.error("Error en Firebase:", error);
        // Firebase arroja errores en inglés, los filtramos un poco
        if(error.code === 'auth/email-already-in-use') {
            alert("Ese correo ya está registrado.");
        } else if(error.code === 'auth/weak-password') {
            alert("La contraseña debe tener al menos 6 caracteres.");
        } else {
            alert("Error de acceso. Verifica tus credenciales.");
        }
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
        // Limpiar campos
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-pass').value = "";
        document.getElementById('auth-nombre').value = "";
        document.getElementById('auth-apellido').value = "";
        
        // Volver a modo login por defecto
        if(modoRegistro) window.cambiarModoAuth();
    });
};
