(function () {
    const canvas = document.createElement('canvas');
    canvas.classList.add('matrix-canvas');

    // Insert before bg-mesh if it exists, otherwise prepend
    document.addEventListener('DOMContentLoaded', () => {
        const bgMesh = document.querySelector('.bg-mesh');
        if (bgMesh) {
            bgMesh.before(canvas);
        } else {
            document.body.prepend(canvas);
        }
    });

    const ctx = canvas.getContext('2d');

    let width, height;
    let cols;
    let ypos;

    function init() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        cols = Math.floor(width / 20) + 1;
        ypos = Array(cols).fill(0);
    }

    init();
    window.addEventListener('resize', init);

    function matrix() {
        const isLightMode = document.documentElement.classList.contains('light-mode');

        // Trail effect
        if (isLightMode) {
            ctx.fillStyle = 'rgba(255, 244, 234, 0.15)'; // matches #fff4ea closely
        } else {
            ctx.fillStyle = 'rgba(13, 13, 26, 0.15)'; // matches #0d0d1a closely
        }
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = isLightMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)';
        ctx.font = '15pt monospace';

        ypos.forEach((y, ind) => {
            const text = Math.floor(Math.random() * 10).toString(); // Numbers 0-9
            const x = ind * 20;

            ctx.fillText(text, x, y);

            if (y > 100 + Math.random() * 10000) {
                ypos[ind] = 0;
            } else {
                ypos[ind] = y + 20;
            }
        });
    }

    setInterval(matrix, 50);
})();
