// Función para abrir/cerrar el menú lateral
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const body = document.body;

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');

    // Si el sidebar está activo, bloqueamos el scroll del body para permitir el scroll solo dentro del menú.
    if (sidebar.classList.contains('active')) {
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = '';
    }
}

// Función para cambiar de sección de forma segura
function showSection(id) {
    // 1. Ocultar todas las secciones
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(s => s.style.display = 'none');
    
    // 2. Mostrar la sección destino
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
    }

    // 3. Cerrar el menú lateral SOLO si está abierto
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('active')) {
        toggleMenu();
    }

    // 4. Actualizar Swiper si volvemos a inicio
    if (id === 'inicio' && typeof swiper !== 'undefined') { 
        swiper.update(); 
    }
}

// Inicialización del Carrusel
const swiper = new Swiper(".mySwiper", {
    loop: true,
    autoplay: { delay: 5000 },
    pagination: { el: ".swiper-pagination", clickable: true },
    observer: true,
    observeParents: true
});

// Inicialización del Carrusel para "Última Carrera"
const swiperUltimaCarrera = new Swiper(".swiper-ultima-carrera", {
    grabCursor: true,
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    autoplay: { delay: 4000, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
});
