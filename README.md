# Capsule Gym – Angular-SPA

Die Angular-SPA ist das zentrale Frontend des Projekts. Sie umfasst Login,
Registrierung, Dashboard, Trainingspläne und die Übungsbibliothek. Die früheren
statischen MPA-Seiten sind entfernt.

## Lokal starten

```powershell
cd FrontEnd\angular
npm install
npm start
```

Die Anwendung läuft anschließend unter `http://localhost:4200`. Login,
Registrierung und Logout verwenden das REST-Backend. Planverwaltung und
Übungssuche laufen über das GraphQL-Gateway.

Für GraphQL muss das Gateway in einem zweiten Terminal aus der Projektwurzel
(`WebApp`) gestartet werden:

```powershell
cd GRAPHQL
npm install
npm run dev
```

Das Gateway erwartet standardmäßig ein lokales Backend unter
`http://localhost:8080/api/v1`. Seine Adresse kann über `BACKEND_BASE_URL`
konfiguriert werden. Die Gateway-Adresse der SPA steht in
`angular/src/app/config.ts`; lokal ist sie `http://localhost:4000/graphql`.

## Build und Deployment

```powershell
cd FrontEnd\angular
npm run build
```

Der Build liegt unter `angular/dist/capsule-gym-frontend/browser`. Für Heroku wird das
FrontEnd-Root-Verzeichnis mit dem Node.js-Buildpack gebaut und gestartet; die
Root-`Procfile` verwendet dafür die Skripte aus `FrontEnd/package.json`.

Öffentliche Frontend-Adresse des bestehenden Deployments:

`https://trainingsplan-frontend-be8f5157e428.herokuapp.com/`

## Struktur der SPA

- `angular/src/main.ts`: Angular-Bootstrap mit Router und `HttpClient`
- `angular/src/app/app.routes.ts`: Routen und Auth-Guard
- `angular/src/app/auth/`: Login und Registrierung
- `angular/src/app/dashboard/`: geschützter Bereich und Planverwaltung
- `angular/src/app/core/`: querschnittliche Funktionen wie der Auth-Guard
- `angular/src/app/auth.service.ts`: Authentifizierung, Session und Profil
- `angular/src/app/plan.service.ts` und `graphql.service.ts`: GraphQL-Zugriff auf Pläne und Übungen
- `angular/src/assets/fonts/`: Schriftart und Attribution
