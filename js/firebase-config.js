// IMPORTAMOS TODAS LAS LIBRERÍAS NECESARIAS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    document.getElementById('auth-titulo').innerText = modoRegistro ? "Solicitar credencial" : "Acceso al Pit Lane";
    document.getElementById('btn-accion-auth').innerText = modoRegistro ? "CREAR CUENTA" : "INICIAR SISTEMAS";
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
};

window.abrirLogin = function() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (modoRegistro) window.cambiarModoAuth();
};

window.abrirRegistro = function() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (!modoRegistro) window.cambiarModoAuth();
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
            cargarRoster(); // Actualizamos la vista de pilotos de inmediato al crearse la cuenta
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
    usuarioActual = { uid: uid, nombre: nombreCompleto };
    rolActual = rol;

    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('acceso-rapido').style.display = "none";
    document.getElementById('panel-privado').style.display = "block";
    document.getElementById('nombre-piloto-activo').innerText = nombreCompleto;

    const navAuth = document.getElementById('nav-auth-buttons');
    if(navAuth) navAuth.style.display = "none";

    const herramientasAdmin = document.getElementById('herramientas-admin');
    const panelCrearCarrera = document.getElementById('panel-crear-carrera');
    
    if (rol === "admin") {
        if(herramientasAdmin) herramientasAdmin.style.display = "block";
        if(panelCrearCarrera) panelCrearCarrera.style.display = "block";
    } else {
        if(herramientasAdmin) herramientasAdmin.style.display = "none";
        if(panelCrearCarrera) panelCrearCarrera.style.display = "none";
    }

    document.getElementById('msg-no-login').style.display = "none";
    document.getElementById('lista-carreras').style.display = "block";

    cargarCarreras();

    setTimeout(() => {
        if (typeof showSection === 'function') { showSection('inicio'); }
    }, 100);
}

