export function iniciarTelemetria() {
    // Como ahora usamos un iframe nativo, ya no necesitamos procesar los datos manualmente.
    // Esta función se mantiene para recargar el iframe cuando el admin presiona "Recargar Panel".
    const iframe = document.getElementById('iframe-telemetria');
    if (iframe) {
        const urlOriginal = iframe.src;
        iframe.src = 'about:blank';
        
        setTimeout(() => {
            iframe.src = urlOriginal;
            console.log("Iframe de telemetría recargado para ajustar el mapa.");
        }, 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const telemetriaTab = document.getElementById('telemetria-vivo');
    
    if (telemetriaTab) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && telemetriaTab.style.display === 'block') {
                    iniciarTelemetria();
                }
            });
        });
        observer.observe(telemetriaTab, { attributes: true });
    }
});

window.iniciarTelemetria = iniciarTelemetria;