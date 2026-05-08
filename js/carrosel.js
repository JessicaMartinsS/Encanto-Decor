/* ============================================================
   CARROSSEL ESTILO CARDS 3D - JESS & STER (ARQUIVO INDEPENDENTE)
   ============================================================ */
window.slideIndex = 0;

window.updateCarousel = function() {
    const slides = document.getElementsByClassName("mySlides");
    if (!slides || slides.length === 0) return;

    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active", "prev-card", "next-card");
        slides[i].style.opacity = "0"; 
        slides[i].style.display = "block";
    }

    const current = window.slideIndex;
    const prev = (window.slideIndex === 0) ? slides.length - 1 : window.slideIndex - 1;
    const next = (window.slideIndex === slides.length - 1) ? 0 : window.slideIndex + 1;

    if (slides[current]) {
        slides[current].classList.add("active");
        slides[current].style.opacity = "1";
    }
    if (slides[prev]) {
        slides[prev].classList.add("prev-card");
        slides[prev].style.opacity = "0.6";
    }
    if (slides[next]) {
        slides[next].classList.add("next-card");
        slides[next].style.opacity = "0.6";
    }
};

window.plusSlides = function(n) {
    const slides = document.getElementsByClassName("mySlides");
    if (!slides || slides.length === 0) return;

    window.slideIndex += n;
    if (window.slideIndex >= slides.length) window.slideIndex = 0;
    if (window.slideIndex < 0) window.slideIndex = slides.length - 1;

    window.updateCarousel();
};

// Iniciar automaticamente
document.addEventListener('DOMContentLoaded', () => {
    const slides = document.getElementsByClassName("mySlides");
    if (slides.length > 0) {
        window.updateCarousel();
        setInterval(() => {
            window.plusSlides(1);
        }, 4000);
    }
});

