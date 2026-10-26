const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Zentrale Adressen. Nur hier ändern.
// GraphQL-Gateway (Repo GRAPHQL). Lokal läuft es mit "npm run dev" auf Port 4000.
export const GRAPHQL_URL = isLocal
  ? 'http://localhost:4000/graphql'
  : 'https://trainingsplan-graphql-542db877a167.herokuapp.com/graphql';

// REST-Backend (Repo BackEnd)
export const API_URL = 'https://trainingsplan-backend-6a384026392a.herokuapp.com/api/v1';
