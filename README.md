# Frontend

Das produktive SPA-Frontend befindet sich im Verzeichnis [`angular`](./angular).
Es verwendet Angular Standalone Components, Angular Reactive Forms, `HttpClient`
und einen Bearer-Token-Interceptor.

```powershell
cd FrontEnd\angular
npm install
npm start
```

Danach ist die SPA unter `http://localhost:4200` verfügbar. Das Backend wird
unter `https://trainingsplan-backend-6a384026392a.herokuapp.com/api/v1` erwartet.

Trainingspläne, Planübungen und die Übungssuche laufen über das GraphQL-Gateway
(Repo `GRAPHQL`, `PlanService` und `GraphqlService`). Login, Registrierung und Logout
bleiben REST. Die Gateway-Adresse steht in `angular/src/app/config.ts`; lokal wird
`http://localhost:4000/graphql` verwendet (Gateway mit `npm run dev` starten).

## Frontend

Die Angular-SPA unter [`angular`](./angular) ist die zentrale Single-Page-Anwendung
mit Login, Registrierung, Dashboard, Trainingsplänen und Planübungen.

Die Angular-SPA ist das Frontend des Projekts. Sie umfasst Login,
Registrierung, Dashboard, Trainingspläne und Planübungen. Die bisherigen
statischen HTML-Seiten und ihre MPA-Skripte sind entfernt.

Öffentliche Frontend-Adresse des bestehenden Deployments:

`https://trainingsplan-frontend-be8f5157e428.herokuapp.com/`

Für ein Angular-Deployment müssen die Angular-Routen auf `index.html`
zurückfallen. Der aktuelle Angular-Produktionsbuild entsteht mit
`npm run build` unter `angular/dist/capsule-gym-frontend`.

Für Heroku muss der Node.js-Buildpack aktiviert sein. Der Root-`Procfile`
baut das Angular-Projekt und startet anschließend den Produktionsserver.
