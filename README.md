# Capsule Gym Frontend

Frontend des TrainingsPlanAssistant zum Verwalten von Trainingsplänen und Übungen.

Live: <https://trainingsplan-frontend-be8f5157e428.herokuapp.com>

## Bereiche

| Pfad | Inhalt |
|---|---|
| `/login` | Anmeldung |
| `/register` | Registrierung |
| `/app/` | Geschützter Trainingsbereich |

## Funktionen

- Trainingspläne erstellen, umbenennen und löschen
- Übungen suchen, filtern, hinzufügen und sortieren
- Trainingsdaten pro Übung erfassen und bearbeiten
- Muskel-Heatmap und Planstatistiken
- Datenexport und Kontolöschung

## Aufbau

`server.mjs` liefert Login und Registrierung aus, stellt die Angular-App unter `/app/` bereit und leitet API-Aufrufe an Backend und GraphQL-Gateway weiter.

Die Sitzung wird als `HttpOnly`-Cookie gespeichert. Der Server verwendet das Cookie-Token für authentifizierte API-Aufrufe.

## Deployment

Heroku startet den Server über `Procfile` und erstellt die Angular-App über `heroku-postbuild`.
