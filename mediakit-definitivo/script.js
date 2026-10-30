// Accesibilidad: si el visitante pide menos movimiento, se respeta en TODA la página.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===================================
// Smooth Scroll for Navigation Links
// ===================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });
        }
    });
});

// ===================================
// Scroll Animations (Fade In on Scroll)
// ===================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in class styles dynamically
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// Observe all sections and cards
// 🔒 El contenido NUNCA se oculta si no hay soporte de animación: se comprueba
// IntersectionObserver ANTES de poner opacity 0. Si fallara, el media kit se
// vería en blanco ante una marca, que es el peor fallo posible de esta página.
document.addEventListener('DOMContentLoaded', () => {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

    // Entrada escalonada: cada bloque entra 70 ms después de su hermano (máximo 5 de retraso),
    // con una curva de salida rápida. Al terminar se limpian los estilos en línea para que los
    // efectos al pasar el ratón de cada tarjeta vuelvan a funcionar.
    const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
    document.querySelectorAll(
        '.metric-bar-item, .card, .stat-card, .video-card, .why-card, .package-card, .also-card, .section-title'
    ).forEach(el => {
        const hermanos = [...el.parentElement.children].filter(c => c.className === el.className);
        const retraso = Math.min(hermanos.indexOf(el), 5) * 70;
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = `opacity 600ms ${EASE} ${retraso}ms, transform 600ms ${EASE} ${retraso}ms`;
        el.addEventListener('transitionend', function limpiar(e) {
            if (e.propertyName !== 'transform') return;
            el.classList.remove('fade-in');
            el.style.removeProperty('opacity');
            el.style.removeProperty('transform');
            el.style.removeProperty('transition');
            el.removeEventListener('transitionend', limpiar);
        });
        observer.observe(el);
    });
});

// ===================================
// Counter Animation for Stats
// ===================================
// El texto original MANDA. La animación solo interpola el número y respeta
// prefijo, sufijo y formato español (miles con punto). Nunca reescribe la cifra:
// una cifra de un media kit que se muestra distinta a como se escribió es un dato falso.
function animateCounter(element, original, target, duration = 1600) {
    const prefix = original.match(/^\D*/)[0];
    const suffix = original.match(/\D*$/)[0];
    const start = performance.now();

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        // Separador de miles siempre (toLocaleString no agrupa los números de 4 cifras en es-ES):
        // punto en castellano, coma en la versión inglesa (/en/, 30 oct 2026)
        const miles = document.documentElement.lang === 'en' ? ',' : '.';
        element.textContent = prefix + String(current).replace(/\B(?=(\d{3})+(?!\d))/g, miles) + suffix;
        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            element.textContent = original;
        }
    }
    requestAnimationFrame(frame);
}

// Animate counters when they come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            const original = entry.target.textContent.trim();
            // Solo cifras puras: se descartan valores con letras (K, M, %) para no corromperlos
            if (!/^[+~]?[\d.,]+$/.test(original)) return;
            const numericValue = parseInt(original.replace(/\D/g, ''), 10);
            if (!isNaN(numericValue) && numericValue > 0) {
                entry.target.dataset.animated = 'true';
                animateCounter(entry.target, original, numericValue);
            }
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    if (prefersReducedMotion) return;
    document.querySelectorAll('.stat-card-value, .metric-bar-value').forEach(stat => statsObserver.observe(stat));
});

// ===================================
// Parallax Effect for Hero Section (Subtle)
// ===================================
// El listener original escribía en el DOM en CADA evento de scroll: eso provoca
// tirones en móvil. Ahora se agrupa en requestAnimationFrame y el listener es pasivo.
if (!prefersReducedMotion) {
    const hero = document.querySelector('.hero');
    let ticking = false;

    if (hero) {
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                if (scrolled < window.innerHeight) {
                    hero.style.transform = `translateY(${scrolled * 0.3}px)`;
                    hero.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
                }
                ticking = false;
            });
        }, { passive: true });
    }
}

// ===================================
// Intros: cada clip se carga y se reproduce solo cuando está a la vista
// ===================================
// Sin sonido y en bucle. Fuera de la pantalla se pausa (ahorra batería y datos en móvil).
// Con movimiento reducido no arranca solo: se dejan los controles para que lo decida quien mira.
const intros = document.querySelectorAll('.intro-video');
if (intros.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        intros.forEach(v => v.setAttribute('controls', ''));
    } else {
        const introsObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const v = entry.target;
                if (entry.isIntersecting) {
                    v.preload = 'auto';
                    v.play().catch(() => v.setAttribute('controls', ''));
                } else {
                    v.pause();
                }
            });
        }, { threshold: 0.35 });
        intros.forEach(v => introsObserver.observe(v));
    }
}
