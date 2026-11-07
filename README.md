# Capsule Gym Frontend

Benutzeroberfläche des TrainingsPlanAssistant: Trainingspläne anlegen, Übungen aus dem Katalog hinzufügen, Sätze erfassen und die trainierten Muskelgruppen auswerten.

Live: <https://trainingsplan-frontend-be8f5157e428.herokuapp.com>

| Pfad | Inhalt | Technik |
|---|---|---|
| `/login` | Anmelden | MPA (`public/`) |
| `/register` | Konto erstellen | MPA (`public/`) |
| `/app/` | Trainingsbereich, Anmeldung erforderlich | Angular-SPA (`angular/`) |

## Funktionen

- Pläne anlegen, umbenennen und löschen
- Übungen suchen, filtern und per Drag & Drop in Pläne ziehen oder dort umsortieren
- Notiz, Gewicht, Wiederholungen und einzelne Sätze pro Übung speichern
- Alternativen anzeigen, wenn ein Gerät belegt ist, und die Übung ersetzen
- Muskel-Heatmap pro Plan
- Datenexport und Kontolöschung

## Architektur

```
Browser ──▶ server.mjs ──┬── /login, /register ──▶ public/
                         ├── /app/*            ──▶ Angular-Build
                         ├── /api/v1/*         ──▶ Spring-Backend
                         └── /graphql          ──▶ GraphQL-Gateway
```

Der Browser spricht nur mit der Frontend-Origin. `server.mjs` liefert die Seiten aus und leitet API-Aufrufe weiter.

Nach dem Login setzt `server.mjs` das Cookie `capsule_session` (`HttpOnly`, `SameSite=Lax`). JavaScript sieht den Token nicht, und er liegt nicht im Browser-Storage. Der Proxy wandelt das Cookie bei jeder Weiterleitung in den Header `Authorization: Bearer <token>` um. Logout macht den Token im Backend ungültig und löscht das Cookie.

## Voraussetzungen

- Node.js 24
- Laufendes [Backend](../BackEnd) und [GraphQL-Gateway](../GRAPHQL), oder die Heroku-Instanzen (Standard, wenn keine Variablen gesetzt sind)

## Lokal starten

```bash
npm install
npm run build
BACKEND_BASE_URL=http://localhost:8080 GRAPHQL_BASE_URL=http://localhost:4000 npm start
```

PowerShell:

```powershell
$env:BACKEND_BASE_URL = "http://localhost:8080"
$env:GRAPHQL_BASE_URL = "http://localhost:4000"
npm start
```

Danach ist die App unter <http://localhost:5000/login> erreichbar.

Für reine Oberflächenarbeit gibt es `cd angular && npm start`. Login und Cookie funktionieren vollständig aber nur über `server.mjs`.

## Konfiguration

| Variable | Bedeutung | Standard |
|---|---|---|
| `PORT` | Port des Servers (Heroku setzt ihn selbst) | `5000` |
| `BACKEND_BASE_URL` | Origin des Backends, ohne `/api/v1` | Heroku-Backend |
| `GRAPHQL_BASE_URL` | Origin des Gateways, ohne `/graphql` | Heroku-Gateway |

## Projektstruktur

```
server.mjs              Webserver und Proxy
public/                 MPA: Login und Registrierung
angular/src/app/
  core/                 Globale Infrastruktur und Services
    auth.guard.ts       Route Guard
    auth.interceptor.ts Cookie-/Session-Weitergabe
    auth.service.ts     Sitzung und Benutzerkonto
    graphql.service.ts  GraphQL-Aufrufe
    plan.service.ts     Pläne und Übungen
    config.ts           API-Pfade
  features/             Fachlich zusammengehörige SPA-Komponenten
    auth/               Authentifizierungsbezogene UI-Dateien
    dashboard/          Pläne, Übungen und Dialoge
    body-heatmap/       Körperfigur mit Muskel-Heatmap
```

Die Angular-Dateien sind nach fachlicher Verantwortung organisiert: globale
Infrastruktur liegt unter `core/`, während UI-Funktionen unter `features/`
gebündelt sind. Die MPA-Dateien unter `public/` bleiben davon getrennt.

## Deployment (Heroku)

Das `Procfile` startet `npm start`. Beim Deploy baut `heroku-postbuild` die Angular-App. Der Angular-Build nutzt `/app/` als Base-Href.
