import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, getDocs, query, where, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { state } from "./state.js";
import { cargarCarreras } from "./carreras.js";
import { cargarUsuariosAdmin } from "./admin.js";
import { cargarPostulacionesAdmin } from "./postulacion.js";

// FUNCIÓN AUXILIAR: Centraliza la lógica para mostrar u ocultar la UI protegida
function togglePrivateUI(canAccess) {
    const displayState = canAccess ? 'block' : 'none';
    const lockState = canAccess ? 'none' : 'block';
    
    const privateIds = ['garaje-contenido', 'lista-carreras', 'paddock-group', 'reglamento-contenido', 'telemetria-contenido'];
    const guestIds = ['msg-no-login', 'garaje-msg-no-login', 'reglamento-msg-no-login', 'telemetria-msg-no-login'];
    
    privateIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = displayState; });
    guestIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = lockState; });
}

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        try {
            const pilotoDoc = await getDoc(doc(db, "pilotos", user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                mostrarPanelPrivado(`${d.nombre} ${d.apellido}`, d.rol, user.uid, d);
            } else { mostrarPanelPrivado(user.email, "piloto", user.uid, null); }
        } catch (error) { console.error("Error al recuperar la sesión:", error); }
    } else {
        const navAuth = document.getElementById('nav-auth-buttons');
        if(navAuth) navAuth.style.display = "flex";

        const accesoRapido = document.getElementById('acceso-rapido');
        if(accesoRapido) accesoRapido.style.display = "block";
        
        togglePrivateUI(false);
    }
});

export function cambiarModoAuth() {
    state.modoRegistro = !state.modoRegistro;
    document.getElementById('auth-titulo').innerText = state.modoRegistro ? "Solicitar credencial" : "Acceso al Pit Lane";
    document.getElementById('btn-accion-auth').innerText = state.modoRegistro ? "CREAR CUENTA" : "INICIAR SESIÓN";
    document.getElementById('campos-registro').style.display = state.modoRegistro ? "block" : "none";

    const passInput = document.getElementById('auth-pass');
    if (passInput) {
        passInput.placeholder = state.modoRegistro ? "Nueva contraseña" : "Contraseña";
    }

    const spamText = document.getElementById('auth-spam-text');
    if (spamText) {
        spamText.innerHTML = state.modoRegistro 
            ? `Te enviaremos un enlace de confirmación. Asegúrate de revisar tu carpeta de <strong>Spam o Correo No Deseado</strong>.`
            : `Recuerda que debes verificar tu correo antes de ingresar. Revisa tu carpeta de <strong>Spam o Correo No Deseado</strong>.`;
    }

    const toggleText = document.getElementById('auth-toggle-text');
    if (toggleText) {
        toggleText.innerHTML = state.modoRegistro 
            ? `¿Ya tienes credencial? <br><a href="#" onclick="event.preventDefault(); cambiarModoAuth();" style="color: var(--acento); text-decoration: none; border-bottom: 1px solid var(--acento);">Acceder al Pit Lane</a>`
            : `¿Nuevo en el equipo? <br><a href="#" onclick="event.preventDefault(); cambiarModoAuth();" style="color: var(--acento); text-decoration: none; border-bottom: 1px solid var(--acento);">Solicitar credencial de piloto</a>`;
    }
}

export function abrirLogin() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (state.modoRegistro) cambiarModoAuth();
}

export function abrirRegistro() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (!state.modoRegistro) cambiarModoAuth();
}

export function manejarBotonPostulacion() {
    if (state.usuarioActual) {
        if (typeof showSection === 'function') showSection('postulacion');
    } else {
        abrirRegistro();
    }
}

export async function procesarAuth() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const nombre = document.getElementById('auth-nombre').value;
    const apellido = document.getElementById('auth-apellido').value;

    if (!email || !pass) { alert("Completa los datos de acceso."); return; }

    try {
        if (state.modoRegistro) {
            if (!nombre || !apellido) { alert("Ingresa nombre y apellido."); return; }
            const credencial = await createUserWithEmailAndPassword(auth, email, pass);
            
            // Enviar correo de verificación nativo de Firebase
            await sendEmailVerification(credencial.user);
            
            await setDoc(doc(db, "pilotos", credencial.user.uid), {
                correo: email, nombre: nombre, apellido: apellido, rol: "miembro", fechaRegistro: new Date()
            });
            
            // Cerramos la sesión forzosamente hasta que verifique su correo
            await signOut(auth);
            
            document.getElementById('auth-form-container').style.display = "none";
            document.getElementById('registro-mensaje').style.display = "block";
        } else {
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            
            // Comprobar si el correo ya está verificado
            if (!credencial.user.emailVerified) {
                await signOut(auth);
                alert("Tu correo electrónico aún no ha sido verificado. Por favor, revisa tu bandeja de entrada o carpeta de spam y haz clic en el enlace de confirmación.");
                return;
            }

            const pilotoDoc = await getDoc(doc(db, "pilotos", credencial.user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                mostrarPanelPrivado(`${d.nombre} ${d.apellido}`, d.rol, credencial.user.uid, d);
            } else { mostrarPanelPrivado(email, "piloto", credencial.user.uid, null); }
        }
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            alert("Este correo ya se encuentra registrado en el sistema.");
        } else {
            alert("Error de acceso. Revisa tus credenciales.");
        }
    }
}

