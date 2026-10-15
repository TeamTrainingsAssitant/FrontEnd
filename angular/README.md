# Capsule Gym Angular SPA

## Starten

```powershell
npm install
npm start
```

Die Anwendung ist anschließend unter `http://localhost:4200` erreichbar. Das Backend wird für Registrierung,
Login und Planverwaltung unter
`https://trainingsplan-backend-6a384026392a.herokuapp.com/api/v1` angesprochen.
Der lokale Fallback-Admin funktioniert auch ohne Backend mit `admin` / `admin123`.

Die bisherige statische Homepage ist nicht die Angular-SPA. Für die Abgabe sollte die Anwendung aus diesem
Verzeichnis gebaut und bereitgestellt werden:

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
- `src/app/plan.service.ts`: REST-Kommunikation mit `/plans` und Planübungen
- `src/app/auth.interceptor.ts`: Bearer-Token für geschützte API-Aufrufe
