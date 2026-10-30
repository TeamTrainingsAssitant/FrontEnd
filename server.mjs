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
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('transfer-encoding');
    headers.delete('origin');
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      redirect: 'manual',
    });
    const responseHeaders = Object.fromEntries(upstream.headers);
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) responseHeaders['set-cookie'] = cookies;
    response.writeHead(upstream.status, responseHeaders);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Upstream service unavailable');
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
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
