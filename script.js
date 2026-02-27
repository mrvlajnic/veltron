const canvas = document.getElementById('gradient-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let mouse = { x: undefined, y: undefined };

// Slušamo pomeranje miša
window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

function init() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function animate() {
    // Crna pozadina sa blagim tragom (za efekat "razmazivanja")
    ctx.fillStyle = 'rgba(5, 5, 5, 0.15)'; 
    ctx.fillRect(0, 0, width, height);

    if (mouse.x !== undefined) {
        // Kreiramo radijalni gradijent na poziciji miša
        let gradient = ctx.createRadialGradient(
            mouse.x, mouse.y, 0, 
            mouse.x, mouse.y, width * 0.4
        );

        // Boja "magle" - tamno siva koja prelazi u prozirnu
        gradient.addColorStop(0, 'rgba(60, 60, 60, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', init);
init();
animate();