# Connected Calendar OAuth Configuration

Connected calendar uses **public OAuth client IDs** with PKCE. Do not bundle client secrets.

## Resolution order

At runtime the app resolves each provider client ID as:

1. Process environment variable (`GOOGLE_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_ID`)
2. Bundled file `assets/generated/calendar-oauth-clients.json` (created at build time)
3. Empty (connect buttons show a setup warning)

## Local development

```powershell
$env:GOOGLE_CALENDAR_CLIENT_ID="your-google-desktop-client-id"
$env:MICROSOFT_CALENDAR_CLIENT_ID="your-microsoft-public-client-id"
npm.cmd run dev
```

## Release / QA installer builds

Set the same variables on the **build machine** before `npm run release:build` so client IDs are embedded in the installer:

```powershell
$env:GOOGLE_CALENDAR_CLIENT_ID="..."
$env:MICROSOFT_CALENDAR_CLIENT_ID="..."
npm run release:build -- -Version 3.7.0 -SkipVersionBump -ReplaceExisting
```

`npm run build:main` runs `scripts/generate-calendar-oauth-clients.mjs`, which writes `assets/generated/calendar-oauth-clients.json` (gitignored). That file is packaged via `assets/**/*` in electron-builder.

See `assets/calendar-oauth-clients.example.json` for the JSON shape.

## Provider setup

### Google

1. Google Cloud project with **Google Calendar API** enabled.
2. OAuth consent screen (add test users while in testing).
3. OAuth client type: **Desktop app**.
4. Use the client ID as `GOOGLE_CALENDAR_CLIENT_ID`.

### Microsoft

1. App registration in Microsoft Entra (public/native client).
2. Delegated permissions for calendar read scopes used by the app (`Calendars.ReadBasic`, etc.).
3. Use the application (client) ID as `MICROSOFT_CALENDAR_CLIENT_ID`.

## Do not ship without configuration

If neither env nor bundled IDs are present, Connected Accounts shows a setup warning and connect actions are disabled. Do not publish a release build intended for calendar QA until that warning is gone in a normal installed build.
