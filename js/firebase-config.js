// Importamos las librerías de Firebase desde los servidores de Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Tus credenciales únicas (Reemplaza los valores entre comillas)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_DOMINIO.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_BUCKET.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializamos el núcleo de Firebase y la Autenticación
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Creamos la función de Login y la hacemos accesible globalmente
window.loginConGoogle = function() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const usuario = result.user;
            console.log("Autenticado:", usuario);
            alert("¡Bienvenido al equipo, " + usuario.displayName + "!");
        })
        .catch((error) => {
            console.error("Error al iniciar sesión:", error);
            alert("Error al iniciar sesión. Revisa la consola.");
        });
};
