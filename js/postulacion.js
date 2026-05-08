import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
    const discord = document.getElementById('postulacion-discord').value;

    if (!categoria || !capturaUrl || !discord) {
        alert("Por favor, completa todos los campos.");
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
            discord: discord,
            fecha: new Date().getTime(),
            estado: "Pendiente"
        });

        // 2. Ocultar formulario y mostrar éxito
        document.getElementById('postulacion-form-container').style.display = "none";
        document.getElementById('postulacion-mensaje').style.display = "block";

        if (state.rolActual !== "admin") {
            document.getElementById('acceso-rapido').style.display = "none";
            const tagsContainer = document.getElementById('nav-user-tags');
            if(tagsContainer) tagsContainer.innerHTML = `<span class="nav-tag pendiente">En Evaluación</span>`;
        }

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

export async function cargarPostulacionesAdmin() {
    const contenedor = document.getElementById('lista-postulaciones-admin');
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='text-align: center; color: var(--texto-secundario);'>Cargando postulaciones de la base de datos...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "postulaciones"));
        contenedor.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align: center; color: var(--texto-secundario);'>No hay postulaciones pendientes en este momento.</p>";
            return;
        }

        let html = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Piloto / Discord</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                        <th>Captura</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

        querySnapshot.forEach(docSnap => {
            const p = docSnap.data();
            const pid = docSnap.id;
            const fechaStr = new Date(p.fecha).toLocaleDateString();
            let colorEstado = p.estado === 'Pendiente' ? 'var(--secundario)' : (p.estado === 'Aprobado' ? '#4ade80' : '#d9534f');

            html += `
                <tr>
                    <td>
                        <strong>${p.nombre}</strong><br>
                        <small style="color: var(--texto-secundario);"><i class="fa-brands fa-discord" style="color:#5865F2;"></i> ${p.discord || 'No provisto'}</small><br>
                        <small style="color: var(--texto-secundario);">${fechaStr}</small>
                    </td>
                    <td><span class="cat-tag ${p.categoria.toLowerCase()}">${p.categoria}</span></td>
                    <td><span style="color: ${colorEstado}; font-weight: bold;">${p.estado}</span></td>
                    <td>
                        <a href="${p.capturaUrl}" target="_blank" class="btn-mini btn-secundario" style="text-decoration: none;"><i class="fa-solid fa-up-right-from-square"></i> Ver Tiempo</a>
                    </td>
                    <td style="display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                        <button onclick="cambiarEstadoPostulacion('${pid}', 'Aprobado', '${p.uid}', '${p.categoria}')" class="btn-mini" style="background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid #4ade80; margin:0;" title="Aprobar"><i class="fa-solid fa-check"></i></button>
                        <button onclick="cambiarEstadoPostulacion('${pid}', 'Rechazado', '${p.uid}', '${p.categoria}')" class="btn-mini" style="background: rgba(217, 83, 79, 0.2); color: #d9534f; border: 1px solid #d9534f; margin:0;" title="Rechazar"><i class="fa-solid fa-xmark"></i></button>
                        <button onclick="eliminarPostulacion('${pid}')" class="btn-mini btn-peligro" style="margin:0;" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        contenedor.innerHTML = html;
    } catch (error) { console.error("Error cargando postulaciones:", error); }
}

export async function cambiarEstadoPostulacion(id, nuevoEstado, uid, categoria) {
    if (confirm(`¿Estás seguro de marcar esta postulación como ${nuevoEstado}?`)) {
        try {
            await updateDoc(doc(db, "postulaciones", id), { estado: nuevoEstado });
            if (nuevoEstado === 'Aprobado') {
                await updateDoc(doc(db, "pilotos", uid), { rol: "piloto", categoria: categoria });
                if (window.cargarUsuariosAdmin) window.cargarUsuariosAdmin();
                if (window.cargarRoster) window.cargarRoster();
            }
            cargarPostulacionesAdmin();
        } catch (error) { alert("Error al actualizar la postulación."); }
    }
}

export async function eliminarPostulacion(id) {
    if (confirm("¿Seguro que deseas eliminar esta postulación del registro?")) {
        try { await deleteDoc(doc(db, "postulaciones", id)); cargarPostulacionesAdmin();
        } catch (error) { alert("Error al eliminar la postulación."); }
    }
}

window.cargarPostulacionesAdmin = cargarPostulacionesAdmin; window.cambiarEstadoPostulacion = cambiarEstadoPostulacion; window.eliminarPostulacion = eliminarPostulacion;