async function mostrarPanelPrivado(nombreCompleto, rol, uid, userData) {
    state.usuarioActual = { uid: uid, nombre: nombreCompleto, categoria: userData?.categoria || "" };
    state.rolActual = rol;

    let tienePostulacionPendiente = false;
    if (rol === "miembro") {
        try {
            const q = query(collection(db, "postulaciones"), where("uid", "==", uid), where("estado", "==", "Pendiente"));
            const snap = await getDocs(q);
            if (!snap.empty) {
                tienePostulacionPendiente = true;
            }
        } catch(e) { console.error(e); }
    }

    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('acceso-rapido').style.display = (rol === "admin" || rol === "miembro") ? "block" : "none";

    const btnPostulacion = document.querySelector('#acceso-rapido button');
    if (btnPostulacion) {
        if (tienePostulacionPendiente) {
            btnPostulacion.disabled = true;
            btnPostulacion.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Postulación en Revisión';
            btnPostulacion.className = 'btn-secundario';
            btnPostulacion.style.opacity = "0.7";
            btnPostulacion.style.cursor = "not-allowed";
            btnPostulacion.style.borderColor = "var(--secundario)";
            btnPostulacion.style.color = "var(--secundario)";
        } else {
            btnPostulacion.disabled = false;
            btnPostulacion.innerHTML = '<i class="fa-solid fa-file-signature"></i> Postular al Equipo';
            btnPostulacion.className = 'btn-destacado';
            btnPostulacion.style.opacity = "1";
            btnPostulacion.style.cursor = "pointer";
            btnPostulacion.style.borderColor = "";
            btnPostulacion.style.color = "";
        }
    }

    // Mostrar opciones de administrador de forma agrupada
    const adminGroup = document.getElementById('admin-group');
    if (adminGroup) adminGroup.style.display = (rol === "admin") ? "block" : "none";

    const navStatus = document.getElementById('nav-user-status');
    if (navStatus) navStatus.style.display = "flex";
    const nombreNav = document.getElementById('nav-nombre-piloto');
    if (nombreNav) nombreNav.innerText = nombreCompleto;

    const catContainer = document.getElementById('nav-categoria-tags');
    const rolContainer = document.getElementById('nav-rol-tags');

    if (catContainer) catContainer.innerHTML = '';
    if (rolContainer) rolContainer.innerHTML = '';

    const cat = userData?.categoria;
    let catHtml = '';
    if (cat === "Ambas") {
        catHtml = `<span class="nav-tag lmp2" style="background: rgba(0, 123, 255, 0.1); color: var(--acento); border-color: var(--acento);">LMP2</span><span class="nav-tag gt3" style="background: rgba(230, 204, 0, 0.1); color: var(--secundario); border-color: var(--secundario);">GT3</span>`;
    } else if (cat === "Ingeniero") {
        catHtml = `<span class="nav-tag ingeniero">Ingeniero</span>`;
    } else if (cat === "LMP2" || cat === "GT3") {
        const cssStyle = cat === "LMP2" ? "background: rgba(0, 123, 255, 0.1); color: var(--acento); border-color: var(--acento);" : "background: rgba(230, 204, 0, 0.1); color: var(--secundario); border-color: var(--secundario);";
        catHtml = `<span class="nav-tag" style="${cssStyle}">${cat}</span>`;
    }
    if (catContainer) catContainer.innerHTML = catHtml;

    if (rol === "admin") {
        if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag admin">Admin</span>`;
    } else if (rol === "ingeniero") {
        if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag ingeniero">Ingeniero</span>`;
    } else if (rol === "piloto") {
        if (!cat) {
            if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag miembro">Reserva</span>`;
        } else {
            if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag" style="background: rgba(255,255,255,0.1); color: var(--texto);">Piloto</span>`;
        }
    } else if (rol === "miembro") {
        if (tienePostulacionPendiente) {
            if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag pendiente">En Revisión</span>`;
        } else {
            if (rolContainer) rolContainer.innerHTML = `<span class="nav-tag miembro">Invitado</span>`;
        }
    }

    const navAuth = document.getElementById('nav-auth-buttons');
    if(navAuth) navAuth.style.display = "none";

    const panelPrivado = document.getElementById('panel-privado');
    const panelCrearCarrera = document.getElementById('panel-crear-carrera');
    
    if (panelPrivado) panelPrivado.style.display = (rol === "admin") ? "block" : "none";
    if (panelCrearCarrera) panelCrearCarrera.style.display = (rol === "admin") ? "block" : "none";

    // Control de acceso a contenido privado (Garaje y Noticias)
    const canAccessPrivate = rol === 'piloto' || rol === 'admin' || rol === 'ingeniero';
    togglePrivateUI(canAccessPrivate);

    if (rol !== "miembro") cargarCarreras();
    if (rol === "admin") {
        cargarUsuariosAdmin();
        cargarPostulacionesAdmin();
    }
    setTimeout(() => { if (typeof showSection === 'function') { showSection('inicio'); } }, 100);
}

export function cerrarSesion() {
    signOut(auth).then(() => {
        if (window.countdownInterval) clearInterval(window.countdownInterval);
        state.usuarioActual = null;
        state.rolActual = "invitado";
        window.location.reload(); // Forma más limpia y robusta de restablecer toda la interfaz
    });
}

export function volverALogin() {
    document.getElementById('registro-mensaje').style.display = "none";
    document.getElementById('auth-form-container').style.display = "block";
    document.getElementById('auth-email').value = "";
    document.getElementById('auth-pass').value = "";
    document.getElementById('auth-nombre').value = "";
    document.getElementById('auth-apellido').value = "";
    if (state.modoRegistro) cambiarModoAuth();
}

window.cambiarModoAuth = cambiarModoAuth; window.abrirLogin = abrirLogin; window.abrirRegistro = abrirRegistro; window.manejarBotonPostulacion = manejarBotonPostulacion; window.procesarAuth = procesarAuth; window.cerrarSesion = cerrarSesion; window.volverALogin = volverALogin;