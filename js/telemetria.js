export function iniciarTelemetria() {
    // Como ahora usamos un iframe nativo, ya no necesitamos procesar los datos manualmente.
    // Esta función se mantiene para recargar el iframe cuando el admin presiona "Recargar Panel".
    const iframe = document.getElementById('iframe-telemetria');
    if (iframe) {
        iframe.src = iframe.src;
        console.log("Iframe de telemetría recargado.");
    }
}

document.addEventListener('DOMContentLoaded', iniciarTelemetria);
window.iniciarTelemetria = iniciarTelemetria;