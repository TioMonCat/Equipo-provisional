// Función para abrir/cerrar el menú lateral
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// Función para cambiar de sección (pestañas)
function showSection(id) {
    // 1. Ocultar todas las secciones
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(s => s.style.display = 'none');
    
    // 2. Mostrar solo la elegida
    document.getElementById(id).style.display = 'block';
    
    // 3. Cerrar el menú lateral automáticamente
    toggleMenu();

    // 4. Si volvemos a inicio, forzamos a Swiper a actualizarse para evitar errores visuales
    if(id === 'inicio') { 
        swiper.update(); 
    }
}

// Inicialización del Carrusel (Swiper)
const swiper = new Swiper(".mySwiper", {
    loop: true,
    autoplay: { delay: 5000 },
    pagination: { el: ".swiper-pagination", clickable: true },
    observer: true,
    observeParents: true
});
