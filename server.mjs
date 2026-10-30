import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = resolve(root, 'public');
const spaDir = resolve(root, 'angular/dist/capsule-gym-frontend/browser');
const backend = process.env.BACKEND_BASE_URL || 'https://trainingsplan-backend-6a384026392a.herokuapp.com';
const graphql = process.env.GRAPHQL_BASE_URL || 'https://trainingsplan-graphql-542db877a167.herokuapp.com';
const mime = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function tokenFromCookieHeader(header = '') {
  const entry = header.split(';').map((part) => part.trim()).find((part) => part.startsWith('capsule_session='));
  return entry?.slice('capsule_session='.length) || undefined;
}

function tokenFromSetCookies(cookies = []) {
  const cookie = cookies.find((item) => item.startsWith('capsule_session='));
  return cookie?.slice('capsule_session='.length).split(';', 1)[0];
}

function frontendSessionCookie(request, token, maxAge = 86400) {
  const forwardedHttps = request.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https';
  const secure = forwardedHttps || Boolean(request.socket.encrypted);
  return `capsule_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

async function sendFile(response, path) {
  try {
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Content-Length': body.length });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}

async function proxy(request, response, target) {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const url = new URL(request.url || '/', 'http://localhost');
    const isLogin = request.method === 'POST' && url.pathname === '/api/v1/auth';
    const isLogout = request.method === 'DELETE' && url.pathname === '/api/v1/auth';
    const token = tokenFromCookieHeader(request.headers.cookie);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('transfer-encoding');
    headers.delete('content-length');
    headers.delete('origin');
    headers.delete('cookie');
    if (token && !headers.has('authorization')) headers.set('Authorization', `Bearer ${token}`);
    let body = chunks.length ? Buffer.concat(chunks) : undefined;
    if (isLogout && !body && token) {
      body = Buffer.from(JSON.stringify({ token }));
      headers.set('Content-Type', 'application/json');
    }
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });
    const responseHeaders = Object.fromEntries(upstream.headers);
    const cookies = upstream.headers.getSetCookie();
    delete responseHeaders['set-cookie'];
    delete responseHeaders['content-length'];
    delete responseHeaders['content-encoding'];
    const responseBody = Buffer.from(await upstream.arrayBuffer());

    if (isLogin && upstream.ok) {
      let payload = {};
      try { payload = JSON.parse(responseBody.toString('utf8')); } catch { /* handled below */ }
      const sessionToken = payload.token || tokenFromSetCookies(cookies);
      if (!sessionToken) {
        response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        return response.end(JSON.stringify({ message: 'Backend hat kein Login-Token ausgegeben.' }));
      }
      responseHeaders['set-cookie'] = [frontendSessionCookie(request, sessionToken)];
      responseHeaders['content-type'] = 'application/json; charset=utf-8';
      response.writeHead(upstream.status, responseHeaders);
      return response.end(JSON.stringify({ ...payload, token: null }));
    }
    if (isLogout && upstream.ok) responseHeaders['set-cookie'] = [frontendSessionCookie(request, '', 0)];
    response.writeHead(upstream.status, responseHeaders);
    response.end(responseBody);
  } catch {
    response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Upstream service unavailable');
  }
}

async function handleAuthForm(request, response, mode) {
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const values = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    const payload = mode === 'login'
      ? { email: values.get('email'), password: values.get('password') }
      : { username: values.get('username'), email: values.get('email'), password: values.get('password') };
    if (mode === 'register' && values.get('password') !== values.get('confirmation')) {
      response.writeHead(303, { Location: '/register?error=' + encodeURIComponent('Die Passwörter stimmen nicht überein.') });
      return response.end();
    }

    const endpoint = mode === 'login' ? '/auth' : '/users';
    const upstream = await fetch(`${backend}/api/v1${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (upstream.ok) {
      const result = mode === 'login' ? await upstream.json().catch(() => ({})) : {};
      const backendCookies = upstream.headers.getSetCookie();
      const token = result.token || tokenFromSetCookies(backendCookies);
      if (mode === 'login' && !token) {
        response.writeHead(303, { Location: '/login?error=' + encodeURIComponent('Das Backend hat kein Login-Token ausgegeben.') });
        return response.end();
      }
      if (mode === 'login') {
        const sessionCheck = await fetch(`${backend}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
        if (!sessionCheck.ok) {
          response.writeHead(303, { Location: '/login?error=' + encodeURIComponent('Das Backend hat das Login-Token nicht akzeptiert.') });
          return response.end();
        }
      }
      const headers = { Location: mode === 'login' ? '/app/' : '/login?registered=1' };
      if (mode === 'login') headers['Set-Cookie'] = [frontendSessionCookie(request, token)];
      response.writeHead(303, headers);
      return response.end();
    }
    const result = await upstream.json().catch(() => ({}));
    const error = result.message || 'Die Anfrage ist fehlgeschlagen.';
    response.writeHead(303, { Location: `/${mode}?error=${encodeURIComponent(error)}` });
    response.end();
  } catch {
    response.writeHead(303, { Location: `/${mode}?error=${encodeURIComponent('Der Anmeldedienst ist gerade nicht erreichbar.')}` });
    response.end();
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (request.method === 'POST' && url.pathname === '/login') return handleAuthForm(request, response, 'login');
  if (request.method === 'POST' && url.pathname === '/register') return handleAuthForm(request, response, 'register');
  if (url.pathname.startsWith('/api/v1/')) return proxy(request, response, `${backend}${url.pathname}${url.search}`);
  if (url.pathname === '/graphql') return proxy(request, response, `${graphql}/graphql${url.search}`);
  if (url.pathname === '/') {
    response.writeHead(302, { Location: '/login' });
    return response.end();
  }
  if (url.pathname === '/app') {
    response.writeHead(302, { Location: '/app/' });
    return response.end();
  }
  if (url.pathname === '/login' || url.pathname === '/register') {
    return sendFile(response, resolve(publicDir, `${url.pathname.slice(1)}.html`));
  }
  if (url.pathname === '/auth.js' || url.pathname === '/auth.css') {
    return sendFile(response, resolve(publicDir, url.pathname.slice(1)));
  }
  if (url.pathname.startsWith('/app/')) {
    const relative = decodeURIComponent(url.pathname.slice('/app/'.length));
    const file = resolve(spaDir, relative || 'index.html');
    if (file !== spaDir && !file.startsWith(spaDir + sep)) {
      response.writeHead(400);
      return response.end('Bad request');
    }
    try {
      if ((await stat(file)).isFile()) return sendFile(response, file);
    } catch { /* Angular route: serve its entry document. */ }
    return sendFile(response, resolve(spaDir, 'index.html'));
  }
  response.writeHead(404);
  response.end('Not found');
}).listen(Number(process.env.PORT || 5000));
