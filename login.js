// Server API configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://your-backend-api.onrender.com'; // Replace with your deployed backend URL

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to app
    const user = sessionStorage.getItem('nexusnlp_user');
    if (user) {
        window.location.href = 'index.html';
        return;
    }

    // Theme Switcher Logic
    const themeToggle = document.getElementById('theme-toggle');
    
    function updateThemeIcons() {
        if (!themeToggle) return;
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        const isDark = document.documentElement.classList.contains('dark-theme');
        if (isDark) {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
    
    updateThemeIcons();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons();
        });
    }

    // Tab Switching
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.getAttribute('data-tab');
            if (target === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
            // Clear errors
            document.getElementById('login-error').style.display = 'none';
            document.getElementById('register-error').style.display = 'none';
            document.getElementById('register-success').style.display = 'none';
        });
    });

    // Password show/hide toggle
    document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        });
    });

    // Login Form Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        const btnText = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.loader');

        errorEl.style.display = 'none';
        btnText.style.display = 'none';
        loader.style.display = 'block';
        btn.disabled = true;

        fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            btn.disabled = false;

            if (!ok) {
                errorEl.textContent = data.error || 'Login failed';
                errorEl.style.display = 'block';
                return;
            }

            // Store user session and redirect
            sessionStorage.setItem('nexusnlp_user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        })
        .catch(err => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            btn.disabled = false;
            errorEl.textContent = 'Cannot connect to server. Make sure backend is running.';
            errorEl.style.display = 'block';
        });
    });

    // Register Form Submit
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fullName = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        const successEl = document.getElementById('register-success');
        const btn = document.getElementById('register-btn');
        const btnText = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.loader');

        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        btnText.style.display = 'none';
        loader.style.display = 'block';
        btn.disabled = true;

        fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            btn.disabled = false;

            if (!ok) {
                errorEl.textContent = data.error || 'Registration failed';
                errorEl.style.display = 'block';
                return;
            }

            // Show success, then auto-switch to login tab
            successEl.textContent = 'Account created! Switching to Sign In...';
            successEl.style.display = 'block';
            registerForm.reset();

            setTimeout(() => {
                authTabs[0].click(); // Switch to login tab
                successEl.style.display = 'none';
            }, 1500);
        })
        .catch(err => {
            btnText.style.display = 'block';
            loader.style.display = 'none';
            btn.disabled = false;
            errorEl.textContent = 'Cannot connect to server. Make sure backend is running.';
            errorEl.style.display = 'block';
        });
    });

    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    featureCards.forEach(card => observer.observe(card));
});
