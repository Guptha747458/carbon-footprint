/**
 * EcoStride - Authentication Logic (Login & Signup)
 */
document.addEventListener('DOMContentLoaded', () => {

  // ─── Helper: show an inline error message below the form ───────────────────
  function showFormError(formEl, message) {
    let errorEl = formEl.querySelector('.auth-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'auth-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'assertive');
      formEl.insertBefore(errorEl, formEl.firstChild);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function clearFormError(formEl) {
    const errorEl = formEl.querySelector('.auth-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  // ─── Helper: set button loading state ──────────────────────────────────────
  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.innerHTML;
    btn.innerHTML = loading
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...'
      : btn.dataset.originalText;
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError(loginForm);

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      // Client-side validation
      if (!email || !password) {
        return showFormError(loginForm, 'Please fill in all fields.');
      }

      setLoading(submitBtn, true);
      try {
        const response = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('ecostride_token', data.token);
          window.location.href = 'index.html';
        } else {
          showFormError(loginForm, data.error || 'Login failed. Please try again.');
          setLoading(submitBtn, false);
        }
      } catch (err) {
        showFormError(loginForm, 'Unable to connect to the server. Please try again later.');
        setLoading(submitBtn, false);
      }
    });
  }

  // ─── SIGNUP ─────────────────────────────────────────────────────────────────
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError(signupForm);

      const name     = document.getElementById('signup-name').value.trim();
      const email    = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const submitBtn = signupForm.querySelector('button[type="submit"]');

      // Client-side validation
      if (!name || !email || !password) {
        return showFormError(signupForm, 'Please fill in all fields.');
      }
      if (password.length < 8) {
        return showFormError(signupForm, 'Password must be at least 8 characters.');
      }

      setLoading(submitBtn, true);
      try {
        const response = await apiFetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('ecostride_token', data.token);
          window.location.href = 'index.html';
        } else {
          showFormError(signupForm, data.error || 'Signup failed. Please try again.');
          setLoading(submitBtn, false);
        }
      } catch (err) {
        showFormError(signupForm, 'Unable to connect to the server. Please try again later.');
        setLoading(submitBtn, false);
      }
    });
  }
});
