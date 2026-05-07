// IMPORTAMOS TODAS LAS LIBRERÍAS NECESARIAS (Añadimos las de colecciones y arrays)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- VARIABLES GLOBALES DE SESIÓN ---
let modoRegistro = false;
let usuarioActual = null; // Guardará {uid, nombre} para las inscripciones
let rolActual = "piloto";

// --- LÓGICA DE INTERFAZ LOGIN ---
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

    if (!email || !pass) { alert("Completa los datos de acceso."); return; }

    try {
        if (modoRegistro) {
            if (!nombre || !apellido) { alert("Ingresa nombre y apellido."); return; }
            const credencial = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "pilotos", credencial.user.uid), {
                correo: email, nombre: nombre, apellido: apellido, rol: "piloto", fechaRegistro: new Date()
            });
            // Pasamos el UID para saber quién es
            mostrarPanelPrivado(`${nombre} ${apellido}`, "piloto", credencial.user.uid);
        } else {
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            const pilotoDoc = await getDoc(doc(db, "pilotos", credencial.user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                mostrarPanelPrivado(`${d.nombre} ${d.apellido}`, d.rol, credencial.user.uid);
            } else {
                mostrarPanelPrivado(email, "piloto", credencial.user.uid);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Error de acceso. Revisa tus credenciales.");
    }
};

// --- REDIRECCIÓN Y ACTIVACIÓN DE VISTAS ---
function mostrarPanelPrivado(nombreCompleto, rol, uid) {
    // Guardamos los datos del usuario logueado en memoria
    usuarioActual = { uid: uid, nombre: nombreCompleto };
    rolActual = rol;

    // Actualizar elementos visuales del inicio
    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('acceso-rapido').style.display = "none";
    document.getElementById('panel-privado').style.display = "block";
    document.getElementById('nombre-piloto-activo').innerText = nombreCompleto;

    // Activar modo Admin en la pestaña de Inicio y Asistencia
    const herramientasAdmin = document.getElementById('herramientas-admin');
    const panelCrearCarrera = document.getElementById('panel-crear-carrera');
    
    if (rol === "admin") {
        if(herramientasAdmin) herramientasAdmin.style.display = "block";
        if(panelCrearCarrera) panelCrearCarrera.style.display = "block";
    } else {
        if(herramientasAdmin) herramientasAdmin.style.display = "none";
        if(panelCrearCarrera) panelCrearCarrera.style.display = "none";
    }

    // Cambiar la vista en la pestaña de Asistencia
    document.getElementById('msg-no-login').style.display = "none";
    document.getElementById('lista-carreras').style.display = "block";

    // Cargar las carreras de la base de datos
    cargarCarreras();

    // Redirección
    setTimeout(() => {
        if (typeof showSection === 'function') { showSection('inicio'); }
    }, 100);
}

window.cerrarSesion = function() {
    signOut(auth).then(() => {
        // Limpiar memoria
        usuarioActual = null;
        rolActual = "piloto";

        // Restaurar vistas de Inicio
        document.getElementById('panel-auth').style.display = "block";
        document.getElementById('acceso-rapido').style.display = "block";
        document.getElementById('panel-privado').style.display = "none";
        
        // Restaurar vistas de Asistencia
        document.getElementById('msg-no-login').style.display = "block";
        document.getElementById('lista-carreras').style.display = "none";
        document.getElementById('panel-crear-carrera').style.display = "none";
        document.getElementById('lista-carreras').innerHTML = ""; // Limpiar historial
        
        const herramientasAdmin = document.getElementById('herramientas-admin');
        if (herramientasAdmin) herramientasAdmin.style.display = "none";

        document.getElementById('auth-email').value = "";
        document.getElementById('auth-pass').value = "";
        if(modoRegistro) window.cambiarModoAuth();
    });
};

// ==========================================
// LÓGICA DE CARRERAS (SISTEMA CRUD)
// ==========================================

// 1. ADMIN: Crear una nueva carrera en Firestore
window.crearCarrera = async function() {
    const nombre = document.getElementById('nueva-carrera-nombre').value;
    const fecha = document.getElementById('nueva-carrera-fecha').value;
    const pista = document.getElementById('nueva-carrera-pista').value;

    if(!nombre || !fecha || !pista) { alert("Completa todos los datos del evento."); return; }

    try {
        // addDoc crea un documento con un ID aleatorio en la colección "carreras"
        await addDoc(collection(db, "carreras"), {
            nombre: nombre,
            fecha: fecha,
            pista: pista,
            inscritos: [] // Empezamos sin pilotos inscritos
        });
        
        alert("Carrera guardada en el calendario oficial.");
        
        // Limpiamos los inputs
        document.getElementById('nueva-carrera-nombre').value = "";
        document.getElementById('nueva-carrera-fecha').value = "";
        document.getElementById('nueva-carrera-pista').value = "";
        
        cargarCarreras(); // Recargamos la lista visual
    } catch (error) {
        console.error("Error al crear carrera:", error);
    }
};

// 2. TODOS: Cargar las carreras y dibujarlas en HTML
window.cargarCarreras = async function() {
    const contenedor = document.getElementById('lista-carreras');
    contenedor.innerHTML = "<p style='text-align:center;'>Cargando telemetría de eventos...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "carreras"));
        contenedor.innerHTML = ""; // Limpiamos el texto de carga

        if(querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-secundario);'>No hay eventos programados por el momento.</p>";
            return;
        }

        // Iterar sobre cada carrera encontrada en la BD
        querySnapshot.forEach((docSnap) => {
            const carrera = docSnap.data();
            const idCarrera = docSnap.id;
            const inscritos = carrera.inscritos || []; // Por si no existe el array
            
            // Comprobar si mi UID está en el array de inscritos de esta carrera
            const estoyInscrito = inscritos.some(p => p.uid === usuarioActual.uid);

            // Crear la lista de nombres HTML
            let htmlInscritos = inscritos.map(p => `<li><i class="fa-solid fa-helmet-safety"></i> ${p.nombre}</li>`).join('');
            if(htmlInscritos === "") htmlInscritos = "<li style='color: #666;'>Ningún piloto confirmado.</li>";
            
            // Decidir qué botones mostrar
            let htmlBotones = "";
            if(estoyInscrito) {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', false)" style="background: #d9534f; margin-top: 10px;">Bajarme del Evento</button>`;
            } else {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', true)" style="background: var(--acento); margin-top: 10px; color: black;">Inscribirme</button>`;
            }

            if(rolActual === "admin") {
                htmlBotones += `<button onclick="eliminarCarrera('${idCarrera}')" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; margin-top: 10px;">Eliminar Carrera (Admin)</button>`;
            }

            // Dibujar la "Tarjeta" de la carrera
            contenedor.innerHTML += `
                <div style="background: var(--tarjeta); padding: 25px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #333;">
                    <h3 style="margin-top:0; color:var(--acento); font-size: 1.5rem;">${carrera.nombre}</h3>
                    <p style="color: var(--texto-secundario);">
                        <strong><i class="fa-regular fa-calendar"></i> Fecha:</strong> ${carrera.fecha} <br>
                        <strong><i class="fa-solid fa-flag-checkered"></i> Pista:</strong> ${carrera.pista}
                    </p>
                    
                    <div style="margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <p style="margin-top:0; font-weight:bold; color: white;">Pilotos Confirmados:</p>
                        <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">${htmlInscritos}</ul>
                    </div>
                    
                    ${htmlBotones}
                </div>
            `;
        });
    } catch (error) {
        console.error("Error al cargar carreras:", error);
        contenedor.innerHTML = "<p>Error de conexión al cargar los eventos.</p>";
    }
};

// 3. PILOTOS: Añadir o quitar su nombre de una carrera
window.cambiarInscripcion = async function(idCarrera, meInscribo) {
    try {
        const refCarrera = doc(db, "carreras", idCarrera);
        if (meInscribo) {
            // Añade mi objeto {uid, nombre} al arreglo de Firebase
            await updateDoc(refCarrera, {
                inscritos: arrayUnion({ uid: usuarioActual.uid, nombre: usuarioActual.nombre })
            });
        } else {
            // Quita mi objeto del arreglo de Firebase
            await updateDoc(refCarrera, {
                inscritos: arrayRemove({ uid: usuarioActual.uid, nombre: usuarioActual.nombre })
            });
        }
        cargarCarreras(); // Recargar para ver los cambios instantáneos
    } catch (error) {
        console.error("Error al actualizar inscripción:", error);
    }
};

// 4. ADMIN: Eliminar completamente la carrera
window.eliminarCarrera = async function(idCarrera) {
    if(confirm("¿Estás seguro de que quieres cancelar y borrar este evento?")) {
        try {
            await deleteDoc(doc(db, "carreras", idCarrera));
            cargarCarreras();
        } catch(error) {
            console.error("Error eliminando la carrera:", error);
        }
    }
}
