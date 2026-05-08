import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, getDocs, query, where, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { state } from "./state.js";
import { cargarCarreras } from "./carreras.js";
import { cargarUsuariosAdmin } from "./admin.js";
import { cargarPostulacionesAdmin } from "./postulacion.js";

onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        try {
            const pilotoDoc = await getDoc(doc(db, "pilotos", user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                await mostrarPanelPrivado(`${d.nombre} ${d.apellido}`, d.rol, user.uid, d);
            } else { await mostrarPanelPrivado(user.email, "piloto", user.uid, null); }

            // Gestionar visibilidad de paneles con acceso restringido
            const rol = state.rolActual;
            const isPilotOrAdmin = rol === 'piloto' || rol === 'admin';

            // Sección Asistencia
            const msgNoLogin = document.getElementById('msg-no-login');
            const listaCarreras = document.getElementById('lista-carreras');
            const panelCrearCarrera = document.getElementById('panel-crear-carrera');
            if (msgNoLogin) msgNoLogin.style.display = isPilotOrAdmin ? 'none' : 'block';
            if (listaCarreras) listaCarreras.style.display = isPilotOrAdmin ? 'block' : 'none';
            if (panelCrearCarrera) panelCrearCarrera.style.display = rol === 'admin' ? 'block' : 'none';

            // Sección Garaje
            const garajeMsg = document.getElementById('garaje-msg-no-login');
            const garajeContenido = document.getElementById('garaje-contenido');
            if (garajeMsg) garajeMsg.style.display = isPilotOrAdmin ? 'none' : 'block';
            if (garajeContenido) garajeContenido.style.display = isPilotOrAdmin ? 'block' : 'none';

        } catch (error) { console.error("Error al recuperar la sesión:", error); }
    } else {
        const navAuth = document.getElementById('nav-auth-buttons');
        if(navAuth) navAuth.style.display = "flex";

        const accesoRapido = document.getElementById('acceso-rapido');
        if(accesoRapido) accesoRapido.style.display = "block";

        // Resetear paneles privados al cerrar sesión
        [document.getElementById('msg-no-login'), document.getElementById('garaje-msg-no-login')].forEach(el => { if(el) el.style.display = 'block'; });
        [document.getElementById('lista-carreras'), document.getElementById('garaje-contenido'), document.getElementById('panel-crear-carrera')].forEach(el => { if(el) el.style.display = 'none'; });
    }
});

export function cambiarModoAuth() {
    state.modoRegistro = !state.modoRegistro;
    document.getElementById('auth-titulo').innerText = state.modoRegistro ? "Solicitar credencial" : "Acceso al Pit Lane";
    document.getElementById('btn-accion-auth').innerText = state.modoRegistro ? "CREAR CUENTA" : "INICIAR SESIÓN";
    document.getElementById('campos-registro').style.display = state.modoRegistro ? "block" : "none";

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
            
            alert("¡Registro exitoso! Hemos enviado un enlace de confirmación a tu correo. Por favor, revísalo (incluso en spam) para verificar tu cuenta antes de iniciar sesión.");
            cambiarModoAuth(); // Volver al formulario de login
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

    let ocultarBotonPostulacion = false;
    if (rol === "miembro") {
        try {
            const q = query(collection(db, "postulaciones"), where("uid", "==", uid), where("estado", "==", "Pendiente"));
            const snap = await getDocs(q);
            if (!snap.empty) {
                ocultarBotonPostulacion = true;
            }
        } catch(e) { console.error(e); }
    }

    document.getElementById('panel-auth').style.display = "none";
    document.getElementById('acceso-rapido').style.display = (rol === "admin" || (rol === "miembro" && !ocultarBotonPostulacion)) ? "block" : "none";

    const linkAdmin = document.getElementById('link-admin');
    if (linkAdmin) linkAdmin.style.display = (rol === "admin") ? "flex" : "none";
    
    const linkAdminPostulaciones = document.getElementById('link-admin-postulaciones');
    if (linkAdminPostulaciones) linkAdminPostulaciones.style.display = (rol === "admin") ? "flex" : "none";

    const linkAdminTelemetria = document.getElementById('link-admin-telemetria');
    if (linkAdminTelemetria) linkAdminTelemetria.style.display = (rol === "admin") ? "flex" : "none";

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
    } else if (cat === "LMP2" || cat === "GT3") {
        const cssStyle = cat === "LMP2" ? "background: rgba(0, 123, 255, 0.1); color: var(--ace