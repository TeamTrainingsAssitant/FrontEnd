# Capsule Gym Frontend

Das Frontend liefert eine kleine MPA für Anmeldung und Registrierung sowie die Angular-SPA für den Trainingsbereich. Beide laufen auf derselben Origin:

- `/login` – anmelden
- `/register` – Konto erstellen
- `/app/` – Angular-SPA (Anmeldung erforderlich)

## Architektur

`server.mjs` liefert die MPA und den Angular-Build aus. Außerdem leitet er `/api/v1/*` an das Spring-Backend und `/graphql` an das GraphQL-Gateway weiter. Der Browser kommuniziert dadurch nur mit der Frontend-Origin.

Das Backend setzt beim Login ein `HttpOnly`, `SameSite=Lax` Cookie namens `capsule_session`. Der Token wird nicht im Browser-Storage abgelegt und nicht an JavaScript zurückgegeben. REST und GraphQL lesen die Session serverseitig aus dem Cookie. Logout widerruft den Token im Backend und löscht das Cookie.

## Lokal starten

In einem Terminal im Ordner `FrontEnd`:

```powershell
$env:BACKEND_BASE_URL = "http://localhost:8080"
$env:GRAPHQL_BASE_URL = "http://localhost:4000"
npm run build
npm start
```

Frontend: `http://localhost:5000/login`. Backend und GraphQL-Gateway müssen separat laufen. Für die Angular-Entwicklung kann weiterhin `cd angular; npm start` genutzt werden; für den vollständigen MPA-/Cookiefluss den Frontend-Server verwenden.

## Heroku

Das Heroku-Frontend-Root bleibt `FrontEnd`; die Procfile startet `npm start`. Das Build-Skript erzeugt zunächst den Angular-Build und anschließend wird der Node-Server gestartet. Standardmäßig nutzt der Proxy die bestehenden Heroku-Adressen. Abweichende Ziele können mit `BACKEND_BASE_URL` und `GRAPHQL_BASE_URL` gesetzt werden. Die Backend-URL ist die Origin ohne `/api/v1`.

## Angular

Der Angular-Build nutzt `/app/` als Base-Href. Die API-Konfiguration zeigt auf gleich-origin `/api/v1` und `/graphql`; damit bleibt die HttpOnly-Session bei Browseranfragen verfügbar.
