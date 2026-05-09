import { getDocs, collection, doc, updateDoc, deleteDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { cargarRoster } from "./roster.js";

export async function cargarUsuariosAdmin() {
    const contenedor = document.getElementById('lista-usuarios-admin');
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='text-align: center; color: var(--texto-secundario);'>Conectando con la base de datos del equipo...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "pilotos"));
        contenedor.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align: center;'>No hay usuarios registrados en el sistema.</p>";
            return;
        }

        const usuarios = [];
        querySnapshot.forEach(docSnap => usuarios.push({ uid: docSnap.id, ...docSnap.data() }));

        // Ordenamos: primero admins, luego ingenieros, luego pilotos, luego miembros
        usuarios.sort((a, b) => {
            const peso = { "admin": 1, "ingeniero": 2, "piloto": 3, "miembro": 4 };
            return (peso[a.rol] || 5) - (peso[b.rol] || 5);
        });

        let html = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Piloto / Usuario</th>
                        <th>Rol de Acceso</th>
                        <th>Categoría</th>
                        <th style="text-align: center;">Eliminar</th>
                    </tr>
                </thead>
                <tbody>`;

        usuarios.forEach(u => {
            const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.trim();
            html += `
                <tr class="admin-user-row" data-uid="${u.uid}">
                    <td>
                        <strong>${nombreCompleto}</strong><br>
                        <small style="color: var(--texto-secundario);">${u.correo}</small>
                    </td>
                    <td>
                        <select id="admin-rol-${u.uid}" class="admin-select" data-original="${u.rol || 'miembro'}">
                            <option value="miembro" ${u.rol === 'miembro' ? 'selected' : ''}>Miembro (Invitado)</option>
                            <option value="piloto" ${u.rol === 'piloto' ? 'selected' : ''}>Piloto Oficial</option>
                            <option value="ingeniero" ${u.rol === 'ingeniero' ? 'selected' : ''}>Ingeniero de Equipo</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </td>
                    <td>
                        <select id="admin-cat-${u.uid}" class="admin-select" data-original="${u.categoria || ''}">
                            <option value="" ${!u.categoria ? 'selected' : ''}>Ninguna / Reserva</option>
                            <option value="LMP2" ${u.categoria === 'LMP2' ? 'selected' : ''}>LMP2</option>
                            <option value="GT3" ${u.categoria === 'GT3' ? 'selected' : ''}>GT3</option>
                            <option value="Ambas" ${u.categoria === 'Ambas' ? 'selected' : ''}>Ambas Categorías</option>
                            <option value="Ingeniero" ${u.categoria === 'Ingeniero' ? 'selected' : ''}>Ingeniero / Telemetría</option>
                        </select>
                    </td>
                    <td style="text-align: center;">
                        <button onclick="eliminarUsuario('${u.uid}')" class="btn-mini btn-peligro" style="margin:0; width: 40px; height: 40px; border-radius: 8px;" title="Eliminar Piloto"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        html += `
            <div style="text-align: center; margin-top: 20px; position: relative;">
                <button type="button" id="btn-guardar-admin" onclick="guardarTodosLosCambios()" class="btn-alerta" style="max-width: 300px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Todos los Cambios
                </button>
                <div id="admin-msg-box" style="margin-top: 15px; font-size: 0.95rem; font-family: 'Inter', sans-serif; transition: 0.3s; min-height: 20px;"></div>
            </div>
        `;
        contenedor.innerHTML = html;

    } catch (error) {
        console.error("Error cargando usuarios:", error);
        contenedor.innerHTML = "<p style='text-align: center; color: #d9534f;'>Error al cargar los datos de administración.</p>";
    }
}

