let currentDataHash = "";
let intervalId = null;

export function iniciarTelemetria() {
    const statusSpan = document.getElementById('telemetria-status');
    const tbody = document.getElementById('telemetria-body');

    if (!tbody || !statusSpan) return;

    const proxyUrl = "https://alr-telemetria.jaminecraft844.workers.dev/";
    
    statusSpan.innerHTML = '<i class="fa-solid fa-satellite-dish fa-spin"></i> Solicitando datos...';
    statusSpan.style.color = '#f1c40f';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--texto-secundario);"><i class="fa-solid fa-satellite-dish fa-spin"></i> Conectando con el servidor de telemetría...</td></tr>`;

    let intentosFallidos = 0;
    let isFetching = false;

    async function obtenerDatos() {
        if (isFetching) return;
        isFetching = true; // Bloqueamos para evitar peticiones superpuestas

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Error HTTP " + response.status);
            
            const data = await response.json();
            intentosFallidos = 0;
            
            let pilotos = data.Cars || data.ConnectedDrivers || data.Clients || (data.Payload && data.Payload.Cars) || [];
            if (!Array.isArray(pilotos) && typeof pilotos === 'object') pilotos = Object.values(pilotos);
            
            // Optimización: Solo renderizar si los datos han cambiado (ahorra redibujado de DOM)
            const newDataHash = JSON.stringify(pilotos);
            if (newDataHash !== currentDataHash) {
                renderizarTabla(pilotos, tbody);
                currentDataHash = newDataHash;
            }
            
            statusSpan.innerHTML = '<i class="fa-solid fa-satellite-dish blink-green"></i> ONLINE';
            statusSpan.style.color = '#4ade80';

        } catch (error) {
            console.error("❌ ERROR AL LEER LOS DATOS DE TELEMETRÍA:", error);
            intentosFallidos++;
            statusSpan.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Conexión inestable (Fallo ${intentosFallidos})`;
            statusSpan.style.color = '#d9534f';

            if (intentosFallidos >= 3) {
                if (intervalId) clearInterval(intervalId); // Detenemos la búsqueda continua
                statusSpan.innerHTML = `<i class="fa-solid fa-power-off"></i> APAGADO`;
                statusSpan.style.color = '#d9534f';
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #d9534f; padding: 30px;">
                            <i class="fa-solid fa-server" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                            El servidor de telemetría está apagado.
                        </td>
                    </tr>`;
            }
        } finally {
            isFetching = false; // Liberamos el bloqueo
        }
    }

    obtenerDatos();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(obtenerDatos, 3000); // 3.0s de margen
}

function formatearTiempo(ms) {
    if (!ms || ms <= 0) return "---";
    let minutos = Math.floor(ms / 60000);
    let segundos = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    let milisegundos = (ms % 1000).toString().padStart(3, '0');
    return `${minutos}:${segundos}.${milisegundos}`;
}

function renderizarTabla(pilotos, tbody) {
    if (!pilotos || pilotos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--texto-secundario); padding: 20px;">Sesión inactiva o sin pilotos en pista</td></tr>`;
        return;
    }

    pilotos.sort((a, b) => (a.Position !== undefined ? a.Position : 999) - (b.Position !== undefined ? b.Position : 999));

    let html = pilotos.map((p, index) => {
        let nombre = p.Name || p.DriverName || (p.Driver && p.Driver.Name) || p.DriverGuid || "";
        if (typeof nombre === 'object') nombre = "Desconocido"; 
        if (!nombre || nombre.trim() === "") return "";

        const pos = p.Position !== undefined ? p.Position : index + 1;
        const coche = p.CarModel || p.CarName || p.Car || "N/A";
        const isPits = p.IsPits !== undefined ? p.IsPits : (p.IsInPit || false);
        let gapStr = p.Gap ? p.Gap : (isPits ? "En Boxes" : "En Pista");

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <td style="text-align: center; font-weight: bold; font-size: 1.2rem; color: ${pos === 1 ? 'var(--secundario)' : 'var(--texto)'};">${pos}</td>
                <td style="font-weight: 600; letter-spacing: 0.5px;">${nombre}</td>
                <td><span class="nav-tag" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); font-size: 0.8rem;">${coche}</span></td>
                <td style="text-align: center; color: var(--secundario); font-size: 1.1rem;">${formatearTiempo(p.BestLap || p.BestLapTime || 0)}</td>
                <td style="text-align: center; color: var(--texto-secundario);">${formatearTiempo(p.LastLap || p.LastLapTime || 0)}</td>
                <td style="text-align: center; color: ${gapStr === 'En Boxes' ? '#f39c12' : '#bdc3c7'}; font-size: 0.9rem;">${gapStr}</td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = html || `<tr><td colspan="6" style="text-align: center; color: var(--texto-secundario); padding: 20px;">Formato de pilotos no reconocido</td></tr>`;
}

document.addEventListener('DOMContentLoaded', iniciarTelemetria);
window.iniciarTelemetria = iniciarTelemetria;