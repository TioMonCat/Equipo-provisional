// Función para abrir/cerrar el menú lateral
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
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