export async function guardarTodosLosCambios() {
    const btn = document.getElementById('btn-guardar-admin');
    const msgBox = document.getElementById('admin-msg-box');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando cambios...';
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    }
    if (msgBox) msgBox.innerHTML = "";

    const rows = document.querySelectorAll('.admin-user-row');
    const updates = [];

    rows.forEach(row => {
        const uid = row.getAttribute('data-uid');
        const rolSelect = document.getElementById(`admin-rol-${uid}`);
        const catSelect = document.getElementById(`admin-cat-${uid}`);
        
        const nuevoRol = rolSelect.value;
        const nuevaCat = catSelect.value;
        const originalRol = rolSelect.getAttribute('data-original');
        const originalCat = catSelect.getAttribute('data-original');

        // Solo le pediremos a Firebase que actualice si hubo un cambio real
        if (nuevoRol !== originalRol || nuevaCat !== originalCat) {
            updates.push(updateDoc(doc(db, "pilotos", uid), {
                rol: nuevoRol,
                categoria: nuevaCat
            }));
        }
    });

    if (updates.length === 0) {
        alert("No se detectaron cambios para guardar.");
        return;
    }

    try {
        // Promise.all procesa múltiples peticiones a Firebase simultáneamente
        await Promise.all(updates);
        alert("Todos los cambios han sido guardados con éxito.");
        cargarUsuariosAdmin();
        cargarRoster(); // Actualiza el roster visual para reflejar los cambios en el equipo
    } catch (error) {
        console.error("Error al actualizar usuarios:", error);
        alert("Hubo un error al guardar los cambios.");
    }
}

window.cargarUsuariosAdmin = cargarUsuariosAdmin;
window.guardarTodosLosCambios = guardarTodosLosCambios;

export async function eliminarUsuario(uid) {
    if (confirm("¿Estás seguro de que deseas eliminar este perfil de la base de datos del equipo? Esta acción no se puede deshacer.")) {
        try {
            await deleteDoc(doc(db, "pilotos", uid));
            cargarUsuariosAdmin(); // Recarga la tabla de administración
            cargarRoster(); // Actualiza el roster para quitarlo visualmente
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("Hubo un error al intentar eliminar el usuario.");
        }
    }
}
window.eliminarUsuario = eliminarUsuario;

export async function toggleStreamStatus() {
    const urlInput = document.getElementById('admin-stream-url');
    if (!urlInput) return;

    const streamUrl = urlInput.value.trim();
    const btn = document.getElementById('btn-toggle-stream');
    const docRef = doc(db, "teamSettings", "streamStatus");

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
        
        const docSnap = await getDoc(docRef);
        let isCurrentlyStreaming = false;
        
        if (docSnap.exists() && docSnap.data().isStreaming) {
            isCurrentlyStreaming = true;
        }

        if (!isCurrentlyStreaming) {
            if (!streamUrl) {
                alert("Por favor, ingresa la URL de la transmisión para activarla.");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Activar Transmisión';
                return;
            }
            // Utilizamos setDoc para crear el documento si es la primera vez en la base de datos
            await setDoc(docRef, { isStreaming: true, streamUrl: streamUrl, updatedAt: Date.now() });
        } else {
            // Apagamos la transmisión
            await setDoc(docRef, { isStreaming: false, streamUrl: "", updatedAt: Date.now() }, { merge: true });
        }
    } catch (error) {
        console.error("Error al actualizar la transmisión:", error);
        alert("Hubo un error al conectar con Firebase.");
    } finally {
        btn.disabled = false;
    }
}
window.toggleStreamStatus = toggleStreamStatus;

export async function notificarNoticiaDiscord() {
    const tituloInput = document.getElementById('admin-noticia-titulo');
    const titulo = tituloInput.value.trim();

    if (!titulo) {
        alert("Por favor, ingresa el título de la noticia para notificar.");
        return;
    }

    const btn = document.getElementById('btn-discord-noticia');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    const webhookUrl = "https://discord.com/api/webhooks/1502446014496374814/cYRrHJQ4FTSG7lpk7R3rAbXc5JXxhaxAevoEVxBLQp0xot4jpjZJwvKyZmQUU52SmdTc";

    const payload = {
        content: "📢 **¡NUEVO ANUNCIO OFICIAL PUBLICADO!** 📢\n@everyone",
        embeds: [{
            title: titulo,
            description: `Se ha publicado un nuevo comunicado en el portal del equipo. Por favor, ingresen a la sección de **Noticias** en la web para leer los detalles completos.\n\n🔗 **Ir al Portal Oficial**`,
            color: 3447003 // Color Azul Oficial (Hexadecimal convertido a decimal)
        }]
    };

    try {
        await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        alert("¡Aviso enviado a Discord exitosamente!");
        tituloInput.value = "";
    } catch (error) {
        console.error("Error enviando webhook:", error);
        alert("Hubo un error al conectar con Discord.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Aviso';
    }
}
window.notificarNoticiaDiscord = notificarNoticiaDiscord;