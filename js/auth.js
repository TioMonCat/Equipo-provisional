import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, getDocs, query, where, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";
import { state } from "./state.js";
import { cargarRoster } from "./roster.js";
import { cargarCarreras } from "./carreras.js";
import { cargarUsuariosAdmin } from "./admin.js";
import { cargarPostulacionesAdmin } from "./postulacion.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
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
    }
});

export function cambiarModoAuth() {
    state.modoRegistro = !state.modoRegistro;
    document.getElementById('auth-titulo').innerText = state.modoRegistro ? "Solicitar credencial" : "Acceso al Pit Lane";
    document.getElementById('btn-accion-auth').innerText = state.modoRegistro ? "CREAR CUENTA" : "INICIAR SISTEMAS";
    document.getElementById('campos-registro').style.display = state.modoRegistro ? "block" : "none";
}

export function abrirLogin() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (state.modoRegistro) cambiarModoAuth();
}

export function abrirRegistro() {
    if (typeof showSection === 'function') showSection('zona-login');
    if (!state.modoRegistro) cambiarModoAuth();
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
            await setDoc(doc(db, "pilotos", credencial.user.uid), {
                correo: email, nombre: nombre, apellido: apellido, rol: "miembro", fechaRegistro: new Date()
            });
            cargarRoster();
            mostrarPanelPrivado(`${nombre} ${apellido}`, "miembro", credencial.user.uid, {categoria: ""});
        } else {
            const credencial = await signInWithEmailAndPassword(auth, email, pass);
            const pilotoDoc = await getDoc(doc(db, "pilotos", credencial.user.uid));
            if (pilotoDoc.exists()) {
                const d = pilotoDoc.data();
                mostrarPanelPrivado(`${d.nombre} ${d.apellido}`, d.rol, credencial.user.uid, d);
            } else { mostrarPanelPrivado(email, "piloto", credencial.user.uid, null); }
        }
    } catch (error) {
        console.error(error);
        alert("Error de acceso. Revisa tus credenciales.");
    }
}

async function mostrarPanelPrivado(nombreCompleto, rol, uid, userData) {
    state.usuarioActual = { uid: uid, nombre: nombreCompleto };
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

    const navStatus = document.getElementById('nav-user-status');
    if (navStatus) navStatus.style.display = "flex";
    const nombreNav = document.getElementById('nav-nombre-piloto');
    if (nombreNav) nombreNav.innerText = nombreCompleto;

    const tagsContainer = document.getElementById('nav-user-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (rol === "admin") {
            tagsContainer.innerHTML = `<span class="nav-tag admin">Admin</span>`;
        } else if (rol === "piloto") {
            const cat = userData?.categoria;
            if (cat === "Ambas") {
                tagsContainer.innerHTML = `
                    <span class="nav-tag lmp2" style="background: rgba(0, 123, 255, 0.1); color: var(--acento); border-color: var(--acento);">LMP2</span>
                    <span class="nav-tag gt3" style="background: rgba(230, 204, 0, 0.1); color: var(--secundario); border-color: var(--secundario);">GT3</span>`;
            } else if (cat === "LMP2" || cat === "GT3") {
                const cssStyle = cat === "LMP2" ? "background: rgba(0, 123, 255, 0.1); color: var(--acento); border-color: var(--acento);" : "background: rgba(230, 204, 0, 0.1); color: var(--secundario); border-color: var(--secundario);";
                tagsContainer.innerHTML = `<span class="nav-tag" style="${cssStyle}">${cat}</span>`;
            } else {
                tagsContainer.innerHTML = `<span class="nav-tag miembro">Reserva</span>`;
            }
        } else if (rol === "miembro") {
            if (ocultarBotonPostulacion) {
                tagsContainer.innerHTML = `<span class="nav-tag pendiente">En Evaluación</span>`;
            } else {
                tagsContainer.innerHTML = `<span class="nav-tag miembro">Bloqueado</span>`;
            }
        }
    }

    const navAuth = document.getElementById('nav-auth-buttons');
    if(navAuth) navAuth.style.display = "none";

    const panelPrivado = document.getElementById('panel-privado');
    const panelCrearCarrera = document.getElementById('panel-crear-carrera');
    
    if (panelPrivado) panelPrivado.style.display = (rol === "admin") ? "block" : "none";
    if (panelCrearCarrera) panelCrearCarrera.style.display = (rol === "admin") ? "block" : "none";

    document.getElementById('msg-no-login').style.display = (rol === "miembro") ? "block" : "none";
    document.getElementById('lista-carreras').style.display = (rol === "miembro") ? "none" : "block";
    
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

window.cambiarModoAuth = cambiarModoAuth; window.abrirLogin = abrirLogin; window.abrirRegistro = abrirRegistro; window.procesarAuth = procesarAuth; window.cerrarSesion = cerrarSesion;