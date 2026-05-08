import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { state } from "./state.js";

export async function crearCarrera() {
    const nombre = document.getElementById('nueva-carrera-nombre').value;
    const fecha = document.getElementById('nueva-carrera-fecha').value;
    const hora = document.getElementById('nueva-carrera-hora').value || "00:00";
    const pista = document.getElementById('nueva-carrera-pista').value;

    if(!nombre || !fecha || !pista) { alert("Completa todos los datos del evento."); return; }

    // Creamos un tiempo absoluto global basado en la hora local de quien crea el evento
    const timestampAbsoluto = new Date(`${fecha}T${hora}:00`).getTime();

    try {
        await addDoc(collection(db, "carreras"), { nombre: nombre, fecha: fecha, hora: hora, pista: pista, inscritos: [], timestamp: timestampAbsoluto });
        alert("Evento guardado en el servidor.");
        document.getElementById('nueva-carrera-nombre').value = "";
        document.getElementById('nueva-carrera-fecha').value = "";
        document.getElementById('nueva-carrera-hora').value = "";
        document.getElementById('nueva-carrera-pista').value = "";
        cargarCarreras(); 
    } catch (error) {
        console.error("Error al crear carrera:", error);
    }
}

export async function cargarCarreras() {
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    const contenedor = document.getElementById('lista-carreras');
    contenedor.innerHTML = "<p style='text-align:center;'>Cargando telemetría de eventos...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "carreras"));
        contenedor.innerHTML = ""; 

        if(querySnapshot.empty) {
            contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-secundario);'>No hay eventos programados en el calendario.</p>";
            return;
        }

        const ahora = Date.now();
        const limiteEliminacion = 24 * 60 * 60 * 1000;
        let eventosMostrados = 0;

        querySnapshot.forEach((docSnap) => {
            const carrera = docSnap.data();
            const idCarrera = docSnap.id;
            
            // Lógica de Zona Horaria Inteligente
            let fechaMilisegundos;
            let txtFecha = carrera.fecha;
            let txtHora = carrera.hora || "00:00";

            if (carrera.timestamp) {
                fechaMilisegundos = carrera.timestamp;
                const d = new Date(carrera.timestamp);
                txtFecha = d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
                txtHora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                // Retrocompatibilidad por si tienes eventos viejos creados antes de esta actualización
                const horaEvento = carrera.hora || "00:00";
                fechaMilisegundos = new Date(`${carrera.fecha}T${horaEvento}:00`).getTime();
            }

            const tiempoPasado = ahora - fechaMilisegundos;
            
            if (tiempoPasado > limiteEliminacion) {
                deleteDoc(doc(db, "carreras", idCarrera)).catch(e => console.error("Error borrando evento:", e));
                return; 
            }

            eventosMostrados++;
            const inscritos = carrera.inscritos || []; 
            const estoyInscrito = inscritos.some(p => p.uid === state.usuarioActual.uid);

            let htmlInscritos = "";
            if (inscritos.length === 0) {
                htmlInscritos = "<li style='color: #666;'>Ningún piloto confirmado.</li>";
            } else {
                const lmp2 = [];
                const gt3 = [];
                const otros = [];

                inscritos.forEach(p => {
                    const cat = p.categoria || "Reserva";
                    if (cat === "LMP2" || cat === "Ambas") { if (!lmp2.some(x => x.uid === p.uid)) lmp2.push(p); }
                    if (cat === "GT3" || cat === "Ambas") { if (!gt3.some(x => x.uid === p.uid)) gt3.push(p); }
                    if (cat !== "LMP2" && cat !== "GT3" && cat !== "Ambas") otros.push(p);
                });

                if (lmp2.length > 0) {
                    htmlInscritos += `<li style='color: var(--acento); font-weight: bold; background: rgba(0, 123, 255, 0.1); border-radius: 4px; margin-top: 5px;'><i class="fa-solid fa-gauge-high"></i> LMP2</li>`;
                    htmlInscritos += lmp2.map(p => `<li>&nbsp;&nbsp;&nbsp;<i class="fa-solid fa-helmet-safety"></i> ${p.nombre}</li>`).join('');
                }
                if (gt3.length > 0) {
                    htmlInscritos += `<li style='color: var(--secundario); font-weight: bold; background: rgba(230, 204, 0, 0.1); border-radius: 4px; margin-top: 5px;'><i class="fa-solid fa-car-side"></i> GT3</li>`;
                    htmlInscritos += gt3.map(p => `<li>&nbsp;&nbsp;&nbsp;<i class="fa-solid fa-helmet-safety"></i> ${p.nombre}</li>`).join('');
                }
                if (otros.length > 0) {
                    htmlInscritos += `<li style='color: var(--texto-secundario); font-weight: bold; background: rgba(255, 255, 255, 0.05); border-radius: 4px; margin-top: 5px;'><i class="fa-solid fa-users"></i> Reservas</li>`;
                    htmlInscritos += otros.map(p => `<li>&nbsp;&nbsp;&nbsp;<i class="fa-solid fa-helmet-safety"></i> ${p.nombre}</li>`).join('');
                }
            }
            
            let htmlBotones = "";
            if(estoyInscrito) {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', false)" class="btn-peligro" style="flex: 1;">Retirarse</button>`;
            } else {
                htmlBotones += `<button onclick="cambiarInscripcion('${idCarrera}', true)" class="btn-alerta" style="flex: 1;">Confirmar Asistencia</button>`;
            }

            if(state.rolActual === "admin") {
                htmlBotones += `<button onclick="eliminarCarrera('${idCarrera}')" class="btn-peligro" style="flex: 0.5;"><i class="fa-solid fa-trash"></i></button>`;
            }

            contenedor.innerHTML += `
                <div class="panel-racing" style="padding: 25px;">
                    <h3 style="color: var(--texto); font-size: 1.8rem; border-bottom:none; padding-bottom:0;">${carrera.nombre}</h3>
                    <p style="color: var(--acento); font-family: 'Chakra Petch'; font-size: 1.1rem; margin-top: -10px;">
                        <i class="fa-regular fa-calendar"></i> ${txtFecha} ${txtHora !== '00:00' ? `(${txtHora} hs local)` : ''} &nbsp;|&nbsp; <i class="fa-solid fa-flag-checkered"></i> ${carrera.pista}
                    </p>
                    <div class="countdown-timer" data-timestamp="${fechaMilisegundos}">Sincronizando telemetría temporal...</div>
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

        if (eventosMostrados === 0) {
            contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-secundario);'>No hay eventos programados en el calendario.</p>";
        } else { window.iniciarContadores(); }
    } catch (error) {
        console.error("Error al cargar carreras:", error);
    }
}

export async function cambiarInscripcion(idCarrera, meInscribo) {
    try {
        const refCarrera = doc(db, "carreras", idCarrera);
        const docSnap = await getDoc(refCarrera);
        if (!docSnap.exists()) return;
        
        let inscritos = docSnap.data().inscritos || [];
        
        if (meInscribo) {
            // Solución: Obtenemos los datos más recientes del piloto ANTES de inscribirlo.
            // Esto evita que se use una categoría "vieja" si un admin la cambió después de que el piloto inició sesión.
            const userDocRef = doc(db, "pilotos", state.usuarioActual.uid);
            const userDocSnap = await getDoc(userDocRef);
            const freshCategory = userDocSnap.exists() ? userDocSnap.data().categoria : "Reserva";

            // Actualizamos el estado local para que la UI sea consistente de inmediato
            state.usuarioActual.categoria = freshCategory || "";

            const pilotoParaInscribir = { 
                uid: state.usuarioActual.uid, 
                nombre: state.usuarioActual.nombre, 
                categoria: freshCategory || "Reserva" 
            };

            if (!inscritos.some(p => p.uid === state.usuarioActual.uid)) inscritos.push(pilotoParaInscribir);
        } else {
            inscritos = inscritos.filter(p => p.uid !== state.usuarioActual.uid);
        }
        
        await updateDoc(refCarrera, { inscritos });
        cargarCarreras(); 
    } catch (error) { console.error("Error al actualizar inscripción:", error); }
}

export async function eliminarCarrera(idCarrera) {
    if(confirm("¿Estás seguro de que quieres cancelar y borrar este evento?")) {
        try { await deleteDoc(doc(db, "carreras", idCarrera)); cargarCarreras();
        } catch(error) { console.error("Error eliminando la carrera:", error); }
    }
}

window.iniciarContadores = function() {
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    
    const actualizar = () => { 
        const contadores = document.querySelectorAll('.countdown-timer'); 
        const ahora = Date.now(); 
        
        contadores.forEach(el => { 
            const fechaEvento = parseInt(el.getAttribute('data-timestamp'), 10); 
            const diff = fechaEvento - ahora; 
            
            if (diff > 0) { 
                const dias = Math.floor(diff / (1000 * 60 * 60 * 24)); 
                const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); 
                const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); 
                const segundos = Math.floor((diff % (1000 * 60)) / 1000); 
                el.innerHTML = `<i class="fa-solid fa-stopwatch"></i> T-MINUS: ${dias}d ${horas}h ${minutos}m ${segundos}s`; 
                el.style.color = "var(--acento)"; 
            } else { 
                el.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> Evento en curso o finalizado`; 
                el.style.color = "var(--secundario)"; 
            } 
        }); 
    };
    actualizar(); 
    window.countdownInterval = setInterval(actualizar, 1000);
};

window.crearCarrera = crearCarrera; window.cargarCarreras = cargarCarreras; window.cambiarInscripcion = cambiarInscripcion; window.eliminarCarrera = eliminarCarrera;