window.cerrarSesion = function() {
    signOut(auth).then(() => {
        usuarioActual = null;
        rolActual = "piloto";

        document.getElementById('panel-auth').style.display = "block";
        document.getElementById('acceso-rapido').style.display = "block";
        document.getElementById('panel-privado').style.display = "none";
        
        const navAuth = document.getElementById('nav-auth-buttons');
        if(navAuth) navAuth.style.display = "flex";
        
        document.getElementById('msg-no-login').style.display = "block";
        document.getElementById('lista-carreras').style.display = "none";
        document.getElementById('panel-crear-carrera').style.display = "none";
        document.getElementById('lista-carreras').innerHTML = ""; 
        
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

window.crearCarrera = async function() {
    const nombre = document.getElementById('nueva-carrera-nombre').value;
    const fecha = document.getElementById('nueva-carrera-fecha').value;
    const pista = document.getElementById('nueva-carrera-pista').value;

    if(!nombre || !fecha || !pista) { alert("Completa todos los datos del evento."); return; }

    try {
        await addDoc(collection(db, "carreras"), {
            nombre: nombre,
            fecha: fecha,
            pista: pista,
            inscritos: []
        });
        
        alert("Evento guardado en el servidor.");
        
        document.getElementById('nueva-carrera-nombre').value = "";
        document.getElementById('nueva-carrera-fecha').value = "";
        document.getElementById('nueva-carrera-pista').value = "";
        
        cargarCarreras(); 
    } catch (error) {
        console.error("Error al crear carrera:", error);
    }
};

window.cargarCarreras = async function() {
    const contenedor = document.getElementById('lista-carreras');
    contenedor.innerHTML = "<p style='text-align:center;'>Cargando telemetría de eventos...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "carreras"));
        contenedor.innerHTML = ""; 

        if(querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-secundario);'>No hay eventos programados en el calendario.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const carrera = docSnap.data();
            const idCarrera = docSnap.id;
            const inscritos = carrera.inscritos || []; 
            
            const estoyInscrito = inscritos.some(p => p.uid === usuarioActual.uid);

            let htmlInscritos = inscritos.map(p => `<li><i class="fa-solid fa-helmet-safety"></i> ${p.nombre}</li>`).join('');
            if(htmlInscritos === "") htmlInscritos = "<li style='color: #666;'>Ningún piloto confirmado.</li>";
            
            let htmlBotones = "";
            if(estoyInscrito) {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', false)" class="btn-peligro" style="flex: 1;">Retirarse</button>`;
            } else {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', true)" class="btn-alerta" style="flex: 1;">Confirmar Asistencia</button>`;
            }

            if(rolActual === "admin") {
                htmlBotones += `<button onclick="eliminarCarrera('${idCarrera}')" class="btn-peligro" style="flex: 0.5;"><i class="fa-solid fa-trash"></i></button>`;
            }

            contenedor.innerHTML += `
                <div class="panel-racing" style="padding: 25px;">
                    <h3 style="color: var(--texto); font-size: 1.8rem; border-bottom:none; padding-bottom:0;">${carrera.nombre}</h3>
                    <p style="color: var(--acento); font-family: 'Chakra Petch'; font-size: 1.1rem; margin-top: -10px;">
                        <i class="fa-regular fa-calendar"></i> ${carrera.fecha} &nbsp;|&nbsp; <i class="fa-solid fa-flag-checkered"></i> ${carrera.pista}
                    </p>
                    
                    <div class="telemetria-data">
                        <p>STATUS DE PARRILLA:</p>
                        <ul>${htmlInscritos}</ul>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        ${htmlBotones}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error al cargar carreras:", error);
        contenedor.innerHTML = "<p>Error de conexión al cargar los eventos.</p>";
    }
};

window.cambiarInscripcion = async function(idCarrera, meInscribo) {
    try {
        const refCarrera = doc(db, "carreras", idCarrera);
        if (meInscribo) {
            await updateDoc(refCarrera, {
                inscritos: arrayUnion({ uid: usuarioActual.uid, nombre: usuarioActual.nombre })
            });
        } else {
            await updateDoc(refCarrera, {
                inscritos: arrayRemove({ uid: usuarioActual.uid, nombre: usuarioActual.nombre })
            });
        }
        cargarCarreras(); 
    } catch (error) {
        console.error("Error al actualizar inscripción:", error);
    }
};

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

// ==========================================
// LÓGICA DE ROSTER (PILOTOS)
// ==========================================

window.cargarRoster = async function() {
    const contenedor = document.getElementById('contenedor-pilotos');
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: var(--texto-secundario);'>Cargando datos de pilotos...</p>";

    try {
        // Solo traemos a los usuarios que sean 'piloto' o 'admin'
        const q = query(collection(db, "pilotos"), where("rol", "in", ["piloto", "admin"]));
        const querySnapshot = await getDocs(q);
        
        contenedor.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: var(--texto-secundario);'>Aún no hay pilotos en el roster oficial.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Procesamos el nombre para que salga como "Benjamín V."
            let nombreFormateado = data.nombre || "Piloto";
            if (data.apellido) {
                nombreFormateado += ` ${data.apellido.charAt(0).toUpperCase()}.`;
            }

            let etiquetaRol = data.rol === "admin" ? "Director / Driver" : "Driver Oficial";
            const imagenPorDefecto = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop";
            
            contenedor.innerHTML += `
                <div class="card-piloto">
                    <img src="${imagenPorDefecto}" class="img-piloto">
                    <h3>${nombreFormateado}</h3>
                    <p><i class="fa-solid fa-location-dot" style="color:var(--acento)"></i> Archivo Clasificado</p>
                    <span class="rol-tag">${etiquetaRol}</span>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error cargando el roster:", error);
        contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: #d9534f;'>Error al conectar con la telemetría.</p>";
    }
};

// Llamamos a la función automáticamente cuando el script termine de cargar
cargarRoster();
