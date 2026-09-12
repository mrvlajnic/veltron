/**
 * VELTRON AUTO — Core Scripts & Page Transitions
 */

// 1. Immediate restore of transition direction if navigating between pages
(function() {
    const savedDir = sessionStorage.getItem('veltron_nav_type');
    if (savedDir) {
        document.documentElement.dataset.navDir = savedDir;
    }
})();

// 2. Navigation page order for directional slideshow effect
const VELTRON_PAGE_ORDER = {
    'index.html': 0,
    '': 0,
    '/': 0,
    'vision.html': 1,
    'journal.html': 2,
    'construction.html': 3,
    'about.html': 4,
    'contact.html': 5
};

function getFilename(url) {
    try {
        const path = new URL(url, window.location.href).pathname;
        const file = path.split('/').pop().toLowerCase();
        return file || 'index.html';
    } catch (e) {
        return 'index.html';
    }
}

const currentFile = getFilename(window.location.pathname);
const currentIndex = VELTRON_PAGE_ORDER[currentFile] ?? 0;

// 3. Listen to clicks on navigation links (Top Navigation & Logo)
document.addEventListener('DOMContentLoaded', () => {
    // Top Navigation Links & Brand Logo
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetHref = link.getAttribute('href');
            if (!targetHref || targetHref.startsWith('#') || targetHref.startsWith('mailto:') || targetHref.startsWith('tel:')) {
                return;
            }

            const targetFile = getFilename(targetHref);
            const targetIndex = VELTRON_PAGE_ORDER[targetFile] ?? currentIndex;

            // Slideshow direction:
            // Moving rightward in nav order -> slide forward (incoming from right, outgoing to left)
            // Moving leftward in nav order -> slide backward (incoming from left, outgoing to right)
            let direction = targetIndex >= currentIndex ? 'slide-forward' : 'slide-backward';

            sessionStorage.setItem('veltron_nav_type', direction);
            document.documentElement.dataset.navDir = direction;
        });
    });

    // Mobile Hamburger Toggle
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('nav-links');
    if (hamburger && menu) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });

        // Close mobile menu when clicking any nav link
        const navItems = menu.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                menu.classList.remove('active');
                hamburger.classList.remove('toggle');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menu.classList.contains('active') && !menu.contains(e.target) && !hamburger.contains(e.target)) {
                menu.classList.remove('active');
                hamburger.classList.remove('toggle');
            }
        });
    }

    // Clean up transition dataset after arrival
    setTimeout(() => {
        sessionStorage.removeItem('veltron_nav_type');
        delete document.documentElement.dataset.navDir;
    }, 600);
});

// 4. Modern Cross-Document Lifecycle Hooks (Chrome 126+ / Edge 126+)
window.addEventListener('pageswap', (e) => {
    if (e.viewTransition) {
        const dir = sessionStorage.getItem('veltron_nav_type');
        if (dir) {
            e.viewTransition.types.add(dir);
        }
    }
});

window.addEventListener('pagereveal', (e) => {
    if (e.viewTransition) {
        const dir = sessionStorage.getItem('veltron_nav_type');
        if (dir) {
            e.viewTransition.types.add(dir);
            document.documentElement.dataset.navDir = dir;
            e.viewTransition.finished.finally(() => {
                sessionStorage.removeItem('veltron_nav_type');
                delete document.documentElement.dataset.navDir;
            });
        }
    }
});

// 5. Gradient Canvas (Used on construction.html)
const canvas = document.getElementById('gradient-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let mouse = { x: undefined, y: undefined };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function animateCanvas() {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.15)'; 
        ctx.fillRect(0, 0, width, height);

        if (mouse.x !== undefined) {
            let gradient = ctx.createRadialGradient(
                mouse.x, mouse.y, 0, 
                mouse.x, mouse.y, width * 0.4
            );

            gradient.addColorStop(0, 'rgba(60, 60, 60, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        requestAnimationFrame(animateCanvas);
    }

    window.addEventListener('resize', initCanvas);
    initCanvas();
    animateCanvas();
}
