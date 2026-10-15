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
unter `http://localhost:8080/api/v1` erwartet.

## Zwei Prüfungs-Touchpoints

Die Angular-SPA unter [`angular`](./angular) ist die zentrale Single-Page-Anwendung
mit Login, Registrierung, Dashboard, Trainingsplänen und Planübungen.

Zusätzlich bleibt unter [`Main`](./Main) ein eigenständiger MPA-Touchpoint
erhalten. Die Seiten laden bei Navigation vollständig neu und verwenden
`Funktions.js` für die Backend-Kommunikation:

- `LogIn.html` und `Register.html` bilden die Authentifizierungsseiten.
- `Homepage.html` bildet den MPA-Dashboard-Touchpoint.
- Trainingspläne und ExerciseDB-Übungen werden über das Backend geladen.
- Die MPA kann Pläne anlegen/löschen und Übungen suchen.

Lokal kann der MPA-Touchpoint mit einem statischen Server unter
`http://localhost:5500/Main/LogIn.html` gestartet werden. Die SPA läuft
parallel unter `http://localhost:4200/auth`.

Für ein Deployment können beide Touchpoints unter derselben Domain ausgeliefert
werden. Die Angular-Routen müssen dabei auf `index.html` zurückfallen.
