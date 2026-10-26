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

## Zwei Prüfungs-Touchpoints

Die Angular-SPA unter [`angular`](./angular) ist die zentrale Single-Page-Anwendung
mit Login, Registrierung, Dashboard, Trainingsplänen und Planübungen.

Zusätzlich bleibt unter [`Main`](./Main) ein eigenständiger MPA-Touchpoint
erhalten. Die Seiten laden bei Navigation vollständig neu und verwenden
`Funktions.js` für Authentifizierung sowie `MpaExercises.js` für die
Übungsbibliothek:

- `LogIn.html` und `Register.html` bilden die Authentifizierungsseiten.
- `Homepage.html` bildet den MPA-Touchpoint für die Übungsbibliothek.
- `ExerciseDetails.html` ist eine zweite MPA-Seite für die Detailansicht.
- Beide Seiten laden Daten über `MpaExercises.js` asynchron aus dem Backend.
- Die Navigation zwischen Bibliothek und Detailansicht lädt jeweils ein neues HTML-Dokument.

Lokal kann der MPA-Touchpoint mit einem statischen Server unter
`http://localhost:5500/Main/LogIn.html` gestartet werden. Die SPA läuft
parallel unter `http://localhost:4200/auth`.

Öffentliche Frontend-Adresse des bestehenden Deployments:

`https://trainingsplan-frontend-be8f5157e428.herokuapp.com/`

Für ein Angular-Deployment müssen die Angular-Routen auf `index.html`
zurückfallen. Der aktuelle Angular-Produktionsbuild entsteht mit
`npm run build` unter `angular/dist/capsule-gym-frontend`.

Für Heroku muss der Node.js-Buildpack aktiviert sein. Der Root-`Procfile`
baut das Angular-Projekt und startet anschließend den Produktionsserver.
Der MPA-Touchpoint bleibt als separater Prüfungs-Touchpoint unter `Main`
erhalten.
