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
// Mirrors the real nav order: Logo | Vision | Concepts | Process | [Journal] | About | AI Lab | Connect
const VELTRON_PAGE_ORDER = {
    'index.html': 0,
    '': 0,
    '/': 0,
    'vision.html': 1,
    'concepts.html': 2,
    'concept-v1-sportline.html': 2, // subpage of Concepts
    'construction.html': 3,
    'journal.html': 4, // legacy local page (nav now links to the subdomain)
    'about.html': 5,
    'ai-lab': 6, // directory route /ai-lab/ and /ai-lab/index.html
    'contact.html': 7,
    'pitch-deck.html': 0, // standalone pages
    'veltronv1.html': 0
};

function getFilename(url) {
    try {
        const path = new URL(url, window.location.href).pathname;
        const parts = path.split('/').filter(Boolean);
        const last = (parts[parts.length - 1] || '').toLowerCase();

        if (last.endsWith('.html') && last !== 'index.html') {
            return last;
        }
        if (last === 'index.html') {
            // /ai-lab/index.html -> 'ai-lab'; /index.html -> 'index.html'
            return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : 'index.html';
        }
        // Directory routes like /ai-lab/ ; root path -> index.html
        return last || 'index.html';
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

            // Only primary-button, unmodified clicks navigate in this tab
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
            }

            // Cross-origin targets (e.g. journal.veltroncars.com) never get a
            // cross-document view transition — don't stage a direction for them.
            let targetUrl;
            try {
                targetUrl = new URL(targetHref, window.location.href);
            } catch (err) {
                return;
            }
            if (targetUrl.origin !== window.location.origin) {
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
            const isOpen = menu.classList.toggle('active');
            hamburger.classList.toggle('toggle', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
        });

        // Close mobile menu when clicking any nav link
        const navItems = menu.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                menu.classList.remove('active');
                hamburger.classList.remove('toggle');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menu.classList.contains('active') && !menu.contains(e.target) && !hamburger.contains(e.target)) {
                menu.classList.remove('active');
                hamburger.classList.remove('toggle');
                hamburger.setAttribute('aria-expanded', 'false');
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
