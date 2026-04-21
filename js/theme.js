(function () {
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        // Dark is default.
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
        updateIcons();
    }

    function updateIcons() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const isLight = document.documentElement.classList.contains('light-mode');
        const iconSun = btn.querySelector('.icon-sun');
        const iconMoon = btn.querySelector('.icon-moon');
        if (iconSun && iconMoon) {
            iconSun.style.display = isLight ? 'none' : 'inline';
            iconMoon.style.display = isLight ? 'inline' : 'none';
        }
    }

    function setupToggle() {
        updateIcons();
        const btn = document.getElementById('theme-toggle');
        if (btn && !btn.dataset.listener) {
            btn.addEventListener('click', window.toggleTheme);
            btn.dataset.listener = 'true';
        }
    }

    // Apply immediately on load
    applyTheme();

    // Expose toggle globally
    window.toggleTheme = function () {
        document.documentElement.classList.toggle('light-mode');
        const isLight = document.documentElement.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateIcons();
    };

    // Re-apply icons and listeners when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupToggle);
    } else {
        setupToggle();
    }
})();
