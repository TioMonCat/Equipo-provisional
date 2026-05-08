import { getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { cargarRoster } from "./roster.js";

export async function cargarUsuariosAdmin() {
    const contenedor = document.getElementById('lista-usuarios-admin');
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='text-align: center; color: var(--texto-secundario);'>Conectando con la base de datos de telemetría...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "pilotos"));
        contenedor.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align: center;'>No hay usuarios registrados en el sistema.</p>";
            return;
        }

        const usuarios = [];
        querySnapshot.forEach(docSnap => usuarios.push({ uid: docSnap.id, ...docSnap.data() }));

        // Ordenamos: primero admins, luego pilotos, luego miembros
        usuarios.sort((a, b) => {
            const peso = { "admin": 1, "piloto": 2, "miembro": 3 };
            return (peso[a.rol] || 4) - (peso[b.rol] || 4);
        });

        let html = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Piloto / Usuario</th>
                        <th>Rol de Acceso</th>
                        <th>Categoría</th>
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
                            <option value="miembro" ${u.rol === 'miembro' ? 'selected' : ''}>Miembro (Bloqueado)</option>
                            <option value="piloto" ${u.rol === 'piloto' ? 'selected' : ''}>Piloto Oficial</option>
                            <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </td>
                    <td>
                        <select id="admin-cat-${u.uid}" class="admin-select" data-original="${u.categoria || ''}">
                            <option value="" ${!u.categoria ? 'selected' : ''}>Ninguna / Reserva</option>
                            <option value="LMP2" ${u.categoria === 'LMP2' ? 'selected' : ''}>LMP2</option>
                            <option value="GT3" ${u.categoria === 'GT3' ? 'selected' : ''}>GT3</option>
                        </select>
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