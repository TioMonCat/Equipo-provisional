import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { state } from "./state.js";

export async function enviarPostulacion(event) {
    event.preventDefault(); // Evitamos que la página se recargue

    if (!state.usuarioActual) {
        alert("Debes iniciar sesión para postularte.");
        return;
    }

    const categoria = document.getElementById('postulacion-categoria').value;
    const capturaUrl = document.getElementById('postulacion-captura-url').value;

    if (!categoria || !capturaUrl) {
        alert("Por favor, completa todos los campos y añade el enlace de tu captura.");
        return;
    }

    const btn = document.getElementById('btn-enviar-postulacion');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Transfiriendo telemetría...';
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";

    try {
        // 1. Guardar la información en la base de datos con el enlace proporcionado
        await addDoc(collection(db, "postulaciones"), {
            uid: state.usuarioActual.uid,
            nombre: state.usuarioActual.nombre,
            categoria: categoria,
            capturaUrl: capturaUrl,
            fecha: new Date().getTime(),
            estado: "Pendiente"
        });

        // 2. Ocultar formulario y mostrar éxito
        document.getElementById('postulacion-form-container').style.display = "none";
        document.getElementById('postulacion-mensaje').style.display = "block";

    } catch (error) {
        console.error("Error al enviar postulación:", error);
        alert("Hubo un error al enviar tu postulación.");
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Postulación';
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}

window.enviarPostulacion = enviarPostulacion;