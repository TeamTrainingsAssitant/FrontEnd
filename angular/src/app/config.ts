const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// Adresse des GraphQL-Gateways (Repo GRAPHQL). Lokal läuft es mit "npm run dev" auf Port 4000.
// TODO: Heroku-Adresse eintragen, sobald das Gateway deployt ist.
export const GRAPHQL_URL = isLocal
  ? 'http://localhost:4000/graphql'
  : 'https://GATEWAY-APP-NAME.herokuapp.com/graphql';
