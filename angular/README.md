# Capsule Gym Angular SPA

## Starten

```powershell
npm install
npm start
```

Die Anwendung ist anschließend unter `http://localhost:4200` erreichbar. Das Backend wird für Registrierung
und Login unter
`https://trainingsplan-backend-6a384026392a.herokuapp.com/api/v1` angesprochen.
Planverwaltung und Übungssuche laufen über das GraphQL-Gateway.
Der lokale Fallback-Admin funktioniert auch ohne Backend mit `admin` / `admin123`.

Für die Abgabe wird die Anwendung aus diesem Verzeichnis gebaut und bereitgestellt:

```powershell
npm run build
```

## Struktur

- `src/main.ts`: Angular-Bootstrap mit Router und `HttpClient`
- `src/app/app.routes.ts`: SPA-Routen und Auth-Guard
- `src/app/auth/`: Login- und Registrierungs-Komponente
- `src/app/dashboard/`: geschützter SPA-Bereich und Planverwaltung
- `src/app/core/`: querschnittliche Infrastruktur wie der Auth-Guard
- `src/app/auth.service.ts`: Authentifizierung, Session und Profil
- `src/app/plan.service.ts` und `src/app/graphql.service.ts`: GraphQL-Kommunikation für Pläne und Übungen
- `src/assets/fonts/`: Schriftart der SPA und zugehörige Attribution
- `src/app/auth.interceptor.ts`: Bearer-Token für geschützte API-Aufrufe
