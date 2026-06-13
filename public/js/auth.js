document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('form[action="index.html"]'); // We'll modify the action soon
  const signupForm = document.querySelector('form[action="login.html"]');

  if (loginForm && window.location.pathname.includes('login.html')) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('ecostride_token', data.token);
          window.location.href = 'index.html';
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (err) {
        alert('Server error. Please try again later.');
      }
    });
  }

  if (signupForm && window.location.pathname.includes('signup.html')) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('ecostride_token', data.token);
          window.location.href = 'index.html';
        } else {
          alert(data.error || 'Signup failed');
        }
      } catch (err) {
        alert('Server error. Please try again later.');
      }
    });
  }
});
