import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { state } from "./state.js";

// FUNCIÓN: Comprimir imagen usando Canvas para generar Base64 bajo el límite de Firestore
async function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800; // Limita el ancho a 800px para garantizar un Base64 muy liviano
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compresión JPG al 70%
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

export async function enviarPostulacion(event) {
    event.preventDefault(); // Evitamos que la página se recargue

    if (!state.usuarioActual) {
        alert("Debes iniciar sesión para postularte.");
        return;
    }

    const categoria = document.getElementById('postulacion-categoria').value;
    const discord = document.getElementById('postulacion-discord').value;
    const fileLmp2 = document.getElementById('postulacion-captura-lmp2').files[0];
    const fileGt3 = document.getElementById('postulacion-captura-gt3').files[0];

    if (!categoria || !discord) {
        alert("Por favor, completa todos los campos requeridos.");
        return;
    }
    if (categoria === "LMP2" && !fileLmp2) return alert("Falta el archivo de tu captura LMP2.");
    if (categoria === "GT3" && !fileGt3) return alert("Falta el archivo de tu captura GT3.");
    if (categoria === "Ambas" && (!fileLmp2 || !fileGt3)) return alert("Debes subir las capturas de ambas categorías.");

    const btn = document.getElementById('btn-enviar-postulacion');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando datos de prueba...';
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";

    try {
        // 1. Procesar y comprimir las imágenes si el piloto las subió
        let base64Lmp2 = fileLmp2 ? await comprimirImagen(fileLmp2) : null;
        let base64Gt3 = fileGt3 ? await comprimirImagen(fileGt3) : null;

        // 2. Guardar la información en la base de datos
        await addDoc(collection(db, "postulaciones"), {
            uid: state.usuarioActual.uid,
            nombre: state.usuarioActual.nombre,
            categoria: categoria,
            capturaLmp2: base64Lmp2,
            capturaGt3: base64Gt3,
            discord: discord,
            fecha: new Date().getTime(),
            estado: "Pendiente"
        });

        // --- NOTIFICACIÓN AUTOMÁTICA A DISCORD ---
        const webhookUrl = "https://discord.com/api/webhooks/1502181375732617378/9lHyVTWLJwYY7XWU14f6Z2oo87n6MpTJetQdgUjcv1ub123YcfPAw3bs1AOMC4ViYw8n"; 
        
        if (webhookUrl) {
            const payload = {
                content: "🚨 **¡NUEVA POSTULACIÓN RECIBIDA EN EL PORTAL!** 🚨",
                embeds: [{
                    title: `Piloto: ${state.usuarioActual.nombre}`,
                    color: 16753920, // Naranja
                    fields: [
                        { name: "Usuario Discord", value: discord, inline: true },
                        { name: "Categoría", value: categoria, inline: true }
                    ]
                }]
            };
            
            fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(e => console.error("Error al notificar a Discord:", e));
        }
        // -----------------------------------------

        // 2. Ocultar formulario y mostrar éxito
        document.getElementById('postulacion-form-container').style.display = "none";
        document.getElementById('postulacion-mensaje').style.display = "block";

        if (state.rolActual !== "admin") {
            const btnPostulacion = document.querySelector('#acceso-rapido button');
            if (btnPostulacion) {
                btnPostulacion.disabled = true;
                btnPostulacion.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Postulación en Revisión';
                btnPostulacion.style.opacity = "0.7";
                btnPostulacion.style.cursor = "not-allowed";
                btnPostulacion.style.borderColor = "var(--secundario)";
                btnPostulacion.style.color = "var(--secundario)";
            }
            const rolContainer = document.getElementById('nav-rol-tags');
            if(rolContainer) rolContainer.innerHTML = `<span class="nav-tag pendiente">En Revisión</span>`;
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

export function actualizarFormularioTiempos() {
    const cat = document.getElementById('postulacion-categoria').value;
    const container = document.getElementById('tiempos-container');
    const divLmp2 = document.getElementById('tiempo-lmp2');
    const divGt3 = document.getElementById('tiempo-gt3');
    const inputLmp2 = document.getElementById('postulacion-captura-lmp2');
    const inputGt3 = document.getElementById('postulacion-captura-gt3');

    if (!cat) { container.style.display = "none"; return; }
    container.style.display = "block";
    
    if (cat === "LMP2") {
        divLmp2.style.display = "block"; inputLmp2.required = true;
        divGt3.style.display = "none"; inputGt3.required = false; inputGt3.value = "";
    } else if (cat === "GT3") {
        divLmp2.style.display = "none"; inputLmp2.required = false; inputLmp2.value = "";
        divGt3.style.display = "block"; inputGt3.required = true;
    } else if (cat === "Ambas") {
        divLmp2.style.display = "block"; inputLmp2.required = true;
        divGt3.style.display = "block"; inputGt3.required = true;
    }
}
window.actualizarFormularioTiempos = actualizarFormularioTiempos;

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
            
            let enlacesHTML = "<div style='display: flex; gap: 8px; flex-wrap: wrap;'>";
            
            // Renderizado inteligente (Detecta si es un Base64 comprimido o un viejo enlace por retrocompatibilidad)
            if (p.capturaLmp2 && p.capturaLmp2.startsWith('data:image')) {
                enlacesHTML += `<div style="text-align:center;"><small style="color:var(--texto-secundario);">LMP2</small><br><a href="${p.capturaLmp2}" target="_blank" title="Abrir imagen"><img src="${p.capturaLmp2}" style="width: 70px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--borde); transition: 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></a></div>`;
            } else if (p.capturaLmp2) {
                enlacesHTML += `<a href="${p.capturaLmp2}" target="_blank" class="btn-mini btn-secundario" style="text-decoration: none; display:block; padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-link"></i> LMP2</a>`;
            }

            if (p.capturaGt3 && p.capturaGt3.startsWith('data:image')) {
                enlacesHTML += `<div style="text-align:center;"><small style="color:var(--texto-secundario);">GT3</small><br><a href="${p.capturaGt3}" target="_blank" title="Abrir imagen"><img src="${p.capturaGt3}" style="width: 70px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--borde); transition: 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></a></div>`;
            } else if (p.capturaGt3) {
                enlacesHTML += `<a href="${p.capturaGt3}" target="_blank" class="btn-mini btn-secundario" style="text-decoration: none; display:block; padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-link"></i> GT3</a>`;
            }
            
            if (p.capturaUrl) enlacesHTML += `<a href="${p.capturaUrl}" target="_blank" class="btn-mini btn-secundario" style="text-decoration: none; padding: 4px 8px; font-size: 0.75rem;"><i class="fa-solid fa-link"></i> Antiguo</a>`;
            enlacesHTML += "</div>";

            html += `
                <tr>
                    <td>
                        <strong>${p.nombre}</strong><br>
                        <small style="color: var(--texto-secundario);"><i class="fa-brands fa-discord" style="color:#5865F2;"></i> ${p.discord || 'No provisto'}</small><br>
                        <small style="color: var(--texto-secundario);">${fechaStr}</small>
                    </td>
                    <td><span class="cat-tag ${p.categoria.toLowerCase()}">${p.categoria}</span></td>
                    <td><span style="color: ${colorEstado}; font-weight: bold;">${p.estado}</span></td>
                    <td>${enlacesHTML}</td>
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