export function comprobarNoticiasRecientes() {
    const banner = document.getElementById('banner-noticia-reciente');
    if (!banner) return;

    const fechaNoticiaAttr = banner.getAttribute('data-timestamp');
    if (!fechaNoticiaAttr) return;

    const fechaNoticia = new Date(fechaNoticiaAttr).getTime();
    const ahora = new Date().getTime();
    
    // Calcula la diferencia en horas
    const diferenciaHoras = (ahora - fechaNoticia) / (1000 * 60 * 60);

    // Si la noticia tiene menos de 24 horas de antigüedad, mostramos el banner
    if (diferenciaHoras >= 0 && diferenciaHoras <= 24) {
        banner.style.display = "block";
    }
}

comprobarNoticiasRecientes();