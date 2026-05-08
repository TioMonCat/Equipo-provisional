import { getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function cargarRoster() {
    const contenedor = document.getElementById('contenedor-pilotos');
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: var(--texto-secundario);'>Cargando datos de pilotos...</p>";

    try {
        const q = query(collection(db, "pilotos"), where("rol", "in", ["piloto", "admin"]));
        const querySnapshot = await getDocs(q);
        
        contenedor.innerHTML = "";

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: var(--texto-secundario);'>Aún no hay pilotos en el roster oficial.</p>";
            return;
        }

        const admins = [];
        const lmp2 = [];
        const gt3 = [];
        const otros = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            if (data.rol === "admin") { admins.push(data); } else {
                if (data.categoria === "LMP2" || data.categoria === "Ambas") lmp2.push(data);
                if (data.categoria === "GT3" || data.categoria === "Ambas") gt3.push(data);
                if (!data.categoria || (data.categoria !== "LMP2" && data.categoria !== "GT3" && data.categoria !== "Ambas")) otros.push(data);
            }
        });

        const generarCard = (data) => {
            let nombreFormateado = data.nombre || "Piloto";
            if (data.apellido) nombreFormateado += ` ${data.apellido.charAt(0).toUpperCase()}.`;

            let etiquetaRol = data.rol === "admin" ? "Director / Piloto" : "Piloto Oficial";
            
            let catTag = "";
            if (data.categoria === "Ambas") {
                catTag = `<span class="cat-tag lmp2">LMP2</span><span class="cat-tag gt3">GT3</span>`;
            } else if (data.categoria) {
                catTag = `<span class="cat-tag ${data.categoria.toLowerCase()}">${data.categoria}</span>`;
            }
            
            let imagenPiloto = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop";
            
            if (data.categoria === "LMP2" || data.categoria === "Ambas") {
                imagenPiloto = "img/LMP2driver.jpg";
            } else if (data.categoria === "GT3") {
                imagenPiloto = "img/GT3driver.jpg";
            }
            
            return `
                <div class="card-piloto">
                    <img src="${imagenPiloto}" class="img-piloto">
                    <h3>${nombreFormateado}</h3>
                    <div style="margin-top: 15px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <span class="rol-tag" style="margin-top:0;">${etiquetaRol}</span>
                        ${catTag}
                    </div>
                </div>
            `;
        };

        let htmlFinal = "";
        const appendSection = (title, icon, arr) => {
            if (arr.length > 0) {
                htmlFinal += `<h3 style="grid-column: 1 / -1; text-align: center; color: var(--texto); margin: 30px 0 10px; font-family: 'Montserrat', sans-serif; font-size: 1.8rem; border-bottom: 1px solid var(--borde); padding-bottom: 10px;"><i class="${icon}" style="color: var(--acento);"></i> ${title}</h3>`;
                htmlFinal += arr.map(generarCard).join('');
            }
        };

        appendSection("Dirección del Equipo", "fa-solid fa-user-tie", admins);
        appendSection("Categoría LMP2", "fa-solid fa-gauge-high", lmp2);
        appendSection("Categoría GT3", "fa-solid fa-car-side", gt3);
        appendSection("Pilotos de Reserva / Pruebas", "fa-solid fa-helmet-safety", otros);
        
        contenedor.innerHTML = htmlFinal;
    } catch (error) {
        console.error("Error cargando el roster:", error);
        contenedor.innerHTML = "<p style='text-align: center; grid-column: 1 / -1; color: #d9534f;'>Error al conectar con la base de datos.</p>";
    }
}

window.cargarRoster = cargarRoster;
cargarRoster();