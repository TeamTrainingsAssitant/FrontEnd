const form = document.querySelector('form');
const message = document.querySelector('.message');
const mode = form.dataset.mode;

async function api(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Die Anfrage ist fehlgeschlagen.');
  return result;
}

if (new URLSearchParams(location.search).has('registered')) {
  message.textContent = 'Registrierung erfolgreich. Du kannst dich jetzt anmelden.';
}
const apiError = new URLSearchParams(location.search).get('error');
if (apiError) {
  message.textContent = ({ 'Password wrong.': 'E-Mail oder Passwort ist falsch.', 'Email already registered.': 'Diese E-Mail-Adresse ist bereits registriert.' })[apiError] || apiError;
}

if (mode === 'login') {
  api('/users/me').then(() => location.replace('/app/')).catch(() => {});
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  const values = Object.fromEntries(new FormData(form));
  try {
    if (mode === 'register') {
      if (values.password !== values.confirmation) throw new Error('Die Passwörter stimmen nicht überein.');
      await api('/users', { method: 'POST', body: JSON.stringify({ username: values.username, email: values.email, password: values.password }) });
      location.assign('/login?registered=1');
      return;
    }
    await api('/auth', { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
    location.assign('/app/');
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Die Anfrage ist fehlgeschlagen.';
    message.textContent = ({ 'Password wrong.': 'E-Mail oder Passwort ist falsch.', 'Email already registered.': 'Diese E-Mail-Adresse ist bereits registriert.' })[text] || text;
  }
});
